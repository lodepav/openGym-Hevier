// Hevy's Statistics page (reference/SCREENS.md §6): the last 7 days as a week strip and a body
// map, and the set count per muscle group for this week, month or year against the one before.
// Counted with upstream's own load (lib/muscles.js loadOfWorkouts: ticked work sets, a secondary
// muscle getting its share), so the numbers match upstream's Muscle balance. Nothing is stored.
import { loadOfWorkouts, MUSCLES } from '../../lib/muscles.js'
import { workoutDay } from '../../lib/history.js'
import { isoOf, weekKey } from '../../lib/format.js'

export const PERIODS = ['week', 'month', 'year']

const at = iso => new Date(iso + 'T12:00:00')
const plusDays = (iso, n) => { const d = at(iso); d.setDate(d.getDate() + n); return isoOf(d) }

/** First and last day (ISO, inclusive) of the week, month or year `today` is in, or of the one
 *  `offset` periods before (offset -1) or after it. */
export function periodOf(kind, today, { weekStart, offset = 0 } = {}) {
  if (kind === 'week') {
    const from = plusDays(weekKey(today, weekStart), offset * 7)
    return { from, to: plusDays(from, 6) }
  }
  const d = at(today)
  if (kind === 'month') {
    const first = new Date(d.getFullYear(), d.getMonth() + offset, 1, 12)
    const last = new Date(d.getFullYear(), d.getMonth() + offset + 1, 0, 12)
    return { from: isoOf(first), to: isoOf(last) }
  }
  if (kind === 'year') {
    const y = d.getFullYear() + offset
    return { from: y + '-01-01', to: y + '-12-31' }
  }
  throw new Error('unknown period ' + kind)
}

const within = (workouts, { from, to }) => (workouts || []).filter(w => {
  const day = workoutDay(w)
  return day && day >= from && day <= to
})
const tenth = v => Math.round((v || 0) * 10) / 10

/** Set count per muscle in this period and the previous one, most-trained first. Muscles with
 *  no sets in either are left out. `sets` and `prev` are effective sets, to one decimal. */
export function muscleSetCounts(workouts, kind, { today, weekStart } = {}) {
  const now = periodOf(kind, today, { weekStart })
  const before = periodOf(kind, today, { weekStart, offset: -1 })
  const cur = loadOfWorkouts(within(workouts, now))
  const prev = loadOfWorkouts(within(workouts, before))
  const rows = MUSCLES
    .map(muscle => ({ muscle, sets: tenth(cur[muscle]), prev: tenth(prev[muscle]) }))
    .filter(r => r.sets > 0 || r.prev > 0)
    .sort((a, b) => b.sets - a.sets || b.prev - a.prev || MUSCLES.indexOf(a.muscle) - MUSCLES.indexOf(b.muscle))
  return { ...now, rows }
}

/** The last `days` days up to `today`, oldest first, each marked trained or not, with the
 *  muscle load of the workouts in them (for the body map). */
export function lastDays(workouts, today, days = 7) {
  const span = { from: plusDays(today, 1 - days), to: today }
  const ws = within(workouts, span)
  const trained = new Set(ws.map(workoutDay))
  const list = Array.from({ length: days }, (_, i) => plusDays(span.from, i)).map(d => ({ d, trained: trained.has(d) }))
  return { days: list, workouts: ws, load: loadOfWorkouts(ws) }
}

/** Sets per muscle in one workout (Workout Detail's muscle split), most first, to one decimal.
 *  Muscles the workout did not train are left out. */
export function workoutSplit(w) {
  return Object.entries(loadOfWorkouts([w]))
    .map(([muscle, sets]) => ({ muscle, sets: tenth(sets) }))
    .filter(r => r.sets > 0)
    .sort((a, b) => b.sets - a.sets || MUSCLES.indexOf(a.muscle) - MUSCLES.indexOf(b.muscle))
}
