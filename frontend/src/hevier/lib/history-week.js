// The History tab's three numbers for this week (hevier/DECISIONS.md D135): the workouts against
// the planned ones (upstream's weekTally, as Home's streak card counted them), the time trained,
// the work sets and the records among them (the feed cards' own counts).
import { weekTally } from '../../lib/queue.js'
import { weekKey, weekStartOf } from '../../lib/format.js'
import { hasClock } from './workout-when.js'
import { workSets } from './volume.js'
import { workoutRecords } from './records.js'

/** `{ done, planned, ms, sets, records }` for the week `today` is in. */
export function weekNumbers(S, today) {
  const ws = weekStartOf(S)
  const week = weekKey(today, ws)
  const list = (S.workouts || []).filter(w => weekKey(w.d, ws) === week)
  const { done, planned } = weekTally(S, today)
  return {
    done, planned,
    ms: list.reduce((n, w) => n + (hasClock(w) ? w.end - w.start : 0), 0),
    sets: list.reduce((n, w) => n + workSets(w.entries), 0),
    records: list.reduce((n, w) => n + workoutRecords(S, w).length, 0),
  }
}
