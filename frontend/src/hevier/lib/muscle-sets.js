// Hevy's Statistics page (reference/SCREENS.md §6): the last 7 days as a week strip and a body
// map, and the set count per muscle group for this week, month or year against the one before.
// Counted as Settings → Muscle sets says (D42, hevier/lib/volume.js muscleSets): each set for its
// main muscle, or with upstream's own load, a secondary muscle getting its share. The body map
// keeps upstream's load. Nothing is stored.
import { loadOfWorkouts } from '../../lib/muscles.js'
import { muscleSets } from './volume.js'
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
const entriesOf = ws => ws.flatMap(w => w.entries || [])

/** Set count per muscle in this period and the previous one, most-trained first, by `mode`
 *  ('main' or 'share', D42). Muscles with no sets in either are left out. */
export function muscleSetCounts(workouts, kind, { today, weekStart, mode = 'main' } = {}) {
  const now = periodOf(kind, today, { weekStart })
  const before = periodOf(kind, today, { weekStart, offset: -1 })
  const cur = muscleSets(entriesOf(within(workouts, now)), mode)
  const prev = new Map(muscleSets(entriesOf(within(workouts, before)), mode).map(r => [r.muscle, r.sets]))
  const rows = cur.map(r => ({ ...r, prev: prev.get(r.muscle) || 0 }))
  for (const [muscle, sets] of prev) if (!rows.some(r => r.muscle === muscle)) rows.push({ muscle, sets: 0, prev: sets })
  rows.sort((a, b) => b.sets - a.sets || b.prev - a.prev || a.muscle.localeCompare(b.muscle))
  return { ...now, rows }
}

/** The week's body map shades by sets in fixed steps (review T2): upstream's map scales to the
 *  busiest muscle, so a balanced week of six workouts painted nearly every muscle full. 1–3 sets
 *  in the week is the lightest, 4–7, 8–11, and 12 or more full, roughly the weekly volumes a
 *  muscle is trained with. Upstream's `thresholds` prop takes them; its map is not changed. */
export const WEEK_HEAT = [{ at: 0, level: 1, exclusive: true }, { at: 4, level: 2 }, { at: 8, level: 3 }, { at: 12, level: 4 }]

/** The last `days` days up to `today`, oldest first, each marked trained or not, with the
 *  muscle load of the workouts in them (for the body map). */
export function lastDays(workouts, today, days = 7) {
  const span = { from: plusDays(today, 1 - days), to: today }
  const ws = within(workouts, span)
  const trained = new Set(ws.map(workoutDay))
  const list = Array.from({ length: days }, (_, i) => plusDays(span.from, i)).map(d => ({ d, trained: trained.has(d) }))
  return { days: list, workouts: ws, load: loadOfWorkouts(ws) }
}
