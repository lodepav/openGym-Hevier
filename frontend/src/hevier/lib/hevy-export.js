// What the export to Hevy sends (hevier/DECISIONS.md D34): openGym's workouts and routines as the
// bodies of Hevy's API, and the Hevy exercise template each openGym exercise goes as. Pure: the
// runner (hevy-export-sync.js) calls the API and keeps what was sent.
//
// A workout or routine is first made into a *draft*: the body Hevy gets, with openGym's exercise
// ids where the template ids go. Its fingerprint is what decides whether a sent item changed, so a
// change Hevy cannot show (a heart rate read later, a sync stamp) sends nothing. `finish` then puts
// the template ids in and leaves out the fields the template's type does not take.
import { EXIDX, allExercises, canonicalExId, isAssisted, isBodyweightEq, isCardio } from '../../lib/exercises.js'
import { HEVY_ID_MAP } from '../../lib/import-hevy.js'
import { importId, matchHevyTitle } from '../../lib/import-csv.js'
import { isWarmupRow, isFailureSet, isSideSet, dropsOf, clustersOf } from '../../lib/workout-model.js'
import { isPerSide, modeOf } from '../../lib/history.js'
import { isHoldRow, setNumberOf } from './hold-set.js'
import { savedCable, cableText, savedGym, gymName } from './gym-labels.js'
import { routineRows } from './routine-table.js'
import { folderOf } from './routine-folders.js'
import { FIXES, titleName, titleLabel, outcomeOf, matchTitle, readKey, brandNorm, choicesFor } from './hevy-import.js'
import { pickFor } from '../../lib/import-choices.js'

const LB_TO_KG = 0.45359237
const NOTE_MAX = 280
const kgOf = (w, unit) => {
  const n = Number(w)
  if (!(n > 0)) return null
  return Math.round((unit === 'lb' ? n * LB_TO_KG : n) * 100) / 100
}
const int = v => { const n = Math.round(Number(v)); return Number.isFinite(n) && n > 0 ? n : null }
const text = v => (typeof v === 'string' ? v.trim().slice(0, NOTE_MAX) : '')

/** Workouts imported from a file or from Hevy carry an `iw` id; those never go back. */
export const isImported = w => typeof w?.id === 'string' && w.id.startsWith('iw')

/* ------------------------------------------------------------------------------ effort -- */

// Hevy's RPE steps. Below 6 Hevy has no value, so there is none.
const RPE_STEPS = [6, 7, 7.5, 8, 8.5, 9, 9.5, 10]
/** A set's RPE in Hevy's steps (RIR read as 10 − RIR), or null. */
export function rpeOf(set) {
  const raw = set?.rpe != null ? Number(set.rpe) : set?.rir != null ? 10 - Number(set.rir) : NaN
  if (!Number.isFinite(raw) || raw < 5.75) return null
  return RPE_STEPS.reduce((best, s) => (Math.abs(s - raw) < Math.abs(best - raw) ? s : best), RPE_STEPS[0])
}

/* ------------------------------------------------------------------------------- drafts -- */

// Superset tags → Hevy's integer ids, numbered in the order they appear.
function supersets(list) {
  const ids = new Map()
  return list.map(x => {
    if (!x?.sg) return null
    if (!ids.has(x.sg)) ids.set(x.sg, ids.size)
    return ids.get(x.sg)
  })
}

const done = s => (isSideSet(s) ? s.sides.L?.done === true || s.sides.R?.done === true : s?.done === true)

