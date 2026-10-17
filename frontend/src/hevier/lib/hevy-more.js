// What else the Hevy API import brings (hevier/DECISIONS.md D31, seam S21): body measurements, a
// routine exercise's rest and rep range, a workout's description and exercise notes, the routine a
// workout was done from, a custom exercise's muscles and equipment, and Hevy's weight unit. The
// parse calls `day`, `exercise`, `workout` and `routineExercise` while it reads; the sheet calls
// `fetched` after upstream's fetch and `merged` after upstream's merge.
import { HEVY_API } from '../../lib/import-hevy.js'
import { importId } from '../../lib/import-csv.js'
import { normalizeRepRange } from '../../lib/rep-range.js'
import { normalizeMeasurementEntry, DEFAULT_MEASUREMENT_KEYS } from '../../lib/measurements.js'
import { stampWorkout } from '../../lib/sync-merge.js'

const NOTE_MAX = 280
const LINK_MS = 2 * 60000      // an earlier import's workout starting this close to a Hevy one is that one
const text = v => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '')
const pos = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null }

/* ------------------------------------------------------------------ workouts (the parse) -- */

/** A Hevy workout read into the parse's `day`: its description and routine id. */
export function day(d, w) {
  const hv = d.hv || (d.hv = { note: '', routine: null, notes: new Map() })
  if (!hv.note) hv.note = text(w?.description)
  if (hv.routine == null && w?.routine_id != null && w.routine_id !== '') hv.routine = String(w.routine_id)
}

/** A Hevy exercise of that workout, resolved to `id`: its notes. */
export function exercise(d, id, ex) {
  const n = text(ex?.notes)
  if (!n || !d.hv) return
  d.hv.notes.set(id, [...(d.hv.notes.get(id) || []), n])
}

/** The parse's finished workout: the note, the entries' notes and the Hevy routine id. */
export function workout(w, d) {
  const hv = d?.hv
  if (!hv) return
  if (hv.note && !w.note) w.note = hv.note
  if (hv.routine) w.hvHevyRoutine = hv.routine
  for (const e of w.entries) {
    const n = (hv.notes.get(e.id) || []).join(' · ').slice(0, NOTE_MAX)
    if (n && !e.note) e.note = n
  }
}

/* ------------------------------------------------------------------ routines (the parse) -- */

/** A routine exercise's config from its Hevy exercise: the rest and the rep range. */
export function routineExercise(cfg, he) {
  const rest = pos(he?.rest_seconds)
  if (rest) cfg.restSec = Math.round(rest)
  if (cfg.mode !== 'reps') return
  const work = (he.sets || []).filter(s => !/warm/i.test(String(s?.type || '')))
  const range = work.map(s => s?.rep_range).find(r => r && pos(r.start) && pos(r.end))
  if (!range) return
  const lo = Math.round(Math.min(range.start, range.end)), hi = Math.round(Math.max(range.start, range.end))
  if (lo === hi) { cfg.reps = hi; return }
  Object.assign(cfg, normalizeRepRange(hi, lo), { prog: 'double' })
}

/* ------------------------------------------------------------------------ measurements -- */

// Hevy's field → openGym's (lib/measurements.js, cm). Hevy's unsuffixed fields are cm too.
const MEASURE = {
  neck_cm: 'neck', shoulder_cm: 'shoulders', chest_cm: 'chest',
  left_bicep_cm: 'upperArmLeft', right_bicep_cm: 'upperArmRight',
  left_forearm_cm: 'forearmLeft', right_forearm_cm: 'forearmRight',
  abdomen: 'abdomen', waist: 'waist', hips: 'hips',
  left_thigh: 'thighLeft', right_thigh: 'thighRight', left_calf: 'calfLeft', right_calf: 'calfRight',
  fat_percent: 'bodyFat',
}

