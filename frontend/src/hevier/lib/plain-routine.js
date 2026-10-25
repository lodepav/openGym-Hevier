// A routine without progression (hevier/DECISIONS.md D69): Hevy's way. Each set of a routine
// session opens at what was done the last time that set was done (the PREVIOUS column, D3, D21),
// warm-ups too, and the routine's own numbers where it was never done; nothing is worked out:
// no progression rule, no warm-up ramp. A routine's "Progression & auto warm-ups" switch
// (`routine.hvProg`, a fork-only field upstream ignores) gives it upstream's way back.
import { isWarmupRow, isSideSet, syncSideAggregate, WEIGHT_ORIGIN_MANUAL } from '../../lib/workout-model.js'
import { modeOf } from '../../lib/history.js'
import { previousSetsFor, previousMode } from './previous-sets.js'
import { startLabelKey } from './gym-labels.js'
import { buildPlannedEntry } from '../../lib/session-start.js'
import { isHoldRow, toHold, toSideHold, isPairHead, isPairTail } from './hold-set.js'

/** Whether a routine keeps upstream's progression and warm-up ramp. Off unless switched on. */
export const progressionOn = routine => routine?.hvProg === true

/**
 * Whether an exercise of `routine` is built the plain way: a routine with its switch off. A
 * deload routine keeps upstream's own rule (its numbers, no prescription), and an exercise
 * outside a routine (freestyle) is upstream's, which already repeats what was done.
 */
export const isPlain = routine => !!routine && !progressionOn(routine) && routine.excludeFromProgression !== true

/**
 * The profile as the finish summary's "Last time and next time" reads it (D85): a routine without
 * progression counts as kept out of it, so upstream's finishCompare gives its lifts no "Next time"
 * (a forecast of the progression, which the routine does not run). Last time is unchanged.
 */
export function withoutForecast(S) {
  if (!(S?.routines || []).some(isPlain)) return S
  return { ...S, routines: S.routines.map(r => (isPlain(r) ? { ...r, excludeFromProgression: true } : r)) }
}

// A row filled from history is marked as a weight of its own, so an edit of the set above does not
// cascade onto it (upstream's cascadeWeight skips a manual weight), and `hvLast` so the workout
// still draws it grey until it is touched (D2).
/** Whether a set's weight (one side's, for `side`) was filled from last time and not yet touched. */
export const filledFromLast = (s, side) => (side ? String(s?.hvLast || '').includes(side) : !!s?.hvLast)
const own = row => ({ ...row, weightOrigin: WEIGHT_ORIGIN_MANUAL, hvLast: 1 })

/** Row `row` with last time's set `prev` (`mode` the exercise's), or a per-side set made a hold
 *  on each side, two rows (an L/R pair). */
export function fill(row, prev, mode) {
  if (mode === 'cardio') {
    if (!(prev.min > 0)) return row
    return { ...row, min: prev.min, ...(prev.speed != null ? { speed: prev.speed } : {}), ...(prev.incline != null ? { incline: prev.incline } : {}) }
  }
  if (mode === 'time') return prev.sec > 0 ? { ...row, sec: prev.sec, w: prev.w || 0 } : row
  if (isSideSet(row)) {
    // A hold last time (D89; a per-side one is an L/R pair, its R on `hvPairR`) opens as a hold on
    // each side again: two rows in place of this one.
    if (isHoldRow(prev)) {
      if (!(prev.sec > 0)) return row
      const R = prev.hvPairR || prev
      const [l, r] = toSideHold(row, prev.sec, R.sec)
      return [own({ ...l, w: prev.w || 0 }), own({ ...r, w: R.w || 0 })]
    }
    // A set last time logged as one row (a Hevy import's) held one side's reps (D75): both sides.
    if (!isSideSet(prev)) {
      if (!(prev.r > 0)) return row
      const side = k => ({ ...row.sides[k], w: prev.w || 0, r: prev.r, weightOrigin: WEIGHT_ORIGIN_MANUAL })
      return { ...syncSideAggregate({ ...row, sides: { L: side('L'), R: side('R') } }), hvLast: 'LR' }
    }
    // Upstream rebuilds a side from the fields it knows, so the sides' mark is on the row: 'LR'.
    const side = k => ({ ...row.sides[k], w: prev.sides[k].w || 0, r: prev.sides[k].r || 0, weightOrigin: WEIGHT_ORIGIN_MANUAL })
    return { ...syncSideAggregate({ ...row, sides: { L: side('L'), R: side('R') } }), hvLast: 'LR' }
  }
  // A hold last time in a reps exercise (D89) opens as that hold again.
  if (isHoldRow(prev) && !isSideSet(row)) return prev.sec > 0 ? own({ ...toHold(row, prev.sec), w: prev.w || 0 }) : row
  if (isSideSet(prev) || !(prev.r > 0)) return row
  return own({ ...row, w: prev.w || 0, r: prev.r })
}

