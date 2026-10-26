// Hevy's Profile chart (reference/SCREENS.md §5): one bar per week, as Duration, Volume or Reps,
// or in sets mode (DECISIONS.md D18) Sets instead of Volume. Derived from logged workouts only,
// over upstream's own readers, so nothing new is stored.
import { workoutDay, completedRepsOf } from '../../lib/history.js'
import { isoOf, weekKey } from '../../lib/format.js'
import { isWarmupRow } from '../../lib/workout-model.js'
import { workSets } from './volume.js'

export const SERIES = ['duration', 'volume', 'reps']

const durationOf = w => Math.max(0, (Number(w.end) || 0) - (Number(w.start) || 0))
const repsOf = w => (w.entries || []).reduce((n, e) =>
  n + (e.sets || []).reduce((m, s) => m + (isWarmupRow(s) ? 0 : completedRepsOf(s)), 0), 0)
const VALUE = { duration: durationOf, volume: (w, vol) => vol(w), sets: w => workSets(w.entries), reps: repsOf }

/** Whether workout `w` falls in the week that starts on `week` (a bar's `week`). */
export const inWeek = (w, week, weekStart) => { const day = workoutDay(w); return !!day && weekKey(day, weekStart) === week }

/** The last `weeks` weeks up to and including the one `today` is in, oldest first:
 *  `[{ week: 'YYYY-MM-DD' (its first day), value }]`. Duration is in ms, volume in the
 *  profile's unit (warm-ups as upstream's switch says, `vol`), sets a count of ticked work sets, reps a count
 *  of completed work reps. */
export function weeklySeries(workouts, kind, { today, weeks = 12, weekStart, vol = w => Number(w.vol) || 0 } = {}) {
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
    if (i !== undefined) out[i].value += value(w, vol)
  }
  return out
}

const HOUR = 3600000
/** The chart's top line, a round number at or above `max`: whole hours for a duration (at least
 *  one), else 1, 2 or 5 × a power of ten (at least 1), so the axis reads "2 h" or "5,000 kg". */
export function niceMax(max, kind) {
  const v = Math.max(0, Number(max) || 0)
  if (kind === 'duration') return Math.max(1, Math.ceil(v / HOUR)) * HOUR
  if (v <= 1) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  return [1, 2, 5, 10].map(k => k * p).find(n => n >= v)
}

/** Which bars carry a date under them: four, evenly spread, the newest always among them. */
export function labelledWeeks(n, count = 4) {
  if (n <= count) return Array.from({ length: n }, (_, i) => i)
  // One even step, counted back from this week, so the labelled bars are the same distance apart.
  const step = Math.floor((n - 1) / (count - 1))
  return Array.from({ length: count }, (_, i) => n - 1 - (count - 1 - i) * step)
}
