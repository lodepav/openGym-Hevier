// Hevy's Calendar page (reference/SCREENS.md §11): month grids with the trained days filled, and
// the "week streak · rest days" line. A day's mark follows upstream's Calendar (sheets.jsx): a
// trained day, else a day note, else a rescheduled or a planned session.
import { workoutDay, effectiveRoutineIds } from '../../lib/history.js'
import { weekDayOffset } from '../../lib/format.js'
import { pinState } from '../../lib/queue.js'
import { dayNoteOf } from '../../lib/day-notes.js'

const pad = n => String(n).padStart(2, '0')

/** A month as calendar cells, week rows starting on `ws`: null for the blanks before the 1st,
 *  else the day's ISO date. */
export function monthCells(y, mo, ws) {
  const blanks = weekDayOffset(new Date(y, mo, 1).getDay(), ws)
  const days = new Date(y, mo + 1, 0).getDate()
  return [...Array(blanks).fill(null), ...Array.from({ length: days }, (_, i) => `${y}-${pad(mo + 1)}-${pad(i + 1)}`)]
}

/** The `n` months from (y, mo) back, newest first, as { y, mo }. */
export function monthsBack(y, mo, n) {
  return Array.from({ length: n }, (_, i) => { const d = new Date(y, mo - i, 1); return { y: d.getFullYear(), mo: d.getMonth() } })
}

/** Workouts by their day: ISO date -> [workout]. */
export function workoutsByDay(workouts) {
  const by = {}
  for (const w of workouts || []) { const d = workoutDay(w); if (d) (by[d] = by[d] || []).push(w) }
  return by
}

/** Days since the last workout up to `today` (0 when trained today), null with none yet. */
export function restDays(workouts, today) {
  let last = ''
  for (const w of workouts || []) { const d = workoutDay(w); if (d && d <= today && d > last) last = d }
  if (!last) return null
  const at = iso => new Date(iso + 'T12:00:00')
  return Math.round((at(today) - at(last)) / 86400000)
}

/** What a day shows: 'done', 'noted', 'ovr' (rescheduled), 'plan', or ''. */
export function dayMark(S, iso, byDay) {
  if (byDay[iso]) return 'done'
  if (dayNoteOf(S, iso)) return 'noted'
  const planned = effectiveRoutineIds(S, iso).length > 0
  const ovr = S.dayPlan?.[iso] !== undefined && pinState(S, S.dayPlan[iso]) !== 'done'
  return ovr && planned ? 'ovr' : planned ? 'plan' : ''
}
