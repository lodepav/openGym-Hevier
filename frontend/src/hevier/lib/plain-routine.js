// A routine without progression (hevier/DECISIONS.md D69): Hevy's way. Each set of a routine
// session opens at what was done the last time that set was done (the PREVIOUS column, D3, D21),
// warm-ups too, and the routine's own numbers where it was never done; nothing is worked out:
// no progression rule, no warm-up ramp. A routine's "Progression & auto warm-ups" switch
// (`routine.hvProg`, a fork-only field upstream ignores) gives it upstream's way back.
import { isWarmupRow, isSideSet, syncSideAggregate, WEIGHT_ORIGIN_MANUAL } from '../../lib/workout-model.js'
import { modeOf } from '../../lib/history.js'
import { previousSetsFor, previousMode } from './previous-sets.js'

/** Whether a routine keeps upstream's progression and warm-up ramp. Off unless switched on. */
export const progressionOn = routine => routine?.hvProg === true

/**
 * Whether an exercise of `routine` is built the plain way: a routine with its switch off. A
 * deload routine keeps upstream's own rule (its numbers, no prescription), and an exercise
 * outside a routine (freestyle) is upstream's, which already repeats what was done.
 */
export const isPlain = routine => !!routine && !progressionOn(routine) && routine.excludeFromProgression !== true

// A row filled from history is marked as a weight of its own, so an edit of the set above does not
// cascade onto it (upstream's cascadeWeight skips a manual weight), and `hvLast` so the workout
// still draws it grey until it is touched (D2).
/** Whether a set's weight (one side's, for `side`) was filled from last time and not yet touched. */
export const filledFromLast = (s, side) => (side ? String(s?.hvLast || '').includes(side) : !!s?.hvLast)
const own = row => ({ ...row, weightOrigin: WEIGHT_ORIGIN_MANUAL, hvLast: 1 })

function fill(row, prev, mode) {
  if (mode === 'cardio') {
    if (!(prev.min > 0)) return row
    return { ...row, min: prev.min, ...(prev.speed != null ? { speed: prev.speed } : {}), ...(prev.incline != null ? { incline: prev.incline } : {}) }
  }
  if (mode === 'time') return prev.sec > 0 ? { ...row, sec: prev.sec, w: prev.w || 0 } : row
  if (isSideSet(row)) {
    if (!isSideSet(prev)) return row
    // Upstream rebuilds a side from the fields it knows, so the sides' mark is on the row: 'LR'.
    const side = k => ({ ...row.sides[k], w: prev.sides[k].w || 0, r: prev.sides[k].r || 0, weightOrigin: WEIGHT_ORIGIN_MANUAL })
    return { ...syncSideAggregate({ ...row, sides: { L: side('L'), R: side('R') } }), hvLast: 'LR' }
  }
  if (isSideSet(prev) || !(prev.r > 0)) return row
  return own({ ...row, w: prev.w || 0, r: prev.r })
}

/**
 * A plain routine's rows, from the rows upstream built at the routine's own numbers (`rows`):
 * each unticked row takes the previous set it lines up with. `H` is the history the session reads
 * (with the exercise's dumbbell meaning, as upstream builds from), `S` the profile (D21's mode).
 */
export function plainRows(H, S, cfg, routine, rows) {
  const prev = previousSetsFor(H, { id: cfg.id, rid: routine?.id, sets: rows }, previousMode(S))
  const mode = modeOf(cfg)
  return rows.map((row, i) => {
    const p = prev[i]
    if (!p || row.done) return row
    // A warm-up keeps its own phase mark, and a work set never takes a warm-up's numbers.
    if (isWarmupRow(row) !== isWarmupRow(p)) return row
    return fill(row, p, mode)
  })
}
