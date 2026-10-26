// Hevy's monthly report (hevier/DECISIONS.md D23), read from the log alone: the month's totals
// against the month before, its records, weeks trained, sets per muscle and top exercises.
// Nothing here is stored. Records are the fork's, worked out from the log (hevier/lib/records.js, D51).
import { workoutDay, workoutDuration, workoutAt, bestWeightForEntry } from '../../lib/history.js'
import { betterWeight } from '../../lib/exercises.js'
import { muscleSets, workSets } from './volume.js'
import { monthCells } from './calendar.js'
import { signed } from './delta.js'
import { KINDS } from './records.js'

const pad = n => String(n).padStart(2, '0')
const keyOf = (y, mo) => `${y}-${pad(mo + 1)}`
const shift = (y, mo, by) => { const d = new Date(y, mo + by, 1); return { y: d.getFullYear(), mo: d.getMonth() } }

/** The workouts logged in month (y, mo), oldest first. */
export const monthWorkouts = (workouts, y, mo) => (workouts || []).filter(w => (workoutDay(w) || '').startsWith(keyOf(y, mo) + '-'))

function totals(ws, vol) {
  return {
    workouts: ws.length,
    duration: ws.reduce((n, w) => n + workoutDuration(w), 0),
    volume: ws.reduce((n, w) => n + vol(w), 0),
    sets: ws.reduce((n, w) => n + workSets(w.entries), 0),
  }
}

/** The month the page opens on: last month when it has workouts, else this one. */
export function defaultMonth(workouts, today) {
  const now = { y: Number(today.slice(0, 4)), mo: Number(today.slice(5, 7)) - 1 }
  const last = shift(now.y, now.mo, -1)
  return monthWorkouts(workouts, last.y, last.mo).length ? last : now
}

/** The first month with a workout, as { y, mo }, or null. */
export function firstMonth(workouts) {
  let first = ''
  for (const w of workouts || []) { const d = workoutDay(w); if (d && (!first || d < first)) first = d }
  return first ? { y: Number(first.slice(0, 4)), mo: Number(first.slice(5, 7)) - 1 } : null
}

/**
 * The report for month (y, mo): { ...totals, prev (the month before's totals), records
 * [{ id, kind, v, w?, r?, d }] (every record of the month, oldest first, from `recordsOf(w)`), weeks { trained, total }, muscles [{ muscle, sets }], top [{ id, sets, best }] }.
 * `ws` is the week's first day, for the weeks the month's calendar rows show; `mode` counts the
 * muscles (D42).
 */
export function monthReport(workouts, y, mo, ws = 1, mode = 'main', recordsOf = () => [], vol = w => Number(w.vol) || 0) {
  const list = monthWorkouts(workouts, y, mo)
  const before = shift(y, mo, -1)
  const records = []
  const dated = [...list].sort((a, b) => workoutAt(a) - workoutAt(b))
  for (const w of dated) for (const r of recordsOf(w)) records.push({ ...r, d: workoutDay(w) })
  const cells = monthCells(y, mo, ws)
  const trainedRows = new Set(list.map(w => Math.floor(cells.indexOf(workoutDay(w)) / 7)))
  const byEx = new Map()
  for (const w of list) for (const e of w.entries || []) {
    const sets = workSets([e])
    if (!sets) continue
    const cur = byEx.get(e.id) || { id: e.id, sets: 0, best: 0 }
    cur.sets += sets
    const b = bestWeightForEntry(e)
    if (b > 0) cur.best = cur.best > 0 ? betterWeight(e.id, cur.best, b) : b
    byEx.set(e.id, cur)
  }
  return {
    ...totals(list, vol),
    prev: totals(monthWorkouts(workouts, before.y, before.mo), vol),
    records,
    weeks: { trained: trainedRows.size, total: Math.ceil(cells.length / 7) },
    muscles: muscleSets(list.flatMap(w => w.entries || []), mode),
    top: [...byEx.values()].sort((a, b) => b.sets - a.sets).slice(0, 5),
  }
}

/** A change against the month before, absolute as Hevy's report writes it: { up, text } with text
 *  like '+3' or '−1h 30min' (`fmt` writes the size), or null for none. */
export function change(now, before, fmt) {
  return signed((Number(now) || 0) - (Number(before) || 0), fmt)
}

// The month's records, one row per exercise, most records first: [{ id, n, recs }], each kind once
// with its last (so best) record of the month and how many times it was beaten, `times`.
export function byExercise(records) {
  const rows = new Map()
  for (const x of records) {
    const row = rows.get(x.id) || { id: x.id, n: 0, kinds: new Map() }
    row.n++
    row.kinds.set(x.kind, { ...x, times: (row.kinds.get(x.kind)?.times || 0) + 1 })
    rows.set(x.id, row)
  }
  const order = Object.keys(KINDS)
  return [...rows.values()].sort((a, b) => b.n - a.n)
    .map(({ id, n, kinds }) => ({ id, n, recs: [...kinds.values()].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)) }))
}
