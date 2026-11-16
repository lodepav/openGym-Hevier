// A saved set as the rows a page lists it in (hevier/DECISIONS.md D133). A per-side set of any type
// is an L row and an R row, each a plain set built from its side, so it is written like any other
// set: upstream's per-side shape (`sides`, workout-model.js) keeps each side's weight, reps, effort
// and, on a drop or rest-pause set, its own drops or bursts on the side, while the warm-up, failure
// and set type stay on the row. A per-side hold is already two rows (hold-set.js). Effort and heart
// rate belong to the set, so they go on its first row; arrows and records on their own side.
import { EFFORT, effortOf } from '../../lib/history.js'
import { displayScale, toScale } from '../../lib/effort.js'
import { hasCompletedWork, isSideSet } from '../../lib/workout-model.js'
import { isPairHead, isPairTail } from './hold-set.js'

const SIDE_FIELDS = ['sides', 'w', 'r', 'done', 'rir', 'rpe', 'type', 'cluster', 'drops', 'clusters', 'weightOrigin']

/** Side `k` ('L' | 'R') of per-side set `s` as a plain set: the row's own marks, the side's numbers. */
export function sideSet(s, k) {
  const rest = { ...s }
  for (const f of SIDE_FIELDS) delete rest[f]
  const { weightOrigin: _, ...side } = s.sides[k] || {}
  return { ...rest, ...side }
}

// The harder of the efforts logged, as upstream's per-side row keeps it (syncSideAggregate).
function harder(list) {
  const rirs = list.map(x => x?.rir).filter(v => v != null)
  if (rirs.length) return { rir: Math.min(...rirs) }
  const rpes = list.map(x => x?.rpe).filter(v => v != null)
  return rpes.length ? { rpe: Math.max(...rpes) } : null
}

/** Set `s`'s effort, { rir } or { rpe } or null: a per-side set's harder side. */
export const setEffort = s => (isSideSet(s) ? harder([s.sides.L, s.sides.R, s]) : harder([s]))

/**
 * The rows of an exercise's done sets `sets`: [{ i, side, s, head, last, effort, hr, undone }].
 * `i` is the set's index in `sets`, `side` 'L', 'R' or null, `s` the set to write, `head` the set's
 * first row (its number, effort and heart rate), `last` its last row (its note, a session record).
 * `effort` is { rir } or { rpe } or null, on the head only; `undone` a side left unticked.
 */
export function detailRows(sets) {
  const list = Array.isArray(sets) ? sets : []
  const out = []
  list.forEach((s, i) => {
    if (!hasCompletedWork(s)) return
    if (isSideSet(s)) {
      for (const k of ['L', 'R']) out.push({ i, side: k, s: sideSet(s, k), head: k === 'L', last: k === 'R',
        effort: k === 'L' ? setEffort(s) : null, hr: k === 'L' ? s.hr : null, undone: s.sides[k].done !== true })
      return
    }
    const side = s.side === 'L' || s.side === 'R' ? s.side : null
    if (side && isPairTail(list, i) && hasCompletedWork(list[i - 1])) {
      out.push({ i, side, s, head: false, last: true, effort: null, hr: null, undone: false })
      return
    }
    const pair = side && isPairHead(list, i) && hasCompletedWork(list[i + 1]) ? list[i + 1] : null
    out.push({ i, side, s, head: true, last: !pair, effort: harder(pair ? [s, pair] : [s]),
      hr: s.hr ?? pair?.hr ?? null, undone: false })
  })
  return out
}

/** The effort scale a page names its column by: the profile's, else the one its log is rated in. */
export const effortScale = S => (EFFORT[effortOf(S)] ? effortOf(S) : displayScale(S))

/** A row's `effort` as a number on `scale` ('rir' | 'rpe'), null for none. */
export const effortShown = (effort, scale) => (!effort ? null
  : effort[scale] != null ? effort[scale] : toScale(scale, effort.rir != null ? effort.rir : 10 - effort.rpe))

// The side of per-side set `s` that record `rec` was set on: the done side with its weight and
// reps (records.js keeps them), else L.
function recordSide(s, rec) {
  const w = rec.w ?? (rec.kind === 'weight' ? rec.v : null)
  const r = rec.r ?? (rec.kind === 'reps' ? rec.v : null)
  const hit = ['L', 'R'].find(k => {
    const p = s.sides[k]
    return p?.done === true && (w == null || Number(p.w) === w) && (r == null || Number(p.r) === r)
  })
  return hit || 'L'
}

/**
 * The records `recs` (records.js, one exercise's) that row `row` of `sets` shows: a set's on the
 * row of its side, a session's (set -1) on the last row of set `lastWork`, the last work set.
 */
export function recordsOnRow(row, recs, sets, lastWork) {
  const s = sets?.[row.i]
  return (recs || []).filter(rec => (rec.set < 0 ? row.i === lastWork && row.last
    : rec.set === row.i && (!isSideSet(s) || recordSide(s, rec) === row.side)))
}
