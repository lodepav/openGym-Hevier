// The export to Hevy (hevier/DECISIONS.md D34): with the switch on and a key kept, every workout
// saved since and every routine changed since goes to Hevy, while the app is open (at launch, on
// coming back, a little after each change). What goes is decided by hevy-export.js; this file
// calls the API and keeps, on the phone (`hevier-hevy-export.json`, never in S), what was sent as
// which Hevy id, with each one's fingerprint, and the templates and folders it found or made.
import { MOBILE, readJsonFile, writeJsonFile } from '../../lib/mobile.js'
import { HEVY_API, HevyApiError, fetchHevyPages } from '../../lib/import-hevy.js'
import { allExercises } from '../../lib/exercises.js'
import { baseline, pending, finish, exercisesOf, brandsOf, brandKey, setsOf, templateFinder, newTemplate } from './hevy-export.js'
import { getSecret, putSecret, removeSecret } from './secret.js'
import { within } from './within.js'

export const EXPORT_FILE = 'hevier-hevy-export.json'
export const KEY_NAME = 'hevy-api-key'
const OFF = { on: false, since: 0, base: { workouts: [], routines: {} }, out: { w: {}, r: {} }, failed: {}, unsure: {}, tpl: {}, folders: {}, last: null }
const SOON_MS = 10e3            // after a change: one send for a burst of edits
const RETRY_MS = 60e3           // after an error, not again before this
const CALL_MS = 20e3            // one call that has not answered by then is taken as offline
const PASS_MS = 5 * 60e3        // a pass still running then (upstream's page reads have no timeout) is let go

/* -------------------------------------------------------------------------------- calls -- */

