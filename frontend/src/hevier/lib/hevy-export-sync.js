// The export to Hevy (hevier/DECISIONS.md D34): with the switch on and a key kept, every workout
// saved since and every routine changed since goes to Hevy, while the app is open (at launch, on
// coming back, a little after each change). What goes is decided by hevy-export.js; this file
// calls the API and keeps, on the phone (`hevier-hevy-export.json`, never in S), what was sent as
// which Hevy id, with each one's fingerprint, and the templates and folders it found or made.
import { MOBILE, readJsonFile, writeJsonFile } from '../../lib/mobile.js'
import { HEVY_API, HevyApiError, fetchHevyPages } from '../../lib/import-hevy.js'
import { allExercises } from '../../lib/exercises.js'
import { baseline, pending, finish, exercisesOf, brandsOf, brandKey, setsOf, templateFinder, newTemplate, builtinTemplates, webWorkout, repairMarks } from './hevy-export.js'
import { webClient } from './hevy-web.js'
import { hevyLogin } from './hevy-login.js'
import { nativeFetch } from '../../lib/capacitor-fetch.js'
import { getSecret, putSecret, removeSecret } from './secret.js'
import { within } from './within.js'
import { partOn } from './module-parts.js'
import { stopNotice } from './hevy-stop.js'
import { t } from '../../lib/i18n.js'

export const EXPORT_FILE = 'hevier-hevy-export.json'
export const KEY_NAME = 'hevy-api-key'
export const SESSION_NAME = 'hevy-web-session'
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
const kindOf = e => (!(e instanceof HevyApiError) ? 'failed' : e.status === 401 ? (e.message === 'key' ? 'key' : 'auth') : e.status === 429 ? 'rate' : e.status === 0 ? 'offline' : 'failed')
const idOf = (res, k) => { const v = Array.isArray(res?.[k]) ? res[k][0] : res?.[k] || res; return v?.id != null ? String(v.id) : null }
// A create Hevy answered without an id is refused, not kept as sent with no id: the row then shows
// it, rather than a later change quietly creating a second copy Hevy's API cannot delete.
const createdId = (res, k) => { const id = idOf(res, k); if (!id) throw new HevyApiError(422, 'no id'); return id }
// A workout whose POST got no answer (a timeout, the network gone) may still be in Hevy, which
// cannot delete a copy: the next pass looks for it among Hevy's newest workouts by its start.
const RECENT = '/v1/workouts?page=1&pageSize=10'
// To the second: Hevy drops the milliseconds the phone sends.
const sameStart = (a, b) => a != null && b != null && Math.floor(Date.parse(a) / 1e3) === Math.floor(Date.parse(b) / 1e3)

// The most the private API's workout list gives at once: 6 and more are refused with a 400.
const PAGE = 5
// The private API's workouts, newest first, for the same twin check (D138).
const webRecent = async (web, st) => {
  if (!st.user) st.user = (await web('GET', '/account'))?.username || null
  if (!st.user) return []
  const res = await web('GET', `/user_workouts_paged?username=${encodeURIComponent(st.user)}&limit=${PAGE}&offset=0`)
  return (Array.isArray(res?.workouts) ? res.workouts : []).map(w => ({ id: w.id, start: w.start_time }))
}
const uuid = () => globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16))

/** The account's own templates on the private API, the archived (deleted) ones left out. */
const webCustoms = async web => {
  const res = await web('GET', '/custom_exercise_templates')
  return (Array.isArray(res) ? res : []).filter(t => t?.id != null && !t.is_archived)
}

/**
 * One export pass over `S`. `st` is the export state, changed in place and saved through `save`
 * after each item. `call(method, path, body)` and `pages(path, resultKey, pageSize)` reach Hevy's
 * official API with the key, `web(method, path, body)` its private web API with the login (D138):
 * with `web`, workouts and the templates go that way, a branded exercise as Hevy's own exercise
 * (its brand is in the note, D137), and routines only with a key. `apply(fn)` changes the store (a
 * new routine's Hevy id). Resolves with { sent, refused, error }.
 */
