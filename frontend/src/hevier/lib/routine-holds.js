// A routine plans a timed hold on one set (hevier/DECISIONS.md D146), D89's hold made ahead. Stored
// on the routine exercise as `hvHolds: { [work set index]: seconds }`, keyed as hvPlan's work sets
// are (warm-ups apart, so adding one does not move it). 0 plans a rep set where last time's hold
// would carry over (D89's "Next time"), so the editor's Normal set can turn a carried hold back.
// Only a plain routine (D69) opens with it: progression's own build reads the reps rows only.
import { modeOf } from '../../lib/history.js'
import { isPyramid } from '../../lib/pyramid.js'
import { isWarmupRow, isSideSet, syncSideAggregate, WEIGHT_ORIGIN_MANUAL } from '../../lib/workout-model.js'
import { HOLD_SEC, canBeHold, isHoldRow, toHold, toSideHold, setUnits } from './hold-set.js'

/** The longest hold a routine plans: an hour. */
export const HOLD_MAX = 3600
const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
const okSec = v => Number.isInteger(v) && v >= 0 && v <= HOLD_MAX
const workCountOf = cfg => Math.max(1, Math.round(cfg?.sets) || 1)

/** Whether exercise `cfg` can plan holds: a reps exercise, not a pyramid (its sets are each planned). */
export const canPlanHolds = cfg => !!cfg && modeOf(cfg) === 'reps' && !isPyramid(cfg)

/** `cfg`'s planned holds, read (a synced or restored routine is not trusted): only work sets it
 *  has, only whole seconds up to HOLD_MAX. */
export function holdsOf(cfg) {
  if (!canPlanHolds(cfg) || !isMap(cfg.hvHolds)) return {}
  const n = workCountOf(cfg)
  return Object.fromEntries(Object.entries(cfg.hvHolds).filter(([k, v]) => /^\d+$/.test(k) && Number(k) < n && okSec(v)))
}

/** Work set `k`'s plan: seconds (> 0) for a hold, 0 for a rep set over last time's hold, else undefined. */
export const plannedHold = (cfg, k) => holdsOf(cfg)[k]

const withHolds = (cfg, holds) => {
  const next = { ...cfg }
  if (Object.keys(holds).length) next.hvHolds = holds; else delete next.hvHolds
  return next
}

/** `cfg` with only the holds it can keep: after upstream's settings sheet, which drops the field,
 *  or a change of sets. No field at all when none is left. */
export const pruneHolds = cfg => withHolds(cfg, holdsOf(cfg))

/** Plans work set `k` as a hold of `sec` seconds (1 to HOLD_MAX), as a rep set (0), or as last
 *  time has it (null). */
export function setHold(cfg, k, sec) {
  if (!canPlanHolds(cfg) || !Number.isInteger(k) || k < 0 || k >= workCountOf(cfg)) return cfg
  const holds = holdsOf(cfg)
  if (sec == null) delete holds[k]
  else holds[k] = Math.min(HOLD_MAX, Math.max(0, Math.round(Number(sec)) || 0))
  return withHolds(cfg, holds)
}

/** Work set `k` taken out: its plan goes and the ones after it move up a set. */
export function shiftHolds(cfg, k) {
  if (!isMap(cfg?.hvHolds)) return cfg
  const holds = {}
  for (const [key, v] of Object.entries(cfg.hvHolds)) {
    const n = Number(key)
    if (n < k) holds[key] = v
    else if (n > k) holds[n - 1] = v
  }
  return withHolds(cfg, holds)
}

// A row opened as a hold is marked with its work set (1-based), so D35 tells a hold made in the
// workout from one it opened with, and which planned hold it was.
const held = (rows, k) => rows.map(r => ({ ...r, hvHeld: k + 1 }))

// Last time's hold `rows` (one row, or an L/R pair) back as a rep set: the routine's reps, last
// time's weight marked as filled from it (plain-routine.js own), on each side for a per-side set.
const lastW = r => (Number(r?.w) > 0 ? r.w : null)
function backToReps(base, rows) {
  if (isSideSet(base)) {
    const wL = lastW(rows[0]), wR = lastW(rows[1])
    if (wL == null && wR == null) return base
    const side = (k, w) => (w == null ? base.sides[k] : { ...base.sides[k], w, weightOrigin: WEIGHT_ORIGIN_MANUAL })
    return { ...syncSideAggregate({ ...base, sides: { L: side('L', wL), R: side('R', wR) } }), hvLast: (wL == null ? '' : 'L') + (wR == null ? '' : 'R') }
  }
  return lastW(rows[0]) == null ? base : { ...base, w: rows[0].w, weightOrigin: WEIGHT_ORIGIN_MANUAL, hvLast: 1 }
}

