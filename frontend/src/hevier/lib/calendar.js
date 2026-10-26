// Hevy's Calendar page (reference/SCREENS.md §11): month grids with the trained days filled, and
// the "week streak · rest days" line. A day's mark follows upstream's Calendar (sheets.jsx): a
// trained day, else a day note, else a rescheduled or a planned session. A planned day from today on
// has a dot in its routine's colour (D68).
import { workoutDay, effectiveRoutineIds } from '../../lib/history.js'
import { weekDayOffset } from '../../lib/format.js'
import { pinState } from '../../lib/queue.js'
import { dayNoteOf } from '../../lib/day-notes.js'
import { isCardio } from '../../lib/exercises.js'

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

const DELOAD = /deload/i
/** A workout's kind for the calendar's colour: 'deload' when its title or note
 *  says so, 'cardio' when every exercise in it is cardio, else 'strength'. */
export function workoutKind(w) {
  if (DELOAD.test(w?.name || '') || DELOAD.test(w?.note || '')) return 'deload'
  const ids = (w?.entries || []).map(e => e?.id).filter(Boolean)
  return ids.length && ids.every(id => isCardio(id)) ? 'cardio' : 'strength'
}

/** A trained day's kind: deload over strength over cardio, across the day's workouts. */
export function dayKind(ws) {
  const kinds = new Set((ws || []).map(workoutKind))
  return kinds.has('deload') ? 'deload' : kinds.has('strength') ? 'strength' : kinds.size ? 'cardio' : ''
}

/**
 * What a day's planned dot shows (D68): the kind of the routines planned on it, from `today` on, while it
 * is not trained; '' otherwise. A day of several takes deload over strength over cardio.
 */
export function planKind(S, iso, byDay, today) {
  const rs = plannedOn(S, iso, byDay, today)
  return rs.length ? dayKind(rs.map(r => ({ name: r.name, note: r.note, entries: r.ex }))) : ''
}

/** The name a planned day shows under it in the month view (D68): its first routine's. */
export const planTitle = (S, iso, byDay, today) => plannedOn(S, iso, byDay, today)[0]?.name || ''

const plannedOn = (S, iso, byDay, today) => (iso < today || byDay?.[iso] ? []
  : effectiveRoutineIds(S, iso, today).map(id => S.routines.find(r => r.id === id)).filter(Boolean))

/** The title a trained day shows, as newer Hevy versions do: its first workout's. */
export function dayTitle(ws) {
  const first = [...(ws || [])].sort((a, b) => (a.start || 0) - (b.start || 0))[0]
  return first?.name || ''
}
