// Hevy puts a saved workout's record on the set that made it (reference/SCREENS.md §4). openGym's
// record is upstream's: an exercise in `w.prs` beat its heaviest weight (sheets.jsx doFinishWorkout,
// the heaviest ticked working set, or on an assistance machine the least help). This finds that set.
import { betterWeight } from '../../lib/exercises.js'
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
