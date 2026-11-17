// The Today tab (hevier/DECISIONS.md D134): the sets the next session opens with, the week as seven
// days and the round's progress. views/Today.jsx draws them; the next day itself is next-planned.js's.
import { nextSession } from './next-plan.js'
import { setRuns } from './set-text.js'
import { isSideSet } from '../../lib/workout-model.js'
import { planTitle, workoutsByDay } from './calendar.js'
import { nextPlanned } from './next-planned.js'
import { queueView, weekTally } from '../../lib/queue.js'
import { fmtNum, isoOf, startOfWeek, weekStartOf } from '../../lib/format.js'
import { shownWeight } from '../../lib/ex-unit.js'

// One work row as text: "60 × 8", "× 12" on body weight, "45 s", "20 min".
function rowText(row) {
  if (row.text) return row.text
  if (row.min != null) return row.min + ' min'
  const w = row.w > 0 ? fmtNum(row.w) + ' × ' : ''
  if (row.sec != null) return w + row.sec + ' s'
  return (w || '× ') + row.reps
}

/** A routine exercise's work sets as one line, set-text.js's setRuns: "3 sets · 60 × 8" when all
 *  are alike, else each run in turn with its count leading ("2 × 80 × 8, 80 × 7"). */
export const setsText = rows => setRuns(rows.filter(row => row.kind === 'work').map(rowText))

// One set as it opens, as setsText reads it, weights through `show` (the exercise's own unit, D41): a per-side set "40 × 8/7", a hold on each side "45/40 s".
function openedRow(set, show) {
  const [row, R] = set.rows
  const kind = set.kind === 'work' ? 'work' : 'warm'
  const w = x => (x.w > 0 ? fmtNum(show(x.w)) + ' × ' : '')
  const two = (a, b) => (a === b ? String(a) : a + '/' + b)
  if (isSideSet(row)) {
    const { L, R: r } = row.sides
    return { kind, text: L.w === r.w ? (w(L) || '× ') + two(L.r, r.r) : `${w(L)}${L.r} / ${w(r)}${r.r}` }
  }
  if (R) return { kind, text: w(row) + two(row.sec, R.sec) + ' s' }
  return { kind, w: row.w > 0 ? show(row.w) : row.w, reps: row.r, sec: row.sec, min: row.min }
}

/** The exercises of the routines `ids`, in order, each with the sets it opens with, the plan
 *  included (D128, the routine's page shows the same): [{ key, id, sets }]. */
export function sessionSets(S, ids) {
  return (ids || []).flatMap(rid => nextSession(S, rid).map(x =>
    ({ key: rid + ':' + x.idx, id: x.id, sets: setsText(x.sets.map(set => openedRow(set, w => shownWeight(S, x.id, w)))) })))
}

/** The names without the words that several of them start with ("Plan Upper A", "Plan Lower A", "Cardio":
 *  "Upper A", "Lower A", "Cardio"), so a narrow day cell shows what tells the days apart. A group of names
 *  is left alone when that would empty one of them. */
export function shortNames(names) {
  const groups = {}
  for (const n of new Set(names.filter(Boolean))) (groups[n.split(' ')[0]] ||= []).push(n.split(' '))
  const cut = {}
  for (const [first, used] of Object.entries(groups)) {
    let k = 0
    while (used.length > 1 && used.every(w => w.length > k + 1 && w[k] === used[0][k])) k++
    cut[first] = k
  }
  return names.map(n => (n && cut[n.split(' ')[0]] ? n.split(' ').slice(cut[n.split(' ')[0]]).join(' ') : n))
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
  const days = Array.from({ length: 7 }, (_, k) => {
    const d = new Date(start)
    d.setDate(start.getDate() + k)
    const iso = isoOf(d)
    const name = byDay[iso] ? '' : planTitle(S, iso, byDay, today)
    return { iso, day: d.getDay(), kind: byDay[iso] ? 'done' : name ? 'plan' : iso === today ? 'rest' : '', name, next: iso === next }
  })
  const short = shortNames(days.map(d => d.name))
  return days.map((d, i) => ({ ...d, short: short[i] }))
}

/** The round's progress, `{ done, of, round }`: a rotation's (or a coach week's) round while it
 *  runs, else this week's workouts against the planned days; null with nothing planned. */
export function roundOf(S, today) {
  const v = queueView(S, today)
  if (v && !v.waiting) return { done: v.items.length - v.remaining.length, of: v.items.length, round: true }
  const { done, planned } = weekTally(S, today)
  return planned ? { done, of: planned, round: false } : null
}
