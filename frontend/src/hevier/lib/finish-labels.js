// D28: upstream's finish keeps only the fields it knows, so the gym, brand and cable labels go on
// the saved record after it lands. The Finish sheet did that for its own Save; the watch's Finish
// and a forgotten workout's finish save without the sheet, so the labels are found here, for any path.
import { sameWorkout } from '../../lib/workout-date.js'
import { labelsAtFinish, withLabels } from './gym-labels.js'

const list = v => (Array.isArray(v) ? v : [])

/**
 * The labels for the workout a live session just became, between two copies of S:
 * { ref, labels }, or null when the session did not end in a new saved workout (a discard, an
 * edit of a saved one, a session still on) or its record already carries them.
 */
export function finishLabels(prev, next) {
  const A = prev?.active
  if (!A || A.editingWorkoutId || next?.active?.id === A.id) return null
  const ref = { id: A.id, d: A.d, start: A.start }
  if (list(prev.workouts).some(w => sameWorkout(w, ref))) return null
  const w = list(next?.workouts).find(x => sameWorkout(x, ref))
  if (!w) return null
  const labels = labelsAtFinish(prev, A)
  return JSON.stringify(withLabels(w, labels)) === JSON.stringify(w) ? null : { ref, labels }
}

/** `workouts` with the found labels written onto the workout they belong to. */
export const labelFinished = (workouts, { ref, labels }) => list(workouts).map(w => (sameWorkout(w, ref) ? withLabels(w, labels) : w))