/** One Hevy API call: the reply's JSON, or a HevyApiError ('auth', 'rate-limit', 'http N', 'offline'). */
export async function hevyCall(key, method, path, body, get = fetch) {
  let res
  try {
    res = await within(get(new URL(path, HEVY_API), {
      method,
      headers: { 'api-key': key, ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }), CALL_MS)
  } catch { throw new HevyApiError(0, 'offline') }
  if (res.status === 401) throw new HevyApiError(401, 'auth')
  if (res.status === 429) throw new HevyApiError(429, 'rate-limit')
  if (!res.ok) throw new HevyApiError(res.status, `http ${res.status}`)
  return res.status === 204 ? null : res.json().catch(() => null)
}

// An error that stops the whole pass (the key, the rate, the network, Hevy itself) rather than
// one item Hevy refused (a 400, a 403 at a limit, a 404).
const stops = e => !(e instanceof HevyApiError) || e.status === 0 || e.status === 401 || e.status === 429 || e.status >= 500
const kindOf = e => (!(e instanceof HevyApiError) ? 'failed' : e.status === 401 ? 'auth' : e.status === 429 ? 'rate' : e.status === 0 ? 'offline' : 'failed')
const idOf = (res, k) => { const v = Array.isArray(res?.[k]) ? res[k][0] : res?.[k] || res; return v?.id != null ? String(v.id) : null }
// A create Hevy answered without an id is refused, not kept as sent with no id: the row then shows
// it, rather than a later change quietly creating a second copy Hevy's API cannot delete.
const createdId = (res, k) => { const id = idOf(res, k); if (!id) throw new HevyApiError(422, 'no id'); return id }
// A workout whose POST got no answer (a timeout, the network gone) may still be in Hevy, which
// cannot delete a copy: the next pass looks for it among Hevy's newest workouts by its start.
const RECENT = '/v1/workouts?page=1&pageSize=10'
const sameStart = (a, b) => a != null && b != null && Date.parse(a) === Date.parse(b)

/**
 * One export pass over `S`. `st` is the export state, changed in place and saved through `save`
 * after each item. `call(method, path, body)` and `pages(path, resultKey, pageSize)` reach Hevy;
 * `apply(fn)` changes the store (a new routine's Hevy id). Resolves with { sent, refused, error }.
 */
export async function exportOnce(S, st, { call, pages, apply, save = async () => {} }) {
  const todo = pending(S, st)
  let sent = 0, refused = 0
  if (!todo.workouts.length && !todo.routines.length) return { sent, refused, error: null }
  const drafts = [...todo.workouts, ...todo.routines]
  const refuse = async item => { st.failed[item.id] = item.h; refused++; await save(st) }
  const off = () => st.on === false    // turned off while this pass runs: no further call

  try {
    // The templates: what is already known, else the account's, else made in Hevy.
    const need = [...new Set(drafts.flatMap(i => exercisesOf(i.draft)))].filter(ex => !st.tpl[ex])
    // A brand's own template, when the account has one; looked for again while it has none.
    const brands = [...new Map(drafts.flatMap(i => brandsOf(i.draft)).map(b => [b.key, b])).values()].filter(b => !st.tpl[b.key])
    const bad = new Set()
    if (need.length || brands.length) {
      const find = templateFinder(await pages('/v1/exercise_templates', 'exercise_templates', 100), S)
      for (const b of brands) { const t = find(b.ex, b.brand, b.cable, b.side); if (t && t.id !== find(b.ex)?.id) st.tpl[b.key] = t }
      const exs = new Map(allExercises(S).map(e => [e.id, e]))
      for (const ex of need) {
        if (off()) break
        const known = find(ex)
        if (known) { st.tpl[ex] = known; continue }
        const body = newTemplate(exs.get(ex) || { id: ex, n: ex }, drafts.flatMap(i => setsOf(i.draft, ex)))
        try {
          const res = await call('POST', '/v1/exercise_templates', { exercise: body })
          const id = res?.id ?? res?.exercise_template?.id
          if (id == null) throw new HevyApiError(500, 'no id')
          st.tpl[ex] = { id: String(id), type: body.exercise_type }
        } catch (e) { if (stops(e)) throw e; bad.add(ex) }
      }
      await save(st)
    }
    const tplOf = (ex, brand, cable, side) => (brand && st.tpl[brandKey(ex, brand, cable, side)]) || st.tpl[ex]
    const ready = item => exercisesOf(item.draft).every(ex => !bad.has(ex) && st.tpl[ex])

    for (const item of todo.workouts) {
      if (off()) break
      if (!ready(item)) { await refuse(item); continue }
      const body = { workout: finish(item.draft, tplOf) }
      try {
        let id = item.hevyId
        if (!id && st.unsure?.[item.id]) {
          const res = await call('GET', RECENT)
          const twin = (Array.isArray(res?.workouts) ? res.workouts : []).find(w => sameStart(w?.start_time, body.workout.start_time))
          if (twin?.id != null) id = String(twin.id)
        }
        if (id) {
          try { await call('PUT', `/v1/workouts/${encodeURIComponent(id)}`, body) } catch (e) {
            if (!(e instanceof HevyApiError) || e.status !== 404) throw e
            id = null                       // gone from Hevy: sent again as a new one
          }
        }
        if (!id) {
          try { id = createdId(await call('POST', '/v1/workouts', body), 'workout') } catch (e) {
            if (e instanceof HevyApiError && e.status === 0) { (st.unsure ||= {})[item.id] = 1; await save(st) }
            throw e
          }
        }
        st.out.w[item.id] = { id, h: item.h }
        delete st.failed[item.id]
        if (st.unsure) delete st.unsure[item.id]
        sent++
        await save(st)
      } catch (e) { if (stops(e)) throw e; await refuse(item) }
    }

    // Folders by name: Hevy's own of that title, else made there.
    const names = [...new Set(todo.routines.map(i => i.draft.folder).filter(Boolean))].filter(n => st.folders[n] == null)
    if (names.length) {
      for (const f of await pages('/v1/routine_folders', 'routine_folders', 10)) {
        const n = String(f?.title || '').trim()
        if (n && st.folders[n] == null) st.folders[n] = f.id
      }
      for (const n of names) {
        if (st.folders[n] != null) continue
        try { st.folders[n] = idOf(await call('POST', '/v1/routine_folders', { routine_folder: { title: n } }), 'routine_folder') } catch (e) { if (stops(e)) throw e }
      }
      await save(st)
    }

    for (const item of todo.routines) {
      if (off()) break
      if (!ready(item)) { await refuse(item); continue }
      const folder = item.draft.folder
      const folderId = folder && st.folders[folder] != null ? Number(st.folders[folder]) : null
      const body = { routine: { ...finish(item.draft, tplOf), folder_id: folderId } }
      try {
        let id = item.hevyId
        if (id) {
          try { await call('PUT', `/v1/routines/${encodeURIComponent(id)}`, body) } catch (e) {
            if (!(e instanceof HevyApiError) || e.status !== 404) throw e
            id = null
          }
        }
        if (!id) id = createdId(await call('POST', '/v1/routines', body), 'routine')
        st.out.r[item.id] = { id, h: item.h }
        delete st.failed[item.id]
        sent++
        await save(st)
        // The routine now has a Hevy twin: a later import replaces it in place (D30, D34).
        const given = folderId != null ? folder : ''
        apply?.(s => {
          const r = (s.routines || []).find(x => x.id === item.id)
          if (r && id) { r.hevyId = id; r.hvHevyFolder = given }
        })
      } catch (e) { if (stops(e)) throw e; await refuse(item) }
    }
    return { sent, refused, error: null }
  } catch (e) {
    await save(st)
    return { sent, refused, error: kindOf(e) }
  }
}

/* ------------------------------------------------------------------------------ the state -- */

let cached = null
export async function loadExport() {
  if (cached) return cached
  const f = await readJsonFile(EXPORT_FILE)
  const map = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})
  cached = f && typeof f === 'object'
    ? { ...OFF, ...f, out: { w: map(f.out?.w), r: map(f.out?.r) }, failed: map(f.failed), unsure: map(f.unsure), tpl: map(f.tpl), folders: map(f.folders) }
    : JSON.parse(JSON.stringify(OFF))
  return cached
}
const saveExport = st => { cached = st; return writeJsonFile(EXPORT_FILE, st) }

