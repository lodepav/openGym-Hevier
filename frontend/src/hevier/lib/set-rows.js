// The row edits of the Hevy workout block (components/HevyExerciseBlock.jsx), pure: each takes a
// set row, or an exercise's sets, and returns the new one. They are upstream's own edits
// (views/Workout.jsx ExerciseBlock) over the same lib helpers, so a drop, a burst or one side of a
// per-side set changes exactly as it does in upstream's layouts.
import { cascadeWeight, setSpanAt } from '../../lib/history.js'
import {
  isFailureSet, toggleFailure, dropsOf, clustersOf, addDrop, addCluster, removeDropAt, removeClusterAt,
  setDropAt, setClusterAt, nextDropWeight, nextBurstReps, isSideSet, setSideField, addSideDrop,
  removeSideDropAt, setSideDropAt, addSideCluster, removeSideClusterAt, setSideClusterAt, WEIGHT_ORIGIN_MANUAL,
} from '../../lib/workout-model.js'

/** One more drop, lighter than the last by the drop-set's percentage, on a weight `grid` can load. */
export function withDrop(row, { pct, grid } = {}) {
  if (isSideSet(row)) return addSideDrop(row, pct, grid)
  const drops = dropsOf(row)
  const base = drops.length ? drops[drops.length - 1].w : (row.w || 0)
  return addDrop(row, { w: nextDropWeight(base, pct, grid), r: row.r })
}

export const withoutDrop = (row, di) => (isSideSet(row) ? removeSideDropAt(row, di) : removeDropAt(row, di))

/** One field of drop `di`, of one side's drops when `side` is given. */
export const withDropField = (row, di, field, v, side) =>
  (side ? setSideDropAt(row, side, di, { [field]: v }) : setDropAt(row, di, { [field]: v }))

// A rest-pause row's own reps are the total across every burst (history.js applyIntensifierPlan):
// the bursts are the breakdown of that total, so adding, removing or editing one moves `r` by as much.

/** One more rest-pause burst after `restSec`; a per-side row gets one on each side. */
export function withBurst(row, restSec) {
  if (isSideSet(row)) return addSideCluster(row, restSec)
  const clusters = clustersOf(row)
  const added = nextBurstReps(clusters.length ? clusters[clusters.length - 1].r : (row.r || 0))
  return { ...addCluster(row, { r: added, restSec }), r: (row.r || 0) + added }
}

export function withoutBurst(row, ci) {
  if (isSideSet(row)) return removeSideClusterAt(row, ci)
  const removed = clustersOf(row)[ci]?.r || 0
  return { ...removeClusterAt(row, ci), r: Math.max(0, (row.r || 0) - removed) }
}

/** Burst `ci`'s reps, of one side's bursts when `side` is given. */
export function withBurstReps(row, ci, v, side) {
  if (side) return setSideClusterAt(row, side, ci, v)
  const delta = (Number(v) || 0) - (clustersOf(row)[ci]?.r || 0)
  return { ...setClusterAt(row, ci, { r: v }), r: Math.max(0, (row.r || 0) + delta) }
}

/** The failure mark on set `i`, on both rows of a timed per-side pair. */
export function withFailure(sets, i, on) {
  const out = sets.slice()
  const [start, count] = setSpanAt(sets, i)
  for (let j = start; j < start + count; j++) if (isFailureSet(out[j]) !== on) out[j] = toggleFailure(out[j])
  return out
}

/**
 * One side of a per-side row (upstream's setSide): the row's totals follow through the model
 * helper. A weight is marked as typed and carried down to the sets after it.
 */
export function withSideField(sets, i, side, field, v, backoffStep) {
  const out = sets.slice()
  out[i] = setSideField(sets[i], side, field, v)
  if (field !== 'w') return out
  out[i].sides[side].weightOrigin = WEIGHT_ORIGIN_MANUAL
  return cascadeWeight(out, i, v, side, backoffStep)
}
