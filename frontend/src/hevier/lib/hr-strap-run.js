// [hevier] The heart-rate strap at run time (hevier/DECISIONS.md D79): while a live workout is open
// and a strap is picked, HevierHrStrapService records it; once the workout is saved, its recording
// goes into the workout (hevier/lib/hr-strap.js mergeStrap) and the file is deleted. A workout
// discarded leaves nothing. Which strap is kept on the phone (`hevier-hr-strap.json`), not in S:
// a strap is paired with this phone, not with the account.
import { MOBILE, isAndroid, readJsonFile, writeJsonFile } from '../../lib/mobile.js'
import { t } from '../../lib/i18n.js'
import { parseRecording, mergeStrap, recordable, decodeHrm, plausible } from './hr-strap.js'

export const STRAP_FILE = 'hevier-hr-strap.json'

// `{ H }`, or null off Android. Wrapped in an object, and unwrapped only after the await: a
// Capacitor plugin proxy answers `then`, so a promise resolving to it would call it (as in
// upstream's lib/health-sync.js).
let pluginP = null
export async function plugin() {
  if (!MOBILE || !(await isAndroid())) return null
  if (!pluginP) pluginP = import('@capacitor/core').then(({ registerPlugin }) => ({ H: registerPlugin('HevierHrStrap') }))
  return pluginP
}

let strap
/** The strap picked on this phone, `{ address, name }`, or null. */
export async function loadStrap() {
  if (strap !== undefined) return strap
  const f = await readJsonFile(STRAP_FILE)
  strap = f && typeof f.address === 'string' && f.address ? { address: f.address, name: String(f.name || '') } : null
  return strap
}

const strapListeners = new Set()
export const onStrapChange = cb => { strapListeners.add(cb); return () => strapListeners.delete(cb) }

/** Picks a strap (or forgets it, with null), and starts or stops the recording to match. */
export async function saveStrap(next) {
  strap = next ? { address: next.address, name: String(next.name || '') } : null
  await writeJsonFile(STRAP_FILE, strap || {})
  for (const cb of strapListeners) cb(strap)
}

// The live reading for the workout's header: the plugin's events, passed on to the screens.
const live = { state: 'off', last: null }
const liveListeners = new Set()
export const liveStrap = () => live
export function onLive(cb) { liveListeners.add(cb); return () => liveListeners.delete(cb) }
const tell = () => { for (const cb of liveListeners) cb(live) }

let started = null    // the workout id the recording is for
let startedAt = null  // the address the service records, kept when it moves to a new private one

// This workout's readings so far, `[ms, bpm]`, for the full-screen view (D80): the recording read
// once when it is asked for, then each reading as it comes.
let buf = null
export async function workoutSamples() {
  if (buf?.id === started && buf.loaded) return buf.list
  const id = started
  const { H } = (await plugin()) || {}
  const rec = H && id ? await H.recording({ session: id }).catch(() => null) : null
  if (id !== started) return []
  buf = { id, loaded: true, list: parseRecording(rec?.text || '') }
  return buf.list
}
let error = null
export const lastError = () => error

const labels = name => ({
  name,
  title: t('Heart rate strap'),
  connecting: t('Connecting to {0}…', '{0}'),
  live: t('{0} bpm', '{0}'),
  recording: t('Recording heart rate'),
})

let installed = false
export function initHrStrap(store) {
  if (!MOBILE || installed) return
  installed = true
  ;(async () => {
    const { H } = (await plugin()) || {}
    if (!H) return
    // Only a reading the saved workout keeps is shown live: off the skin or out of range, the
    // strap reads as quiet rather than putting a stray 255 into a zone.
    H.addListener('reading', r => {
      const d = decodeHrm(r.hex)
      if (!plausible(d)) return
      live.last = { t: Number(r.t), bpm: d.bpm }
      if (buf?.loaded && buf.id === started) buf.list.push([live.last.t, d.bpm])
      tell()
    })
    H.addListener('state', r => {
      live.state = r.state
      if (r.state === 'off') live.last = null
      tell()
      // The service found the strap again under a new address (HevierHrStrapService.find): keep it.
      if (r.state === 'connected' && strap && r.address && r.address !== strap.address) {
        startedAt = r.address
        saveStrap({ ...strap, address: r.address })
      }
    })
    const st = await H.status().catch(() => null)
    if (st?.state) { live.state = st.state; tell() }
    if (st?.session) { started = st.session; startedAt = st.address || null }

    // A recording whose workout is still open (the strap forgotten mid-workout, an app restart)
    // waits here until it is saved or discarded.
    const pending = new Set()
    const settle = async id => {
      const S = store.get()
      if ((S?.workouts || []).some(w => w?.id === id)) {
        const rec = await H.recording({ session: id }).catch(() => null)
        if (!rec) return
        const samples = parseRecording(rec.text)
        if (samples.length) store.update(s => { mergeStrap(s, id, samples) })
      } else if (S?.active?.id === id) { pending.add(id); return }
      pending.delete(id)
      await H.clear({ session: id }).catch(() => {})
    }

    const sync = async () => {
      const A = store.get()?.active
      for (const id of [...pending]) if (A?.id !== id) await settle(id)
      const s = await loadStrap()
      if (recordable(A) && s) {
        // Another strap picked mid-workout: the service moves to it, into the same recording.
        if (started === A.id && startedAt === s.address) return
        if (started && started !== A.id) { const prev = started; started = null; await H.stop(); await settle(prev) }
        started = A.id
        startedAt = s.address
        try { await H.start({ session: A.id, address: s.address, ...labels(s.name || s.address) }); error = null }
        catch (e) { started = null; startedAt = null; error = e?.code || 'failed' }
        tell()
      } else if (started) {
        const prev = started
        started = null
        await H.stop().catch(() => {})
        // The saved workout lands in the same update that closes the session; a moment's grace
        // for a save that comes right after.
        setTimeout(() => settle(prev), 1500)
      }
    }

    // Recordings an app restart or a crash left behind: put into their workout, or let go.
    const swept = await H.sessions().catch(() => ({ sessions: [] }))
    for (const id of swept.sessions || []) if (id !== store.get()?.active?.id) await settle(id)

    // One pass at a time: a tick in the middle of a start or a stop waits for it.
    let queue = Promise.resolve()
    const run = () => { queue = queue.then(sync, sync); return queue }
    store.watch(['active', 'workouts'])(run)
    onStrapChange(run)
    document.addEventListener('visibilitychange', () => { if (!document.hidden) run() })
    run()
  })()
}