const listeners = new Set()
export function onExportChange(cb) { listeners.add(cb); return () => listeners.delete(cb) }
const told = st => { for (const cb of listeners) cb(st) }

let applyRef = null
let running = null
let lastError = 0

/**
 * Turns the export on with `key`: checks it with Hevy, keeps it encrypted, notes what is already
 * in the log (never sent), and sends once. Resolves with { ok, reason }: 'auth' for a key Hevy
 * refused, 'offline', 'unsupported' when the key cannot be kept.
 */
export async function enableExport(key, getState, { apply = null, get = fetch, now = Date.now() } = {}) {
  const k = String(key || '').trim()
  if (!k) return { ok: false, reason: 'empty' }
  try { await hevyCall(k, 'GET', '/v1/user/info', null, get) } catch (e) { return { ok: false, reason: e?.status === 403 ? 'auth' : kindOf(e) } }
  if (!(await putSecret(KEY_NAME, k))) return { ok: false, reason: 'unsupported' }
  const st = { ...JSON.parse(JSON.stringify(OFF)), on: true, since: now, base: baseline(getState()) }
  await saveExport(st)
  told(st)
  lastError = 0
  await sendToHevy(getState, { apply }).catch(() => {})
  return { ok: true, reason: null }
}

/**
 * Turns the export off and forgets the key. What was sent stays in Hevy. The state is changed in
 * place: a pass still running holds the same object, so its saves keep it off and it stops at
 * its next item.
 */
export async function disableExport() {
  const st = await loadExport()
  st.on = false
  st.last = null
  await saveExport(st)
  await removeSecret(KEY_NAME)
  if (running) await within(running, 3000).catch(() => {})
  told(st)
  return st
}

/**
 * One pass, never two at once; after an error not again for a minute unless `force` (Send now).
 * A no-op with the switch off or no key.
 */
export function sendToHevy(getState, { force = false, apply = null, now = Date.now() } = {}) {
  if (!MOBILE) return Promise.resolve(cached)
  if (running) return running
  if (!force && lastError && now - lastError < RETRY_MS) return Promise.resolve(cached)
  const pass = within(sendOnce(getState, apply || applyRef, now, force), PASS_MS)
    .catch(() => cached)
    .finally(() => { if (running === pass) running = null })
  running = pass
  return pass
}

async function sendOnce(getState, apply, now, force) {
  const st = await loadExport()
  if (!st.on) return st
  // Nothing new to send (the usual pass): no Keystore read and no file write (battery).
  // Send now still goes the whole way, so a lost key shows.
  if (!force && st.last) {
    const todo = pending(getState(), st)
    if (!todo.workouts.length && !todo.routines.length) return st
  }
  const key = await getSecret(KEY_NAME)
  if (!key) { st.last = { at: now, sent: 0, refused: 0, error: 'nokey' }; await saveExport(st); told(st); return st }
  const res = await exportOnce(getState(), st, {
    call: (m, p, b) => hevyCall(key, m, p, b),
    pages: (p, resultKey, pageSize) => fetchHevyPages(p, key, { resultKey, pageSize }),
    apply,
    save: saveExport,
  })
  lastError = res.error ? now : 0
  // A pass with nothing to do keeps the last send's line.
  if (res.sent || res.refused || res.error || !st.last) st.last = { at: now, ...res }
  await saveExport(st)
  told(st)
  return st
}

/** At launch (hevier/index.js): a pass after start-up, on each return to the app, and after changes. */
let started = false
export function initHevyExport(store) {
  if (!MOBILE || started) return
  const { get: getState, update: apply } = store
  const subscribe = store.watch(['workouts', 'routines', 'customEx', 'unit'])
  started = true
  applyRef = apply
  import('@capacitor/app').then(({ App }) => {
    App.addListener('appStateChange', ({ isActive }) => { if (isActive) sendToHevy(getState).catch(() => {}) })
  }).catch(() => {})
  setTimeout(() => loadExport().then(() => sendToHevy(getState)).catch(() => {}), 5000)
  let tm = null
  subscribe?.(() => {
    clearTimeout(tm)
    tm = setTimeout(() => sendToHevy(getState).catch(() => {}), SOON_MS)
  })
}