export async function exportOnce(S, st, { call, pages, web = null, apply, save = async () => {} }) {
  const todo = pending(S, st)
  if (web && !call) todo.routines = []   // no key: routines wait for one
  let sent = 0, refused = 0
  if (!todo.workouts.length && !todo.routines.length) return { sent, refused, error: null }
  const drafts = [...todo.workouts, ...todo.routines]
  const refuse = async item => { st.failed[item.id] = item.h; refused++; await save(st) }
  const off = () => st.on === false    // turned off while this pass runs: no further call

  try {
    // The templates: what is already known, else the account's, else made in Hevy.
    const need = [...new Set(drafts.flatMap(i => exercisesOf(i.draft)))].filter(ex => !st.tpl[ex])
    // A brand's own template, when the account has one; looked for again while it has none.
    const branded = web ? todo.routines : drafts
    const brands = [...new Map(branded.flatMap(i => brandsOf(i.draft)).map(b => [b.key, b])).values()].filter(b => !st.tpl[b.key])
    const bad = new Set()
    // Each template's title, which the private API's workout body names (built-ins, then the account's).
    const titles = new Map(builtinTemplates().map(t => [t.id, t.title]))
    const customs = web && todo.workouts.length ? await webCustoms(web) : null
    for (const t of customs || []) titles.set(String(t.id), t.title)
    if (need.length || brands.length) {
      const find = templateFinder(web ? [...builtinTemplates(), ...(customs || await webCustoms(web))] : await pages('/v1/exercise_templates', 'exercise_templates', 100), S)
      for (const b of brands) { const t = find(b.ex, b.brand, b.cable, b.side); if (t && t.id !== find(b.ex)?.id) st.tpl[b.key] = t }
      const exs = new Map(allExercises(S).map(e => [e.id, e]))
      for (const ex of need) {
        if (off()) break
        const known = find(ex)
        if (known) { st.tpl[ex] = known; continue }
        const body = newTemplate(exs.get(ex) || { id: ex, n: ex }, drafts.flatMap(i => setsOf(i.draft, ex)))
        try {
          const res = web ? await web('POST', '/custom_exercise_template', { exercise: body }) : await call('POST', '/v1/exercise_templates', { exercise: body })
          const id = res?.id ?? res?.exercise_template?.id
          if (id == null) throw new HevyApiError(500, 'no id')
          st.tpl[ex] = { id: String(id), type: body.exercise_type }
          titles.set(String(id), body.title)
        } catch (e) { if (stops(e)) throw e; bad.add(ex) }
      }
      await save(st)
    }
    const tplOf = (ex, brand, cable, side) => (brand && st.tpl[brandKey(ex, brand, cable, side)]) || st.tpl[ex]
    const ready = item => exercisesOf(item.draft).every(ex => !bad.has(ex) && st.tpl[ex])

    for (const item of web ? todo.workouts : []) {
      if (off()) break
      if (!ready(item)) { await refuse(item); continue }
      const body = webWorkout(finish(item.draft, ex => st.tpl[ex]), { titleOf: id => titles.get(String(id)), clientId: uuid() })
      try {
        let id = item.hevyId
        if (!id && st.unsure?.[item.id]) {
          const twin = (await webRecent(web, st)).find(w => w.start === body.workout.startTime)
          if (twin?.id != null) id = String(twin.id)
        }
        if (id) {
          try { await web('PUT', '/workout', { ...body, workout_id: id }) } catch (e) {
            if (!(e instanceof HevyApiError) || e.status !== 404) throw e
            // Deleted in Hevy: a repair leaves it deleted; an edit here sends it again as a new one.
            if (st.out.w[item.id]?.h === 'repair') { st.out.w[item.id].h = item.h; await save(st); continue }
            id = null
          }
        }
        if (!id) {
          try { id = createdId(await web('POST', '/workout', body), 'workout') } catch (e) {
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

    for (const item of web ? [] : todo.workouts) {
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

/** The private API's caller with the session kept on this phone; `interactive` may open the login screen. */
const webOf = ({ interactive = false } = {}) => webClient({
  load: () => getSecret(SESSION_NAME).then(v => (v ? JSON.parse(v) : null)).catch(() => null),
  // A rotated pair that is not kept would leave only a dead refresh token: the pass stops.
  save: async v => {
    if (!v) return removeSecret(SESSION_NAME)
    if (!(await putSecret(SESSION_NAME, JSON.stringify(v)))) throw new HevyApiError(507, 'unsupported')
  },
  login: interactive ? hevyLogin : null,
  get: nativeFetch,
})

/**
 * Turns the export on (D138): opens Hevy's login screen, keeps the session encrypted, notes what
 * is already in the log (never sent), and sends once. Resolves with { ok, reason }: 'auth' when no
 * login came back, 'offline', 'unsupported' when the session cannot be kept.
 */
export async function enableExport(getState, { apply = null, now = Date.now() } = {}) {
  let user
  try { user = (await webOf({ interactive: true })('GET', '/account'))?.username || null } catch (e) { return { ok: false, reason: kindOf(e) } }
  if (!(await getSecret(SESSION_NAME))) return { ok: false, reason: 'unsupported' }
  const st = { ...JSON.parse(JSON.stringify(OFF)), on: true, since: now, base: baseline(getState()), user }
  await saveExport(st)
  told(st)
  lastError = 0
  await sendToHevy(getState, { apply }).catch(() => {})
  return { ok: true, reason: null }
}

/** Logs in again (the session was refused or lost) and sends what waits. */
export async function relogin(getState, { apply = null } = {}) {
  await removeSecret(SESSION_NAME)
  try { await webOf({ interactive: true })('GET', '/account') } catch (e) { return { ok: false, reason: kindOf(e) } }
  const st = await loadExport()
  // The logged-out line goes now, even when the pass below has nothing to send.
  if (st.last?.error === 'auth' || st.last?.error === 'nokey') { st.last = { ...st.last, error: null }; await saveExport(st); told(st) }
  lastError = 0
  await sendToHevy(getState, { force: true, apply }).catch(() => {})
  return { ok: true, reason: null }
}

/**
 * Keeps the Pro API key for routines (D34; D138 sends workouts without it): checks it with Hevy
 * and keeps it encrypted. Resolves with { ok, reason } as enableExport.
 */
export async function saveRoutineKey(key, { get = fetch } = {}) {
  const k = String(key || '').trim()
  if (!k) return { ok: false, reason: 'empty' }
  try { await hevyCall(k, 'GET', '/v1/user/info', null, get) } catch (e) { return { ok: false, reason: e?.status === 403 ? 'auth' : kindOf(e) } }
  if (!(await putSecret(KEY_NAME, k))) return { ok: false, reason: 'unsupported' }
  return { ok: true, reason: null }
}
export const forgetRoutineKey = () => removeSecret(KEY_NAME)
export const hasRoutineKey = async () => !!(await getSecret(KEY_NAME))
export const hasLogin = async () => !!(await getSecret(SESSION_NAME))

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
  await removeSecret(SESSION_NAME)
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
  if (!partOn(getState(), 'integrations', 'hevy')) return Promise.resolve(cached) // D114: paused while its part is off
  if (running) return running
  if (!force && lastError && now - lastError < RETRY_MS) return Promise.resolve(cached)
  const pass = within(sendOnce(getState, apply || applyRef, now, force), PASS_MS)
    .catch(() => cached)
    .finally(() => { if (running === pass) running = null })
  running = pass
  return pass
}

// A refused or lost key is told once as a toast too (hevy-stop.js), in memory only.
let stopTold = false
const tellStop = (error, workouts, force, web = false) => {
  const n = stopNotice(stopTold, { error, workouts, force })
  stopTold = n.told
  const msg = n.tell === 'auth'
    ? (web ? t('Send to Hevy stopped: Hevy logged you out. Log in again in Settings → Integrations') : t('Send to Hevy stopped: Hevy refused the key. Check Settings → Integrations'))
    : t('Send to Hevy stopped: the Hevy login is gone from this phone. Check Settings → Integrations')
  // Loaded only when it is needed, so this file stays free of the store (its tests run without a page).
  if (n.tell) import('../../store/useUI.js').then(({ useUI }) => useUI.getState().toast(msg)).catch(() => {})
}

async function sendOnce(getState, apply, now, force) {
  const st = await loadExport()
  if (!st.on) return st
  const todo = pending(getState(), st)
  // Nothing new to send (the usual pass): no Keystore read and no file write (battery).
  // Send now still goes the whole way, so a lost key shows.
  if (!force && st.last && !todo.workouts.length && (!todo.routines.length || !(await getSecret(KEY_NAME)))) return st
  const key = await getSecret(KEY_NAME)
  const web = (await getSecret(SESSION_NAME)) ? webOf({ interactive: force }) : null
  if (!key && !web) {
    st.last = { at: now, sent: 0, refused: 0, error: 'nokey' }; await saveExport(st); told(st)
    tellStop('nokey', todo.workouts.length, force)
    return st
  }
  const res = await exportOnce(getState(), st, {
    // With a login, a refused key is the routines' key only, not a logout.
    call: key ? (m, p, b) => hevyCall(key, m, p, b).catch(e => { throw web && e?.status === 401 ? new HevyApiError(401, 'key') : e }) : null,
    pages: key ? (p, resultKey, pageSize) => fetchHevyPages(p, key, { resultKey, pageSize }) : null,
    web,
    apply,
    save: saveExport,
  })
  lastError = res.error ? now : 0
  // A pass with nothing to do keeps the last send's line.
  if (res.sent || res.refused || res.error || !st.last) st.last = { at: now, ...res }
  await saveExport(st)
  told(st)
  tellStop(res.error, todo.workouts.length, force, !!web)
  return st
}

/* ------------------------------------------------------------------- the repair (D138) -- */

/**
 * Marks the workouts sent before D138 whose exercises now go as another Hevy exercise (a brand's
 * own, or one the export table gives), so the next pass rewrites them in place. Resolves with
 * their ids, or null without a login. The brand templates are forgotten: workouts no longer use
 * them, and routines find them again by title, so they can be offered for deletion when unused.
 */
export async function planRepair(getState) {
  const st = await loadExport()
  if (!st.on || !(await getSecret(SESSION_NAME))) return null
  const web = webOf()
  const find = templateFinder([...builtinTemplates(), ...(await webCustoms(web))], getState())
  const marks = repairMarks(getState(), st, find)
  Object.assign(st.tpl, marks.tpl)
  for (const id of marks.workouts) st.out.w[id].h = 'repair'
  for (const k of Object.keys(st.tpl)) if (k.includes('|')) delete st.tpl[k]
  await saveExport(st)
  return marks.workouts
}

// Every template id a list of Hevy workouts or routines uses.
const idsIn = list => (list || []).flatMap(x => (x?.exercises || []).map(e => String(e.exercise_template_id)))

/**
 * The account's custom exercises that no workout or routine in Hevy uses and the export no longer
 * sends to: [{ id, title }]. Reads all of the account's workouts, five at a time.
 */
export async function unusedCustoms() {
  const st = await loadExport()
  const web = webOf()
  const used = new Set(Object.values(st.tpl || {}).map(v => String(v?.id)))
  if (!st.user) st.user = (await web('GET', '/account'))?.username || null
  // Without the workouts every custom would look unused.
  if (!st.user) throw new HevyApiError(0, 'no username')
  for (let offset = 0; ; offset += PAGE) {
    const page = (await web('GET', `/user_workouts_paged?username=${encodeURIComponent(st.user)}&limit=${PAGE}&offset=${offset}`))?.workouts
    if (!Array.isArray(page)) throw new HevyApiError(0, 'no workout list')
    for (const id of idsIn(page)) used.add(id)
    if (page.length < PAGE) break
  }
  // As hevy.com does: tell it the routines already read, ask again while it has more.
  const known = {}
  for (let i = 0; i < 100; i++) {
    const res = await web('POST', '/routines_sync_batch', known)
    if (!Array.isArray(res?.updated)) throw new HevyApiError(0, 'no routine list')
    for (const r of res.updated) known[r.id] = r.updated_at || '2018-07-31T12:53:33.333Z'
    for (const id of idsIn(res.updated)) used.add(id)
    if (!res.isMore || !res.updated.length) break
  }
  return (await webCustoms(web)).filter(c => !used.has(String(c.id))).map(c => ({ id: String(c.id), title: c.title }))
}

/** Deletes those custom exercises in Hevy (Hevy archives them). Resolves with how many went. */
export async function removeCustoms(ids) {
  const web = webOf()
  let n = 0
  for (const id of ids) { await web('DELETE', `/custom_exercise_template/${encodeURIComponent(id)}`); n++ }
  return n
}

/** At launch (hevier/index.js): a pass after start-up, on each return to the app, and after changes. */
let started = false
export function initHevyExport(store) {
  if (!MOBILE || started) return
  const { get: getState, update: apply } = store
  const subscribe = store.watch(['workouts', 'routines', 'customEx', 'unit', 'modules', 'hvModuleParts'])
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
