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
import { importId } from '../../lib/import-csv.js'
import { isWarmupRow, isFailureSet, isSideSet, dropsOf, clustersOf } from '../../lib/workout-model.js'
import { isPerSide } from '../../lib/history.js'
import { routineRows } from './routine-table.js'
import { folderOf } from './routine-folders.js'
import { FIXES, choiceKey } from './hevy-import.js'

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
  // Hevy logs one side (D29): a per-side set goes as its harder side, its drops and bursts included.
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

/**
 * A finished workout as Hevy's workout body, with openGym exercise ids (`ex`) in place of the
 * templates: only ticked sets, the entries without one left out. Null when nothing is left.
 */
export function workoutDraft(w, unit = 'kg') {
  const entries = (w?.entries || []).filter(e => e?.id && (e.sets || []).some(done))
  if (!entries.length || !(Number(w.start) > 0)) return null
  const ss = supersets(entries)
  const start = Number(w.start)
  const end = Number(w.end) > start ? Number(w.end) : start
  return {
    title: text(w.name) || 'Workout',
    description: text(w.note) || null,
    start_time: new Date(start).toISOString(),
    end_time: new Date(end).toISOString(),
    exercises: entries.map((e, i) => ({
      ex: canonicalExId(e.id),
      superset_id: ss[i],
      notes: text(e.note) || null,
      sets: e.sets.filter(done).flatMap(s => setRows(s, unit, isCardio(e.id))),
    })),
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
  const workouts = [], routines = []
  for (const w of S?.workouts || []) {
    if (!w?.id || before.has(w.id) || isImported(w)) continue
    const draft = workoutDraft(w, unit)
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
 * the user's own review choice (D33), D29's fix table, an imported custom exercise's own template,
 * upstream's map read backwards, then a template of the same title. Returns exId → { id, type } | null.
 */
export function templateFinder(templates, S) {
  const list = (templates || []).filter(t => t?.id != null)
  const found = new Map()
  const put = (exId, t) => { if (exId && !found.has(exId)) found.set(exId, { id: String(t.id), type: t.type || null }) }
  const choices = S?.hvImportMap || {}
  for (const t of list) { const v = choices[choiceKey(t.title, 'Hevy')]; if (v && v !== 'custom') put(canonicalExId(v), t) }
  for (const t of list) {
    const f = FIXES[String(t.title || '').toLowerCase().trim()]
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
  return exId => {
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

/** A draft with each `ex` replaced by its template (`tplOf(exId)` → { id, type }), as Hevy takes it. */
export function finish(draft, tplOf) {
  const { folder, ...body } = draft
  body.exercises = draft.exercises.map(({ ex, ...e }) => {
    const tpl = tplOf(ex)
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

/** The exercise ids a draft needs templates for. */
export const exercisesOf = draft => [...new Set((draft?.exercises || []).map(e => e.ex))]
/** The rows a draft logs for one exercise, for `newTemplate`'s type. */
export const setsOf = (draft, exId) => (draft?.exercises || []).filter(e => e.ex === exId).flatMap(e => e.sets)
