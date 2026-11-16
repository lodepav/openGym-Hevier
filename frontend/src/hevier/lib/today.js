// The Today tab (hevier/DECISIONS.md D134): the sets the next session opens with, the week as seven
// days and the round's progress. views/Today.jsx draws them; the next day itself is next-planned.js's.
import { routineRows } from './routine-table.js'
import { planTitle, workoutsByDay } from './calendar.js'
import { nextPlanned } from './next-planned.js'
import { queueView, weekTally } from '../../lib/queue.js'
import { fmtNum, isoOf, startOfWeek, weekStartOf } from '../../lib/format.js'
import { t } from '../../lib/i18n.js'

// One work row as text: "60 × 8", "× 12" on body weight, "45 s", "20 min".
function rowText(row) {
  if (row.min != null) return row.min + ' min'
  const w = row.w > 0 ? fmtNum(row.w) + ' × ' : ''
  if (row.sec != null) return w + row.sec + ' s'
  const reps = row.max ? t('Max') : row.repsMin != null && row.repsMin !== row.reps ? row.repsMin + '–' + row.reps : row.reps
  return (w || '× ') + reps
}

/** A routine exercise's work sets as one line: "3 sets · 60 × 8", or each in turn ("80 × 8, 55 × 13"). */
export function setsText(rows) {
  const runs = []
  for (const row of rows) {
    if (row.kind !== 'work') continue
    const v = rowText(row)
    if (runs.at(-1)?.v === v) runs.at(-1).n++
    else runs.push({ v, n: 1 })
  }
  return runs.map(x => (x.n > 1 ? t('{0} sets', x.n) + ' · ' : '') + x.v).join(', ')
}

/**
 * The exercises of the routines `ids`, in order, each with the sets it opens with: [{ key, id, sets }].
 * shortcut: the routine's own plan, as its page shows it; D128 replaces it with what the session opens with.
 */
export function sessionSets(S, ids) {
  const out = []
  for (const rid of ids || []) {
    const r = (S.routines || []).find(x => x.id === rid)
    if (r) r.ex.forEach((e, i) => out.push({ key: rid + ':' + i, id: e.id, sets: setsText(routineRows(e, r, S.unit)) }))
  }
  return out
}

/**
 * This week as seven days from the profile's first weekday: [{ iso, day, kind, name, next }].
 * `kind` is 'done' (trained), 'plan' (a routine planned from today on, `name` its first),
 * 'rest' (today with nothing) or ''. `next` marks the day the next session is on.
 */
export function weekStrip(S, today) {
  const byDay = workoutsByDay(S.workouts)
  const next = nextPlanned(S, today)?.iso
  const start = startOfWeek(today, weekStartOf(S))
  return Array.from({ length: 7 }, (_, k) => {
    const d = new Date(start)
    d.setDate(start.getDate() + k)
    const iso = isoOf(d)
    const name = byDay[iso] ? '' : planTitle(S, iso, byDay, today)
    return { iso, day: d.getDay(), kind: byDay[iso] ? 'done' : name ? 'plan' : iso === today ? 'rest' : '', name, next: iso === next }
  })
}

/** The round's progress, `{ done, of, round }`: a rotation's (or a coach week's) round while it
 *  runs, else this week's workouts against the planned days; null with nothing planned. */
export function roundOf(S, today) {
  const v = queueView(S, today)
  if (v && !v.waiting) return { done: v.items.length - v.remaining.length, of: v.items.length, round: true }
  const { done, planned } = weekTally(S, today)
  return planned ? { done, of: planned, round: false } : null
}