/** Hevy's body measurements → openGym's entries (one a day, the later row's values first), sorted. */
export function parseMeasures(list) {
  const byDay = new Map()
  for (const m of list || []) {
    const d = String(m?.date || '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue
    const e = byDay.get(d) || { d, t: new Date(d + 'T12:00:00').getTime() }
    for (const [from, to] of Object.entries(MEASURE)) {
      const v = pos(m[from])
      if (v != null && !(to === 'bodyFat' && v > 100)) e[to] = Math.round(v * 10) / 10
    }
    byDay.set(d, e)
  }
  return [...byDay.values()].filter(e => Object.values(MEASURE).some(k => e[k] != null)).sort((a, b) => (a.d < b.d ? -1 : 1))
}

/** The measured days `S` doesn't have yet. */
export const freshMeasures = (S, entries) => {
  const have = new Set((S?.measurements || []).map(e => e?.d))
  return (entries || []).filter(e => !have.has(e.d))
}

function mergeMeasures(S, entries) {
  const fresh = freshMeasures(S, entries)
  if (!fresh.length) return 0
  const custom = S.customMeasurements || []
  S.measurements = [...(S.measurements || []), ...fresh.map(e => normalizeMeasurementEntry(e, custom))]
    .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))
  const used = Object.values(MEASURE).filter(k => fresh.some(e => e[k] != null))
  const on = Array.isArray(S.measurementEnabled) ? S.measurementEnabled : DEFAULT_MEASUREMENT_KEYS
  if (used.some(k => !on.includes(k))) S.measurementEnabled = [...on, ...used.filter(k => !on.includes(k))]
  return fresh.length
}

/* ---------------------------------------------------------------------- custom exercises -- */

// Hevy's muscle groups → openGym's muscle map (lib/muscles.js MUSCLES). The rest isn't drawable.
const MUSCLE = {
  abdominals: 'abs', shoulders: 'deltoids', biceps: 'biceps', triceps: 'triceps', forearms: 'forearm',
  quadriceps: 'quadriceps', hamstrings: 'hamstring', calves: 'calves', glutes: 'gluteal',
  abductors: 'gluteal', adductors: 'adductors', lats: 'upper-back', upper_back: 'upper-back',
  traps: 'trapezius', lower_back: 'lower-back', chest: 'chest',
}
const EQUIPMENT = {
  none: 'body weight', barbell: 'barbell', dumbbell: 'dumbbell', kettlebell: 'kettlebell',
  machine: 'leverage machine', plate: 'weight plate', resistance_band: 'resistance band', suspension: 'suspension trainer',
}
const muscleOf = g => (Object.hasOwn(MUSCLE, g) ? MUSCLE[g] : null)

/** What a Hevy template says about its exercise: { eq, primaries, secondaries }, each possibly empty. */
export function templateInfo(t) {
  const title = String(t?.title || '')
  let eq = Object.hasOwn(EQUIPMENT, t?.equipment) ? EQUIPMENT[t.equipment] : null
  if (t?.equipment === 'machine' && /\bcable\b/i.test(title)) eq = 'cable'
  if (t?.equipment === 'machine' && /\bsmith\b/i.test(title)) eq = 'smith machine'
  const primaries = [muscleOf(t?.primary_muscle_group)].filter(Boolean)
  const secondaries = [...new Set((t?.secondary_muscle_groups || []).map(muscleOf).filter(m => m && !primaries.includes(m)))]
  return { eq, primaries, secondaries }
}

// An imported custom exercise nobody has filled in: upstream's import makes it without muscles,
// and the custom-exercise form always stores some.
const untouched = c => c && c.custom && (c.eq === 'custom' || !c.eq) && !c.tg && !(c.primaries?.length) && !(c.sm?.length)

function fillCustoms(S, templates) {
  let n = 0
  const byId = new Map((S.customEx || []).map(c => [c?.id, c]))
  for (const t of templates || []) {
    const c = byId.get(importId('im', 'Hevy|' + t.id))
    if (!untouched(c)) continue
    const { eq, primaries, secondaries } = templateInfo(t)
    if (!eq && !primaries.length) continue
    if (eq) c.eq = eq
    if (primaries.length) {
      Object.assign(c, { tg: primaries[0], primaries, secondaries, sm: secondaries, muscleGroups: [...primaries, ...secondaries] })
    }
    n++
  }
  return n
}

