// A finished workout against the last time the same routine was done, for the line under Workout
// Detail's stats row. The numbers are the ones that row shows (D18): upstream's sessionVolume, the
// fork's work sets and the clock's minutes, so the line never disagrees with the row above it.
// Upstream's sessionInsights (lib/coach-insights.js) matches by name only and counts each side of a
// per-side set; this matches by routine first and counts sets the fork's way.
import { sessionVolume } from '../../lib/history.js'
import { t } from '../../lib/i18n.js'
import { sameWorkout } from '../../lib/workout-date.js'
import { workSets } from './volume.js'
import { hasClock } from './workout-when.js'

const idsOf = w => [].concat(w?.routineIds ?? (w?.routineId ? [w.routineId] : [])).filter(Boolean).map(String).sort().join('|')
const nameOf = w => String(w?.name || '').trim()

/** The same routine: the same routine ids when both have some, else the same name (imports).
 *  Not the name upstream gives a workout started without a routine: two of those share nothing. */
export function sameRoutine(a, b) {
  const ia = idsOf(a), ib = idsOf(b)
  if (ia && ib) return ia === ib
  return !!nameOf(a) && nameOf(a) !== t('Freestyle') && nameOf(a) === nameOf(b)
}

const minutesOf = w => (hasClock(w) ? Math.round((w.end - w.start) / 60000) : null)

// When a workout was done, to order two of them: its start, else its day at noon. The log is not
// read as sorted: an import or a workout logged into the past can sit out of order.
const whenOf = w => (Number.isFinite(Number(w?.start)) && Number(w.start) > 0 ? Number(w.start) : Date.parse((w?.d || '') + 'T12:00:00') || 0)

/**
 * `w` against the latest workout before it of the same routine: { prev, volume, sets, minutes },
 * each a signed change; `minutes` null when either has no clock. null when there is no such
 * workout.
 */
export function workoutCompare(S, w) {
  const all = S?.workouts || []
  if (!all.some(x => x && sameWorkout(x, w))) return null
  const at = whenOf(w)
  let prev = null
  for (const x of all) if (x && !sameWorkout(x, w) && whenOf(x) < at && sameRoutine(x, w) && (!prev || whenOf(x) > whenOf(prev))) prev = x
  if (!prev) return null
  const m = minutesOf(w), pm = minutesOf(prev)
  return {
    prev,
    volume: sessionVolume(w, S) - sessionVolume(prev, S),
    sets: workSets(w.entries) - workSets(prev.entries),
    minutes: m != null && pm != null ? m - pm : null,
  }
}
