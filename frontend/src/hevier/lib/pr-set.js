// Hevy puts a saved workout's record on the set that made it (reference/SCREENS.md §4). openGym's
// record is upstream's: an exercise in `w.prs` beat its heaviest weight (sheets.jsx doFinishWorkout,
// the heaviest ticked working set, or on an assistance machine the least help). This finds that set,
// in a saved workout and, live, in the running one (D22).
import { betterWeight, beatsWeight } from '../../lib/exercises.js'
import { bestWeightFor } from '../../lib/history.js'
import { entryDbLoad } from '../../lib/dumbbells.js'
import { isWarmupRow } from '../../lib/workout-model.js'

/** The index in `e.sets` of the set that made the exercise's record in workout `w`, else -1:
 *  the first ticked working set at the session's best weight. */
export function prSetIndex(w, e) {
  if (!w?.prs?.includes(e?.id)) return -1
  const work = (e.sets || []).map((s, i) => ({ s, i })).filter(({ s }) => s.done && !isWarmupRow(s) && s.w > 0)
  if (!work.length) return -1
  const best = work.map(({ s }) => s.w).reduce((a, b) => betterWeight(e.id, a, b))
  return work.find(({ s }) => s.w === best).i
}

/** The weight a live set must beat to be a record: the exercise's heaviest in the log, read the way
 *  the session logs a dumbbell. A scan of the whole log, so the workout screen keeps it until a
 *  workout is saved and passes it to livePrSetIndex. */
export const recordWeight = (S, entry) => (entry ? bestWeightFor(S, entry.id, entryDbLoad(entry)) : 0)

/** The live version (DECISIONS.md D22): the index in `entry.sets` of the running session's record
 *  set, else -1. Upstream's finish rule (sheets.jsx doFinishWorkout) on the sets ticked so far, so
 *  it is the set prSetIndex marks once the workout is saved. None in a workout logged into the past. */
export function livePrSetIndex(S, entry, record = recordWeight(S, entry)) {
  if (!S?.active || S.active.backfill || !entry) return -1
  const loads = (entry.sets || []).filter(s => s.done && !isWarmupRow(s)).map(s => s.w).filter(w => w > 0)
  if (!loads.length) return -1
  const mx = loads.reduce((a, b) => betterWeight(entry.id, a, b))
  if (!beatsWeight(entry.id, mx, record)) return -1
  return prSetIndex({ prs: [entry.id] }, entry)
}