// One logged set → Hevy's rows: the set, then each drop, or each rest-pause burst, as a drop-set row.
function setRows(s, unit, cardio) {
  // Hevy logs one side (D29): a per-side set goes as the side with more reps (the heavier on a tie),
  // its drops and bursts included.
  const src = isSideSet(s)
    ? [s.sides.L, s.sides.R].filter(Boolean).sort((a, b) => (Number(b.r) || 0) - (Number(a.r) || 0) || (Number(b.w) || 0) - (Number(a.w) || 0))[0]
    : s
  const warm = isWarmupRow(s)
  const type = warm ? 'warmup' : isFailureSet(s) ? 'failure' : 'normal'
  const row = { type, weight_kg: kgOf(src.w ?? s.w, unit), reps: null, distance_meters: null, duration_seconds: null }
  if (cardio || s.min != null) {
    const min = Number(s.min) || 0
    row.weight_kg = null
    row.duration_seconds = int(min * 60)
    row.distance_meters = int((Number(s.speed) || 0) * min / 60 * 1000)
  } else if (s.sec != null && !(Number(src.r) > 0)) {
    row.duration_seconds = int(src.sec ?? s.sec)
  } else row.reps = Math.max(0, Math.round(Number(src.r) || 0))
  if (!warm) { const rpe = rpeOf(s); if (rpe != null) row.rpe = rpe }
  const out = [row]
  const bursts = clustersOf(src)
  if (bursts.length && row.reps != null) {
    row.reps = Math.max(0, row.reps - bursts.reduce((n, c) => n + (Number(c?.r) || 0), 0))
    for (const c of bursts) out.push({ ...row, type: 'dropset', reps: Math.max(0, Math.round(Number(c?.r) || 0)), rpe: undefined })
  }
  for (const d of dropsOf(src)) {
    out.push({ type: 'dropset', weight_kg: kgOf(d?.w, unit), reps: Math.max(0, Math.round(Number(d?.r) || 0)), distance_meters: null, duration_seconds: null })
  }
  return out.map(r => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)))
}

/* ------------------------------------------------------------------------------ extras -- */
// What Hevy's API has no field for goes into the notes (D137): the workout's heart rate, gym and
// phase into its description, each exercise's time, holds, uneven sides and heart rate per set into
// its note, with its brand and cable setup ("Hammer · cable 2:1"). English, as Hevy shows it whatever the app's language. Your own note comes first and
// stays whole; added lines that would pass NOTE_MAX are left off from the last.
const fit = (own, lines) => {
  let out = text(own)
  for (const l of lines) {
    const next = out ? out + '\n' + l : l
    if (next.length > NOTE_MAX) break
    out = next
  }
  return out || null
}
const tickAt = s => Math.max(Number(s?.at) || 0, Number(s?.sides?.L?.at) || 0, Number(s?.sides?.R?.at) || 0)
const ticks = e => (e.sets || []).filter(done).map(tickAt).filter(t => t > 0)
const num = v => String(Math.round(Number(v) * 100) / 100)
const load = (w, unit) => (Number(w) > 0 ? num(w) + ' ' + unit : 'bodyweight')
const setName = (rows, i) => (isWarmupRow(rows[i]) ? 'Warm-up ' : 'Set ') + setNumberOf(rows, i)

/** The workout description's added lines: heart rate, gym, phase. */
function workoutLines(w, S) {
  const out = []
  if (Number(w.hr?.avg) > 0) out.push('Heart rate ' + Math.round(w.hr.avg) + ' avg' + (Number(w.hr.max) > 0 ? ', ' + Math.round(w.hr.max) + ' max' : ''))
  // An OpenStreetMap gym is stored as "Name · street": the name only.
  // The gym the exercises were tagged with (D28) first: one changed in the session is not in w.gym.
  const gym = text(gymName(S, savedGym(w)) || w.gym?.name).split(' · ')[0].trim()
  if (gym) out.push('At ' + gym)
  if (w.hvPhase?.p) out.push('Phase: ' + w.hvPhase.p)
  return out
}

/** Minutes exercise `i` took: from the last tick of another exercise before its first (else the
 *  workout's start) to its own last tick. Superset partners ran together and share the span. */
function minutesOf(entries, i, ss, start) {
  const own = ticks(entries[i])
  if (!own.length) return null
  const first = Math.min(...own), last = Math.max(...own)
  let from = start
  entries.forEach((e, k) => {
    if (k === i || (ss[i] != null && ss[k] === ss[i])) return
    for (const t of ticks(e)) if (t < first && t > from) from = t
  })
  return last > from ? Math.max(1, Math.round((last - from) / 60000)) : null
}

