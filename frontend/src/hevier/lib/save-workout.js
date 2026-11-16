// The Finish sheet's duration over openGym's finish (hevier/DECISIONS.md D132, D10). Upstream's
// doFinishWorkout saves the session exactly as it always does; a Duration changed on the sheet is
// applied to the saved record afterwards with the helper upstream's "Change duration" sheet uses
// (lib/workout-date.js). The sheet has no date or start time (D10), so the session keeps its own.
import { sessionEnd } from '../../lib/finish-workout.js'
import { backfillEnd } from '../../lib/backfill.js'
import { startTimeOf, durationMinOf, endsInFuture, setWorkoutDuration, MAX_DURATION_MIN } from '../../lib/workout-date.js'

export const TITLE_MAX = 60   // upstream's RenameWorkout

/** How long the session has run, in minutes (a workout logged into the past: its own length). */
export function sessionMin(A, now = Date.now()) {
  const end = A.backfill ? backfillEnd(A) : sessionEnd(A, now)
  return durationMinOf({ start: A.start, end })
}

/**
 * Why a duration typed on the sheet cannot be saved, as an upstream string to pass to t(), or null.
 * `min` is null while the duration was left alone: the session's own, which ends now.
 */
export function durationProblem(A, min, now = Date.now()) {
  if (min == null) return null
  if (!(min >= 1)) return 'Enter how long it took (at least 1 minute).'
  if (min > MAX_DURATION_MIN) return 'That’s more than a day. Keep it to 24 hours or less.'
  // A minute of slack: the start is kept to the minute and the length rounded to one.
  if (endsInFuture(A.d, startTimeOf(A), min, now - 60000)) return 'That’s still in the future. Try an earlier start.'
  return null
}

/** The history after the saved workout `ref` gets the sheet's Duration (none typed: unchanged). */
export const applyDuration = (workouts, ref, min, now = Date.now()) =>
  (min == null ? workouts : setWorkoutDuration(workouts, ref, min, now) || workouts)