/**
 * Work set `k`'s rows as a plain routine opens them: `base` the row built at the routine's numbers,
 * `out` the same filled from last time (one row, or an L/R hold pair). A planned hold makes it a
 * hold at the planned seconds, its weight as filled; a planned rep set over last time's hold opens
 * at the routine's reps and last time's weight. Returns rows.
 */
export function openHold(cfg, k, base, out) {
  const rows = [out].flat()
  const plan = base.done || !canBeHold(base, 'reps') ? undefined : plannedHold(cfg, k)
  const hold = rows.length > 1 || isHoldRow(rows[0])
  // Back to reps over last time's hold: the routine's reps, last time's weight on that set.
  if (plan === 0) return hold ? [backToReps(base, rows)] : rows
  if (!(plan > 0)) return hold ? held(rows, k) : rows
  if (hold) return held(rows.map(r => ({ ...r, sec: plan })), k)
  const [row] = rows
  if (isSideSet(row)) {
    const last = row.hvLast ? { hvLast: 1 } : {}
    return held(toSideHold(row, plan).map(r => ({ ...r, ...last })), k)
  }
  return held([toHold(row, plan)], k)
}

/**
 * D35: routine exercise `slot`'s planned holds after workout `entry` (the session as it stood at
 * Save), or null when the workout made no set a hold or a rep set against what it opened with. A
 * hold made in the workout is planned at its seconds; a planned one turned back goes, and so does
 * a carried one (last time is now a rep set there). Only positions count, never seconds: a longer
 * hold is the lifter's number, as reps are.
 */
export function holdsAfter(slot, entry) {
  if (!canPlanHolds(slot) || !canPlanHolds({ ...(entry?.target || {}), id: entry?.id })) return null
  const was = holdsOf({ ...(entry.target || {}), id: entry.id })
  const work = (entry.sets || []).filter(r => !isWarmupRow(r))
  const units = setUnits(work)
  const next = {}
  let changed = false
  const seen = new Set()
  units.forEach((row, j) => {
    // A per-side hold's L row stands for its pair.
    const hold = isHoldRow(row)
    const from = Number(row.hvHeld) > 0 ? row.hvHeld - 1 : null
    if (from != null) seen.add(from)
    if (hold && from == null) { changed = true; next[j] = row.sec > 0 ? Math.min(HOLD_MAX, Math.round(row.sec)) : HOLD_SEC; return }
    if (!hold && from != null) { changed = true; return }
    if (hold && was[from] > 0) {
      next[j] = was[from]
      if (from !== j) changed = true
    }
  })
  // A planned hold whose set was taken out in the workout: the sets after it move up.
  const opened = Math.round(Number(entry.target?.sets)) || 0
  if (units.length < opened && Object.keys(was).some(k => was[k] > 0 && !seen.has(Number(k)))) changed = true
  if (!changed) return null
  return holdsOf({ ...slot, hvHolds: next })
}

/** What each exercise of `session` (next-plan.js nextSession) opens its work sets with, by its
 *  place in the routine: `[{ open, last }]` a work set, `open` its hold's seconds as it opens
 *  (planned or carried over), `last` last time's hold there, each 0 for none. */
export function openedHolds(session) {
  const secOf = s => (isHoldRow(s) && s.sec > 0 ? s.sec : 0)
  return (session || []).map(x => x.sets.filter(s => s.kind === 'work').map(s => ({ open: secOf(s.rows[0]), last: secOf(s.last[0]) })))
}

/** Set `set`'s number among `sets` (nextSession's, one exercise's) as the routine page shows it: a
 *  hold reads H, as a warm-up reads W, so the other work sets count on (D5). */
export const workNumberOf = (sets, set) => (sets || []).filter(y => y.kind === 'work' && y.n <= set.n && !isHoldRow(y.rows?.[0])).length