/** An exercise note's added lines: brand and cable setup, time, then each hold and uneven per-side set, then heart rate per set. */
function exerciseLines(e, unit, minutes, holds) {
  const rows = e.sets || [], out = []
  const cable = savedCable(e)
  const label = [text(e.hvBrand), cable && 'cable ' + cableText(cable)].filter(Boolean).join(' · ')
  if (label) out.push(label[0].toUpperCase() + label.slice(1))
  if (minutes) out.push('Time ' + minutes + ' min')
  rows.forEach((s, i) => {
    if (!done(s)) return
    if (holds && isHoldRow(s)) {
      if (s.side === 'R' && rows[i - 1]?.side === 'L' && isHoldRow(rows[i - 1])) return   // written with its L row
      const pair = s.side === 'L' && rows[i + 1]?.side === 'R' && isHoldRow(rows[i + 1]) && done(rows[i + 1])
      const one = (h, side) => num(Number(h.sec) || 0) + ' s' + (side ? ' ' + side : '')
      const held = pair ? one(s, 'L') + ', ' + one(rows[i + 1], 'R') : one(s, s.side)
      out.push(setName(rows, i) + ': hold ' + held + (Number(s.w) > 0 ? ' at ' + load(s.w, unit) : ''))
    } else if (isSideSet(s)) {
      const { L, R } = s.sides
      if (!L?.done || !R?.done || (Number(L.w) === Number(R.w) && Number(L.r) === Number(R.r))) return
      out.push(setName(rows, i) + ': L ' + load(L.w, unit) + ' × ' + (Number(L.r) || 0) + ', R ' + load(R.w, unit) + ' × ' + (Number(R.r) || 0))
    }
  })
  const hr = rows.filter(done).map(s => Math.round(Number(s.hr?.avg) || 0)).filter(n => n > 0)
  if (hr.length) out.push('HR ' + hr.join(', '))
  return out
}

/**
 * A finished workout as Hevy's workout body, with openGym exercise ids (`ex`) in place of the
 * templates: only ticked sets, the entries without one left out. Null when nothing is left.
 * A hold in a reps exercise (D89) has no place in Hevy's weight-and-reps template: it goes in the
 * note instead (D137), unless the exercise has nothing else to send.
 */
export function workoutDraft(w, unit = 'kg', S = null) {
  const entries = (w?.entries || []).filter(e => e?.id && (e.sets || []).some(done))
  if (!entries.length || !(Number(w.start) > 0)) return null
  const ss = supersets(entries)
  const start = Number(w.start)
  const end = Number(w.end) > start ? Number(w.end) : start
  return {
    title: text(w.name) || 'Workout',
    description: fit(w.note, workoutLines(w, S)),
    start_time: new Date(start).toISOString(),
    end_time: new Date(end).toISOString(),
    exercises: entries.map((e, i) => {
      const reps = modeOf({ ...(e.target || {}), id: e.id }) === 'reps'
      const kept = e.sets.filter(done).filter(s => !(reps && isHoldRow(s)))
      return {
        ex: canonicalExId(e.id),
        ...(text(e.hvBrand) ? { brand: text(e.hvBrand) } : {}),
        ...(text(e.hvBrand) && ['2:1', 'x2'].includes(e.hvCable) ? { cable: e.hvCable } : {}),
        ...(text(e.hvBrand) && e.sets.some(s => done(s) && isSideSet(s)) ? { side: true } : {}),
        superset_id: ss[i],
        notes: fit(e.note, exerciseLines(e, unit, minutesOf(entries, i, ss, start), reps)),
        sets: (kept.length ? kept : e.sets.filter(done)).flatMap(s => setRows(s, unit, isCardio(e.id))),
      }
    }),
  }
}

/** A routine as Hevy's routine body, drawn as D15's table, with openGym exercise ids (`ex`). */
export function routineDraft(r, unit = 'kg') {
  const ex = (r?.ex || []).filter(c => c?.id)
  if (!ex.length) return null
  const ss = supersets(ex)
  return {
    title: text(r.name) || 'Routine',
    folder: folderOf(r),
    notes: text(r.note) || null,
    exercises: ex.map((cfg, i) => {
      const half = isPerSide(cfg) ? 2 : 1          // a per-side plan counts both sides' reps
      const reps = v => (v == null ? null : Math.max(1, Math.round(v / half)))
      const sets = routineRows(cfg, r, unit).map(row => {
        const s = { type: 'normal', weight_kg: null, reps: null, distance_meters: null, duration_seconds: null }
        if (row.kind === 'warm') return { ...s, type: 'warmup' }
        if (row.min != null) return { ...s, duration_seconds: int(row.min * 60), distance_meters: int(row.speed * row.min / 60 * 1000) }
        s.weight_kg = kgOf(row.w, unit)
        if (row.sec != null) s.duration_seconds = int(row.sec)
        else if (row.max) s.type = 'failure'
        else if (row.repsMin != null && row.repsMin < row.reps) s.rep_range = { start: reps(row.repsMin), end: reps(row.reps) }
        else s.reps = reps(row.reps)
        if (row.failure) s.type = 'failure'
        return s
      })
      return { ex: canonicalExId(cfg.id), superset_id: ss[i], rest_seconds: int(cfg.restSec), notes: text(cfg.note) || null, sets }
    }),
  }
}

