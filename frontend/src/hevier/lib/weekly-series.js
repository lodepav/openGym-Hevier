// Hevy's Profile chart (reference/SCREENS.md §5): one bar per week, as Duration, Volume or Reps.
// Derived from logged workouts only, over upstream's own readers, so nothing new is stored.
import { workoutDay, completedRepsOf } from '../../lib/history.js'
import { isoOf, weekKey } from '../../lib/format.js'
import { isWarmupRow } from '../../lib/workout-model.js'

export const SERIES = ['duration', 'volume', 'reps']

const durationOf = w => Math.max(0, (Number(w.end) || 0) - (Number(w.start) || 0))
const repsOf = w => (w.entries || []).reduce((n, e) =>
  n + (e.sets || []).reduce((m, s) => m + (isWarmupRow(s) ? 0 : completedRepsOf(s)), 0), 0)
const VALUE = { duration: durationOf, volume: w => Number(w.vol) || 0, reps: repsOf }

/** The last `weeks` weeks up to and including the one `today` is in, oldest first:
 *  `[{ week: 'YYYY-MM-DD' (its first day), value }]`. Duration is in ms, volume in the
 *  profile's unit (as stored on each workout), reps a count of completed work reps. */
export function weeklySeries(workouts, kind, { today, weeks = 12, weekStart } = {}) {
  const value = VALUE[kind]
  if (!value) throw new Error('unknown series ' + kind)
  const last = new Date(weekKey(today, weekStart) + 'T12:00:00')
  const out = []
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(last)
    d.setDate(last.getDate() - i * 7)
    out.push({ week: isoOf(d), value: 0 })
  }
  const at = new Map(out.map((p, i) => [p.week, i]))
  for (const w of workouts || []) {
    const day = workoutDay(w)
    if (!day) continue
    const i = at.get(weekKey(day, weekStart))
    if (i !== undefined) out[i].value += value(w)
  }
  return out
}