/**
 * A plain routine's rows, from the rows upstream built at the routine's own numbers (`rows`):
 * each unticked row takes the previous set it lines up with. `H` is the history the session reads
 * (with the exercise's dumbbell meaning, as upstream builds from), `S` the profile (D21's mode).
 */
export function plainRows(H, S, cfg, routine, rows) {
  // D82: last time on the machine the session starts with (its brand, its cable setup).
  const prev = previousSetsFor(H, { id: cfg.id, rid: routine?.id, sets: rows }, previousMode(S), { label: startLabelKey(S, cfg.id) })
  const mode = modeOf(cfg)
  return rows.flatMap((row, i) => {
    const p = prev[i]
    if (!p || row.done) return [row]
    // A warm-up keeps its own phase mark, and a work set never takes a warm-up's numbers.
    if (isWarmupRow(row) !== isWarmupRow(p)) return [row]
    return fill(row, p, mode)
  })
}

// The numbers a row is filled with, for refillRows: what plainRows and upstream's build write.
// `mode` too: a hold from last time (D89) is no hold on a label whose last time was reps.
const NUMS = ['w', 'r', 'sec', 'min', 'speed', 'incline', 'sides', 'mode', 'weightOrigin', 'hvLast']
const VALS = ['w', 'r', 'sec', 'min', 'speed', 'incline']
const sameVals = (a, b) => VALS.every(k => (a?.[k] ?? null) === (b?.[k] ?? null))
const sameRow = (a, b) => sameVals(a, b) && ['L', 'R'].every(k => sameVals(a?.sides?.[k], b?.sides?.[k]))

/**
 * The session's exercise `e` refilled after its label changed from `was` to `label` (label keys,
 * D82: the gym, the brand or the cable setup). Each unticked row still showing what the build gave
 * it, the routine's own numbers or last time's on the old label, takes last time's set on the new
 * label, else the routine's numbers; a row typed into differs from both and keeps its values, and
 * so does a set added in the session, which has no routine numbers to go back to. `H` is the
 * session's history, `S` the profile. Returns the new rows, or null when the exercise is not a
 * plain routine's.
 */
export function refillRows(H, S, e, routine, label, was) {
  if (!e || !isPlain(routine)) return null
  const cfg = { ...(e.target || {}), id: e.id }
  const base = buildPlannedEntry(H, cfg, routine, { noProg: true }).sets
  const lookup = { ...e, rid: routine.id }
  const prevOn = l => previousSetsFor(H, lookup, previousMode(S), { label: l })
  const [prev, old] = [prevOn(label), prevOn(was)]
  const mode = modeOf(cfg)
  const filled = (start, p) => (p && isWarmupRow(p) === isWarmupRow(start) ? fill(start, p, mode) : start)
  // The build has one row a set; a per-side hold here is two (an L/R pair), so a row's set in the
  // build is its set number. A pair keeps what it has: it was made a hold in the session, or
  // opened as one from last time.
  const rows = e.sets || []
  let unit = -1
  return rows.flatMap((row, i) => {
    if (!isPairTail(rows, i)) unit++
    if (isPairHead(rows, i) || isPairTail(rows, i)) return [row]
    const b = base[unit]
    if (row.done || !b || isWarmupRow(b) !== isWarmupRow(row)) return [row]
    const start = { ...row }
    for (const k of NUMS) {
      if (b[k] !== undefined) start[k] = b[k]
      else delete start[k]
    }
    const before = filled(start, old[i])
    if (!sameRow(row, start) && (Array.isArray(before) || !sameRow(row, before))) return [row]
    return [filled(start, prev[i])].flat()
  })
}