/** A short fingerprint of a draft: a change in it is a change Hevy would show. */
export function fingerprint(draft) {
  const s = JSON.stringify(draft)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return (h >>> 0).toString(36) + '.' + s.length.toString(36)
}

/* ---------------------------------------------------------------------------- pending -- */

/**
 * What the export state holds when the switch goes on: the workouts already in the log, which
 * are never sent, and each routine's fingerprint, so only one changed from here on is.
 */
export function baseline(S) {
  const unit = S?.unit
  const routines = {}
  for (const r of S?.routines || []) { const d = routineDraft(r, unit); if (r?.id && d) routines[r.id] = fingerprint(d) }
  return { workouts: (S?.workouts || []).map(w => w?.id).filter(Boolean), routines }
}

/**
 * What has to go to Hevy now: `{ workouts: [{ id, draft, h, hevyId }], routines: [{ id, draft, h,
 * hevyId }] }`. `hevyId` set means an update (PUT). `st`: the export state ({ base, out, failed }).
 * An item Hevy refused (`failed[id] === h`) waits until it changes.
 */
export function pending(S, st) {
  const unit = S?.unit
  const base = st?.base || {}
  const before = new Set(base.workouts || [])
  const sentW = st?.out?.w || {}, sentR = st?.out?.r || {}
  const failed = st?.failed || {}
  // A workout finished before the switch went on never goes, whenever it reaches this phone (a
  // sync from another device, a backup merged in): Hevy's API cannot delete a duplicate.
  const since = Number(st?.since) || 0
  const tooOld = w => since > 0 && (Number(w.end ?? w.start) || 0) < since
  const workouts = [], routines = []
  for (const w of S?.workouts || []) {
    if (!w?.id || before.has(w.id) || isImported(w) || tooOld(w)) continue
    const draft = workoutDraft(w, unit, S)
    if (!draft) continue
    const h = fingerprint(draft), sent = sentW[w.id]
    if (sent?.h === h || failed[w.id] === h) continue
    workouts.push({ id: w.id, draft, h, hevyId: sent?.id || null })
  }
  for (const r of S?.routines || []) {
    if (!r?.id) continue
    const draft = routineDraft(r, unit)
    if (!draft) continue
    const h = fingerprint(draft)
    const last = sentR[r.id]?.h ?? base.routines?.[r.id]
    if (last === h || failed[r.id] === h) continue
    const hevyId = r.hevyId || sentR[r.id]?.id
    routines.push({ id: r.id, draft, h, hevyId: hevyId ? String(hevyId) : null })
  }
  // Oldest first, as they were done.
  workouts.sort((a, b) => (a.draft.start_time < b.draft.start_time ? -1 : 1))
  return { workouts, routines }
}

/* --------------------------------------------------------------------------- templates -- */

