// Where Add Exercise puts its picks (hevier/DECISIONS.md D78): at the end of the workout, as
// Hevy's does, or after the current exercise, as upstream's does. Upstream's add inserts after the
// current exercise (`A.cur`, lib/supersetFlow.js insertionIndexAfterCurrentUnit). The Hevy list
// never moves `cur` as sets are ticked, so the exercise you are on is D71's: the one holding the
// next set (lib/next-set.js). The picker offers both while they differ; either button first makes
// the exercise it adds after the current one, so the picks follow it in the order picked (each
// pick then becomes the current one).
import { supersetUnits } from '../../lib/history.js'
import { insertionIndexAfterCurrentUnit } from '../../lib/supersetFlow.js'
import { nextSet } from './next-set.js'

/** The exercise you are on: the one holding the next set, else (every set done) upstream's `cur`. */
export const hereIdx = active => nextSet(active)?.idx ?? active?.cur ?? 0

/** Where upstream's add would put a pick after the exercise at `cur`. */
export const insertIndex = (active, cur = active?.cur) =>
  insertionIndexAfterCurrentUnit(supersetUnits(active?.entries || []), cur, active?.entries?.length || 0)

/** The entry Insert would put a pick after, when that is not the end; else null. */
export function insertAfter(active) {
  const n = active?.entries?.length || 0
  const at = insertIndex(active, hereIdx(active))
  return n > 0 && at < n ? active.entries[at - 1] || null : null
}

/** Makes the exercise the picks go after the current one: the last (`atEnd`) or the one you are
 *  on. A session with none is left as it is. */
export function placeAt(active, atEnd) {
  const n = active?.entries?.length || 0
  if (n > 0) active.cur = atEnd ? n - 1 : hereIdx(active)
}
