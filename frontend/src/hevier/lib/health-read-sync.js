// [hevier] Reading heart rate and weigh-ins back from Health Connect (hevier/DECISIONS.md D27): the
// read half of upstream's v1.4.3 lib/health-sync.js (commit f9c03474), ported for the fork's own
// native plugin (HevierHealthReadPlugin.java), until the fork merges v1.4.3 and this file goes.
// Each read has its own switch and permission, off by default, and runs only while the app is
// open: the heart rate of workouts finished in the last day, the weigh-ins since the last read (30
// days the first time). What goes into the log is decided by hevier/lib/health-read.js (upstream's,
// ported), so the log holds exactly what v1.4.3 would have written.
//
// The switches live in a file of their own on the phone (`hevier-health-read.json`, the fields
// upstream keeps in opengym-health.json), not in S: like upstream's Health Connect switch, they
// are a fact about this phone and never switch on anywhere else. A second file keeps upstream's
// own health file out of reach: its writes would otherwise race these. After the v1.4.3 merge the
// two switches are turned on again once, in upstream's own rows.
import { MOBILE, isAndroid, readJsonFile, writeJsonFile } from '../../lib/mobile.js'
import { mergeHeartRate, mergeWeighIns, lacksHeartRate } from './health-read.js'

export const READ_FILE = 'hevier-health-read.json'
const OFF = { readHr: false, readWeight: false, wCursor: 0, seen: {}, hrTried: {}, readError: null }

// Upstream's timings (v1.4.3 lib/health-sync.js).
export const HR_WINDOW_MS = 24 * 3600e3
const READ_EVERY_MS = 10 * 60e3
const RESUME_EVERY_MS = 2 * 60e3
export const WEIGHT_FIRST_MS = 30 * 24 * 3600e3
const WEIGHT_MARGIN_MS = 2 * 24 * 3600e3
const SEEN_KEEP_MS = 60 * 24 * 3600e3
// Android only: the fork's plugin is Health Connect's ('hc'); the iPhone build reads nothing.
const SRC = 'hc'

// Wrapped in an object: a Capacitor plugin proxy answers `then` (as in lib/health-sync.js).
let pluginP = null
async function plugin() {
  if (!MOBILE || !(await isAndroid())) return null
  if (!pluginP) pluginP = import('@capacitor/core').then(({ registerPlugin }) => ({ HR: registerPlugin('HevierHealthRead') }))
  return pluginP
}

let cached = null
export async function loadRead() {
  if (cached) return cached
  const f = await readJsonFile(READ_FILE)
  const map = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})
  cached = f && typeof f === 'object' ? { ...OFF, ...f, seen: map(f.seen), hrTried: map(f.hrTried) } : { ...OFF }
  return cached
}
const saveRead = h => { cached = h; return writeJsonFile(READ_FILE, h) }

const listeners = new Set()
export function onReadChange(cb) { listeners.add(cb); return () => listeners.delete(cb) }
const told = h => { for (const cb of listeners) cb(h) }

/** { status: 'available' | 'update' | 'missing' | 'unsupported', read: { heartRate, weight } } */
export async function readStatus() {
  const p = await plugin()
  if (!p) return { status: 'unsupported', read: { heartRate: false, weight: false } }
  return p.HR.status().catch(() => ({ status: 'unsupported', read: { heartRate: false, weight: false } }))
}

// The store's update, given at launch (initHealthRead): a read result goes into the log the way
// any other change does, so it is saved, stamped and synced.
let applyRef = null
let readRunning = null
let lastWeightRead = 0

/**
 * Turns one of the two reads on (`kind`: 'hr' | 'weight'): asks for that read permission only,
 * then reads once. Resolves with { ok, reason, health }; reason 'denied' when it was not granted.
 */
export async function enableRead(kind, getState, { apply = null } = {}) {
  const p = await plugin()
  if (!p) return { ok: false, reason: 'unsupported' }
  const st = await p.HR.status().catch(() => ({ status: 'unsupported' }))
  if (st.status !== 'available') return { ok: false, reason: st.status }
  const perm = kind === 'hr' ? 'heartRate' : 'weight'
  const res = await p.HR.requestRead({ read: [perm] }).catch(() => null)
  if (!res?.read?.[perm]) return { ok: false, reason: 'denied' }
  const h = await loadRead()
  const out = { ...h, [kind === 'hr' ? 'readHr' : 'readWeight']: true, readError: null }
  await saveRead(out)
  told(out)
  if (getState) await readHealth(getState, { force: true, apply }).catch(() => {})
  return { ok: true, reason: null, health: cached }
}

/** Turns a read off. What it already brought in stays in the log, as the user's data. */
export async function disableRead(kind) {
  if (readRunning) await readRunning.catch(() => {})
  const h = await loadRead()
  const out = kind === 'hr' ? { ...h, readHr: false, hrTried: {} } : { ...h, readWeight: false }
  if (!out.readHr && !out.readWeight) out.readError = null
  await saveRead(out)
  told(out)
  return out
}