/* ------------------------------------------------------------------------ routine links -- */

/**
 * Gives each Hevy workout's routine to the workout already here that is the same session (same
 * day, a start within two minutes, no routine), then links every workout that has a Hevy routine
 * and no routine to the openGym routine with that Hevy id. Mutates `S`; returns how many it linked.
 */
export function linkRoutines(S, parsedWorkouts, now = Date.now()) {
  const list = S.workouts || []
  const touched = new Set()
  for (const p of parsedWorkouts || []) {
    if (!p?.hvHevyRoutine) continue
    for (const w of list) {
      if (w.d !== p.d || w.routineId || w.hvHevyRoutine || !(Math.abs((w.start || 0) - (p.start || 0)) <= LINK_MS)) continue
      w.hvHevyRoutine = p.hvHevyRoutine
      touched.add(w)
    }
  }
  const byHevy = new Map((S.routines || []).filter(r => r?.hevyId).map(r => [String(r.hevyId), r.id]))
  let linked = 0
  for (const w of list) {
    if (!w?.hvHevyRoutine || w.routineId) continue
    const rid = byHevy.get(String(w.hvHevyRoutine))
    if (!rid) continue
    w.routineId = rid
    touched.add(w)
    linked++
  }
  for (const w of touched) stampWorkout(w, now)
  return linked
}

/** How many workouts `linkRoutines` would link, without changing `S`. */
export function linkable(S, parsedWorkouts) {
  const copy = { workouts: (S?.workouts || []).map(w => ({ ...w })), routines: S?.routines || [] }
  return linkRoutines(copy, parsedWorkouts)
}

/* ------------------------------------------------------------------------- the sheet -- */

/** Hevy's weight unit ('kg' | 'lb'), or null when it can't be read. */
export async function fetchUnit(key, get = fetch) {
  try {
    const res = await get(new URL('/v1/user/info', HEVY_API), { headers: { 'api-key': key } })
    if (!res.ok) return null
    const u = (await res.json())?.data?.weight_unit
    return u === 'lbs' ? 'lb' : u === 'kg' ? 'kg' : null
  } catch { return null }
}

/**
 * After upstream's fetch and parse: the measurements and the templates upstream kept for the fork
 * (`hvRaw`, S21) become `data.hvMeasures` and `data.hvTemplates`, and Hevy's unit `data.hvUnit`.
 */
export async function fetched(key, data, get) {
  const raw = data.hvRaw || {}
  delete data.hvRaw
  data.hvMeasures = parseMeasures(raw.bodyMeasurements)
  data.hvTemplates = (raw.templates || []).filter(t => t?.id != null)
    .map(({ id, title, equipment, primary_muscle_group, secondary_muscle_groups }) => ({ id, title, equipment, primary_muscle_group, secondary_muscle_groups }))
  data.hvUnit = await fetchUnit(key, get)
  // for D33's review, which reads the import again once a match is changed
  if (raw.workouts || raw.routines) data.hvSource = { workouts: raw.workouts || [], routines: raw.routines || [], templates: raw.templates || [] }
}

/** Whether the sheet has something new to import besides upstream's three. */
export const hasMore = (S, data, wantMeasures) =>
  (wantMeasures && freshMeasures(S, data?.hvMeasures).length > 0) || linkable(S, data?.workouts?.workouts) > 0

/**
 * After upstream's merge, in the same store update: the measurements (when switched on), the
 * custom exercises' muscles and equipment, and the routine links. Returns { measures, linked }.
 */
export function merged(S, data, { measures: wantMeasures = true } = {}, now = Date.now()) {
  const measures = wantMeasures ? mergeMeasures(S, data?.hvMeasures) : 0
  fillCustoms(S, data?.hvTemplates)
  const linked = linkRoutines(S, data?.workouts?.workouts, now)
  return { measures, linked }
}