const norm = s => String(s || '').toLowerCase().replace(/\(brand:[^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()

/**
 * The Hevy template for each openGym exercise, from the account's templates (`/v1/exercise_templates`):
 * the user's own pick, one of the exercise's other names (D103), D29's fix table, an imported custom exercise's own template,
 * upstream's map read backwards, then a template of the same title. Returns exId → { id, type } | null.
 */
export function templateFinder(templates, S) {
  const all = (templates || []).filter(t => t?.id != null)
  const found = new Map()
  const put = (exId, t) => { if (exId && !found.has(exId)) found.set(exId, { id: String(t.id), type: t.type || null }) }
  // Keyed as the import keys a title, your own brands cut off it the same way.
  const own = choicesFor(S)
  // A template whose title carries a brand ("Leg Press (Machine) (brand: LifeFitness)", and a
  // cable's setup, "(x2)") is that exercise with that label, found as the import finds it, and is
  // used only for an exercise logged with that brand and setup.
  const branded = new Map()
  const list = all.filter(t => {
    const { brand, cable } = titleLabel(t.title, 'Hevy', own)
    if (!brand) return true
    const { id } = outcomeOf(t.title, 'Hevy', own)
    // A one-limb title ("Single Leg Press") is its exercise logged per side (D29), a label of its own.
    const side = !!readKey(matchTitle(t.title, 'Hevy', own))?.side
    const k = id && brandKey(canonicalExId(id), brand, cable === '1:1' ? '' : cable, side)
    if (k && !branded.has(k)) branded.set(k, { id: String(t.id), type: t.type || null })
    return false
  })
  for (const t of list) { const v = pickFor(own.aliases, titleName(t.title, 'Hevy', own), own.customEx); if (v) put(canonicalExId(v), t) }
  for (const t of list) {
    // The fix table, else upstream's Hevy title map (since 1.4.3 it holds what the table had); a
    // custom template named like a built-in is left to the id pass below, built-ins first.
    const f = FIXES[String(t.title || '').toLowerCase().trim()] || (!t.is_custom && matchHevyTitle(t.title))
    if (f) put(canonicalExId(typeof f === 'string' ? f : f.id), t)
  }
  for (const t of list) put(importId('im', 'Hevy|' + t.id), t)
  // Built-in templates before custom ones: a custom copy of a catalogue lift is the user's own.
  for (const t of [...list].sort((a, b) => Number(!!a.is_custom) - Number(!!b.is_custom))) {
    const id = canonicalExId(HEVY_ID_MAP[t.id])
    if (id && EXIDX[id]) put(id, t)
  }
  const byTitle = new Map()
  for (const t of list) if (!byTitle.has(norm(t.title))) byTitle.set(norm(t.title), t)
  const exs = new Map(allExercises(S || {}).map(e => [e.id, e]))
  return (exId, brand, cable, side) => {
    const k = brand && brandKey(exId, brand, cable, side)
    if (k && branded.has(k)) return branded.get(k)
    if (found.has(exId)) return found.get(exId)
    const t = byTitle.get(norm(exs.get(exId)?.n))
    return t ? { id: String(t.id), type: t.type || null } : null
  }
}

// openGym equipment → Hevy's equipment_category.
const EQUIPMENT = {
  barbell: 'barbell', 'ez barbell': 'barbell', 'olympic barbell': 'barbell', 'trap bar': 'barbell',
  dumbbell: 'dumbbell', kettlebell: 'kettlebell',
  cable: 'machine', 'leverage machine': 'machine', 'smith machine': 'machine', 'sled machine': 'machine',
  assisted: 'machine', 'stationary bike': 'machine', 'elliptical machine': 'machine', 'skierg machine': 'machine',
  'stepmill machine': 'machine', 'upper body ergometer': 'machine',
  'weight plate': 'plate', band: 'resistance_band', 'resistance band': 'resistance_band',
  'suspension trainer': 'suspension', 'body weight': 'none', weighted: 'none',
}
// The catalogue's target muscles and the muscle map's (custom exercises) → Hevy's muscle groups.
const MUSCLE = {
  quads: 'quadriceps', quadriceps: 'quadriceps', hamstrings: 'hamstrings', hamstring: 'hamstrings',
  glutes: 'glutes', gluteal: 'glutes', calves: 'calves', adductors: 'adductors', abductors: 'abductors',
  abs: 'abdominals', core: 'abdominals', obliques: 'abdominals', 'serratus anterior': 'chest',
  pectorals: 'chest', chest: 'chest', delts: 'shoulders', deltoids: 'shoulders', shoulders: 'shoulders',
  'front delts': 'shoulders', 'side delts': 'shoulders', 'rear delts': 'shoulders',
  'front-delts': 'shoulders', 'side-delts': 'shoulders', 'rear-delts': 'shoulders',
  biceps: 'biceps', triceps: 'triceps', forearms: 'forearms', forearm: 'forearms',
  lats: 'lats', 'upper back': 'upper_back', 'upper-back': 'upper_back', traps: 'traps', trapezius: 'traps',
  spine: 'lower_back', 'lower back': 'lower_back', 'lower-back': 'lower_back',
  'levator scapulae': 'neck', neck: 'neck', 'cardiovascular system': 'cardio',
}
const muscle = m => (Object.hasOwn(MUSCLE, String(m || '').toLowerCase()) ? MUSCLE[String(m).toLowerCase()] : null)
const titleCase = s => String(s || '').replace(/\s+/g, ' ').trim().replace(/(^|[\s(/-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase())

/**
 * The custom template to create for an exercise Hevy has none of: its name, equipment, muscles
 * and Hevy's exercise type, read from the exercise and from how the draft logged it (`sets`).
 */
export function newTemplate(ex, sets = []) {
  const primary = muscle(ex?.primaries?.[0]) || muscle(ex?.tg) || (isCardio(ex) ? 'cardio' : 'other')
  const others = [...new Set([...(ex?.secondaries || []), ...(ex?.sm || [])].map(muscle).filter(m => m && m !== primary))]
  const timed = sets.some(s => s.duration_seconds != null && s.reps == null)
  const weighted = sets.some(s => s.weight_kg > 0)
  const type = isCardio(ex) || sets.some(s => s.distance_meters != null) ? 'distance_duration'
    : timed ? (weighted ? 'weight_duration' : 'duration')
      : isAssisted(ex) ? 'bodyweight_assisted_reps'
        : isBodyweightEq(ex) ? 'bodyweight_reps'
          : 'weight_reps'
  return {
    title: titleCase(ex?.n || 'Exercise').slice(0, 100),
    exercise_type: type,
    equipment_category: EQUIPMENT[ex?.eq] || 'other',
    muscle_group: primary,
    other_muscles: others,
  }
}

// The set fields each Hevy exercise type takes. A type not listed keeps them all.
const FIELDS = {
  weight_reps: ['weight_kg', 'reps', 'rep_range'], reps_only: ['reps', 'rep_range'],
  bodyweight_reps: ['weight_kg', 'reps', 'rep_range'], bodyweight_assisted_reps: ['weight_kg', 'reps', 'rep_range'],
  duration: ['duration_seconds'], weight_duration: ['weight_kg', 'duration_seconds'],
  distance_duration: ['distance_meters', 'duration_seconds'], short_distance_weight: ['distance_meters', 'weight_kg'],
}
const MEASURES = ['weight_kg', 'reps', 'rep_range', 'distance_meters', 'duration_seconds']

/** A draft with each `ex` replaced by its template (`tplOf(exId, brand, cable, side)` → { id, type }), as Hevy takes it. */
export function finish(draft, tplOf) {
  const { folder, ...body } = draft
  body.exercises = draft.exercises.map(({ ex, brand, cable, side, ...e }) => {
    const tpl = tplOf(ex, brand, cable, side)
    const keep = FIELDS[tpl?.type]
    const sets = e.sets.map(s => {
      const out = { ...s }
      if (keep) for (const f of MEASURES) if (!keep.includes(f) && f in out) out[f] = f === 'rep_range' ? undefined : null
      if (!keep || keep.includes('reps')) { if (out.rep_range) out.reps = null } else delete out.rpe
      return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined))
    })
    return { exercise_template_id: tpl.id, ...e, sets }
  })
  return body
}

/** The key a draft's exercise keeps its template under: the exercise, and its brand and setup when it has one. */
export const brandKey = (exId, brand, cable, side) =>
  (brand ? exId + '|' + brandNorm(brand) + (cable ? '|' + cable : '') + (side ? '|side' : '') : exId)
export const tplKey = e => brandKey(e.ex, e.brand, e.cable, e.side)
/** The exercise ids a draft needs templates for. */
export const exercisesOf = draft => [...new Set((draft?.exercises || []).map(e => e.ex))]
/** The branded exercises a draft logs: { key, ex, brand, cable, side }, one per key. */
export const brandsOf = draft => [...new Map((draft?.exercises || []).filter(e => e.brand).map(e => [tplKey(e), { key: tplKey(e), ex: e.ex, brand: e.brand, cable: e.cable, side: e.side }])).values()]
/** The rows a draft logs for one exercise, for `newTemplate`'s type. */
export const setsOf = (draft, exId) => (draft?.exercises || []).filter(e => e.ex === exId).flatMap(e => e.sets)
