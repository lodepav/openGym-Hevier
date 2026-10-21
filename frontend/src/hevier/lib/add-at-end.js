// Where Add Exercise puts its picks (hevier/DECISIONS.md D78): at the end of the workout, as
// Hevy's does, or after the current exercise, as upstream's does. Upstream's add inserts after the
// current exercise (`A.cur`, lib/supersetFlow.js insertionIndexAfterCurrentUnit), which in a
// routine session is where you were last working, mid-list. The picker offers both while they
// differ; Add to end makes the last exercise the current one first, so every pick goes to the
// end in the order picked (each pick then becomes the current one).
import { supersetUnits } from '../../lib/history.js'
import { insertionIndexAfterCurrentUnit } from '../../lib/supersetFlow.js'

/** Where upstream's add would put a pick in `active`. */
export const insertIndex = active =>
  insertionIndexAfterCurrentUnit(supersetUnits(active?.entries || []), active?.cur, active?.entries?.length || 0)

/** The entry a pick would be inserted after, when that is not the end; else null. */
export function insertAfter(active) {
  const n = active?.entries?.length || 0
  const at = insertIndex(active)
  return n > 0 && at < n ? active.entries[at - 1] || null : null
}

/** Makes the session's last exercise its current one; a session with none is left as it is. */
export function toEnd(active) {
  const n = active?.entries?.length || 0
  if (n > 0) active.cur = n - 1
}
