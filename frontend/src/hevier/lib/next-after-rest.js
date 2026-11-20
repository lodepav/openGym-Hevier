// Settings → Workout → "Next exercise when the rest ends" in the fork's live workout (D107): once
// the rest after an exercise's last set runs out, the page brings the next exercise up. Which one
// is upstream's choice (lib/supersetFlow.js, #1017): the next unit with a set left to do, a
// superset after its last round.
import { advanceAfterTimedRest } from '../../lib/supersetFlow.js'
import { supersetUnits } from '../../lib/history.js'

/**
 * The exercise index to bring up when the rest after a set of exercise `forIdx` ends, or null:
 * the setting off, a set of that exercise (or its superset) still to do, or nothing left.
 * Like upstream, it goes round to an exercise skipped earlier once the ones after are done.
 */
export function nextAfterRest(entries, forIdx, on) {
  if (!on) return null
  // forIdx stands in for upstream's `cur`: on this page the set ticked is the one being worked on.
  return advanceAfterTimedRest(entries, supersetUnits(entries || []), forIdx, forIdx, () => true)
}