/**
 * One read pass: the heart rate of every workout finished in the last day that still lacks some,
 * and the weigh-ins since the last read. A no-op while both switches are off; never runs twice at
 * once; reads the same thing at most every ten minutes (two after coming back to the foreground,
 * `force`). The log changes only when something new came in.
 */
export function readHealth(getState, { force = false, now = Date.now(), apply = null } = {}) {
  if (!MOBILE || !cached || !(cached.readHr || cached.readWeight)) return Promise.resolve(cached)
  if (readRunning) return readRunning
  readRunning = readOnce(getState, force, now, apply || applyRef).finally(() => { readRunning = null })
  return readRunning
}

async function readOnce(getState, force, now, applyFn) {
  const p = await plugin()
  if (!p) return cached
  const src = SRC
  const every = force ? RESUME_EVERY_MS : READ_EVERY_MS
  let h = { ...(await loadRead()) }
  const was = JSON.stringify(h)
  let error = null
  // `decide` runs on a copy first: an update that changes nothing would still stamp and push.
  const apply = (decide, fn = decide) => {
    const probe = JSON.parse(JSON.stringify(getState() || {}))
    if (!decide(probe)) return false
    if (applyFn) applyFn(s => { fn(s) })
    return true
  }
  const fail = e => { error = e?.code === 'permission' ? 'permission' : e?.code === 'unavailable' ? 'unavailable' : 'failed' }

  if (h.readHr) {
    const S = getState()
    const tried = {}
    for (const [wid, at] of Object.entries(h.hrTried || {})) if (now - Number(at) < HR_WINDOW_MS * 2) tried[wid] = at
    for (const w of S?.workouts || []) {
      const end = Number(w?.end), start = Number(w?.start)
      if (!w?.id || !(start > 0) || !(end > start) || now - end > HR_WINDOW_MS || end > now) continue
      if (!lacksHeartRate(w) && w.hr?.src !== src) continue
      if (tried[w.id] && now - Number(tried[w.id]) < every) continue
      try {
        const res = await p.HR.readHeartRate({ from: start, to: end + 5 * 60e3 })
        tried[w.id] = now
        const samples = Array.isArray(res?.samples) ? res.samples : []
        if (samples.length) apply(s => mergeHeartRate(s, w.id, samples, src, now))
      } catch (e) { fail(e); break }
    }
    h.hrTried = tried
  }

  if (h.readWeight && (force ? now - lastWeightRead >= RESUME_EVERY_MS : now - lastWeightRead >= READ_EVERY_MS)) {
    const since = h.wCursor > 0 ? Math.max(h.wCursor - WEIGHT_MARGIN_MS, now - WEIGHT_FIRST_MS) : now - WEIGHT_FIRST_MS
    try {
      const res = await p.HR.readWeights({ since })
      lastWeightRead = now
      const records = Array.isArray(res?.records) ? res.records : []
      // The memo is filled in on the copy that decides; the store's update replays the same merge.
      const seen = { ...(h.seen || {}) }
      const before = { ...seen }
      if (records.length) apply(probe => mergeWeighIns(probe, records, { src, seen }).length > 0,
        s => { mergeWeighIns(s, records, { src, seen: { ...before } }) })
      for (const [d, v] of Object.entries(seen)) if (now - Number(v?.t) > SEEN_KEEP_MS) delete seen[d]
      h.seen = seen
      const newest = records.reduce((m, r) => Math.max(m, Number(r?.t) || 0), 0)
      if (newest > h.wCursor) h.wCursor = newest
    } catch (e) { fail(e) }
  }

  h.readError = error
  // A pass that changed nothing writes nothing (battery, item 29).
  if (JSON.stringify(h) === was) return cached
  await saveRead(h)
  told(h)
  return h
}

/**
 * At launch (hevier/index.js): reads once after start-up, on every return to the foreground, and
 * after the log is saved (a workout just finished), as upstream's v1.4.3 does from useStore.
 */
let started = false
export function initHealthRead(store) {
  if (!MOBILE || started) return
  const { get: getState, update: apply } = store
  // Wakes when the log changes (a workout saved), not for every set typed.
  const subscribe = store.watch(['workouts'])
  started = true
  applyRef = apply
  import('@capacitor/app').then(({ App }) => {
    App.addListener('appStateChange', ({ isActive }) => { if (isActive) readHealth(getState, { force: true }).catch(() => {}) })
  }).catch(() => {})
  setTimeout(() => loadRead().then(() => readHealth(getState, { force: true })).catch(() => {}), 3000)
  let saveTm = null
  subscribe?.(() => {
    clearTimeout(saveTm)
    saveTm = setTimeout(() => readHealth(getState).catch(() => {}), 1500)
  })
}
