// Hevy's Save Workout page and "Nice work!" summary over openGym's finish (hevier/DECISIONS.md D10,
// reference/SCREENS.md §3). Upstream's doFinishWorkout saves the session exactly as it always does;
// a When or Duration changed on the page is applied to the saved record afterwards with the same
// helpers upstream's "Change date & time" and "Change duration" sheets use (lib/workout-date.js),
// so the PR badges are worked out again the way they are there.
import { sessionEnd } from '../../lib/finish-workout.js'
import { backfillEnd } from '../../lib/backfill.js'
import {
  startTimeOf, durationMinOf, endsInFuture, moveWorkout, setWorkoutDuration, sameWorkout, MAX_DURATION_MIN,
} from '../../lib/workout-date.js'

export const TITLE_MAX = 60   // upstream's RenameWorkout

/** What the page starts from: the session's day and start time, and how long it has run. */
export function whenOf(A, now = Date.now()) {
  const end = A.backfill ? backfillEnd(A) : sessionEnd(A, now)
  return { date: A.d, time: startTimeOf(A), min: durationMinOf({ start: A.start, end }) }
}

/**
 * Why the page's When and Duration cannot be saved, as an upstream string to pass to t(), or null.
 * `min` is null while the duration was left alone. Only a changed time is held against the clock:
 * an untouched one is the session's own, which ends now.
 */
export function whenProblem(base, when, today, now = Date.now()) {
  if (!when.date || when.date > today) return 'Pick a day up to today'
  if (when.min != null) {
    if (!(when.min >= 1)) return 'Enter how long it took (at least 1 minute).'
    if (when.min > MAX_DURATION_MIN) return 'That’s more than a day. Keep it to 24 hours or less.'
  }
  const moved = when.date !== base.date || when.time !== base.time
  // A minute of slack: the start is kept to the minute and the length rounded to one.
  if ((moved || when.min != null) && endsInFuture(when.date, when.time, when.min ?? base.min, now - 60000)) {
    return 'That’s still in the future. Try an earlier start.'
  }
  return null
}

/** The history after the saved workout `ref` gets the page's When and Duration. */
export function applyWhen(workouts, ref, base, when, now = Date.now()) {
  let list = workouts
  if (when.date !== base.date || when.time !== base.time) list = moveWorkout(list, ref, when.date, when.time, now) || list
  if (when.min != null) list = setWorkoutDuration(list, ref, when.min, now) || list
  return list
}

/** Which workout this is, counting from the first one in the history (1-based), or 0. */
export const workoutNumber = (workouts, ref) => (workouts || []).findIndex(w => sameWorkout(w, ref)) + 1

const dayMs = iso => { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, m - 1, d).getTime() }
/** How many workouts fall in the `days` days up to and including the day of `ref`. */
export function workoutsInDays(workouts, ref, days = 7) {
  const end = dayMs(ref.d)
  const from = end - (days - 1) * 86400000
  return (workouts || []).filter(w => { const t = dayMs(w.d); return t >= from - 3600000 && t <= end + 3600000 }).length
}
