// What else the Hevy API import brings (hevier/DECISIONS.md D31, seam S21): body measurements, the
// routine a workout was done from, a custom exercise's muscles and equipment, and Hevy's weight
// unit. Notes, rest and rep ranges are upstream's own since 1.4.5 (from the fork's #815, D103). The
// parse calls `day` and `workout` while it reads; the sheet calls `fetched` after upstream's fetch
// and `merged` after upstream's merge.
import { HEVY_API } from '../../lib/import-hevy.js'
import { within } from './within.js'
import { importId } from '../../lib/import-csv.js'
import { normalizeMeasurementEntry, DEFAULT_MEASUREMENT_KEYS } from '../../lib/measurements.js'
import { stampWorkout } from '../../lib/sync-merge.js'
import { MUSCLE_MODEL } from '../../lib/muscles.js'
import { nameFolders } from './hevy-folders.js'

const LINK_MS = 2 * 60000      // an earlier import's workout starting this close to a Hevy one is that one
const pos = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null }

/* ------------------------------------------------------------------ workouts (the parse) -- */

/** A Hevy workout read into the parse's `day`: the routine it was done from. */
export function day(d, w) {
  if (d.hevyRoutine == null && w?.routine_id != null && w.routine_id !== '') d.hevyRoutine = String(w.routine_id)
}

/** The parse's finished workout: the Hevy routine id. */
export function workout(w, d) {
  if (d?.hevyRoutine) w.hvHevyRoutine = d.hevyRoutine
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
  abductors: 'gluteal', adductors: 'adductors', lats: 'lats', upper_back: 'upper-back',
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
      Object.assign(c, { tg: primaries[0], primaries, secondaries, sm: secondaries, muscleGroups: [...primaries, ...secondaries], mv: MUSCLE_MODEL })   // mv: named after 1.4.5's lats and upper back split
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
    // One session is one workout: the nearest one still without a routine, so two sessions a
    // minute apart each find their own.
    let best = null, gap = LINK_MS
    for (const w of list) {
      if (w.d !== p.d || w.routineId || w.hvHevyRoutine) continue
      const g = Math.abs((w.start || 0) - (p.start || 0))
      if (g <= gap && (!best || g < gap)) { best = w; gap = g }
    }
    if (best) { best.hvHevyRoutine = p.hvHevyRoutine; touched.add(best) }
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
    const res = await within(get(new URL('/v1/user/info', HEVY_API), { headers: { 'api-key': key } }), 20e3)
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
}

/**
 * Upstream's sheet reads what Hevy sent again when a choice changes (Check and choose): the fork's
 * steps after the fetch, on that second read, from what the first one kept. `importDone` is S19's.
 */
export function viewAgain(again, first, importDone) {
  again.workouts = importDone(again.workouts)
  again.routines = importDone(again.routines)
  if (first.hvFolders) nameFolders(again.routines, first.hvFolders)
  delete again.hvRaw
  for (const k of ['hvFolders', 'hvMeasures', 'hvTemplates', 'hvUnit']) if (k in first) again[k] = first[k]
  return again
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
