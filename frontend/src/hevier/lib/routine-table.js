// Hevy's routine table over openGym's plan (hevier/DECISIONS.md D15). A routine exercise is one
// prescription — sets × reps @ weight, a warm-up count, back-off, "last set to failure" — and only
// a pyramid holds reps and weights set by set. `routineRows` draws the table from it; the edits
// below each return the next config, normalised the way upstream's exercise settings save it
// (sheets.jsx ExConfig), so the plan the session builds from is one upstream could have written.
import { modeOf, isPerSide, MAX_PLANNED_WARMUPS } from '../../lib/history.js'
import {
  isPyramid, normalizePyramid, normalizePyramidRest, normalizePyramidWeight, flatFromPyramid,
  pyramidTargetAt, pyramidWeightAt, PYRAMID_MAX, MAX_PYRAMID_SETS,
} from '../../lib/pyramid.js'
import { isBackoff, backoffAt, backoffStepOf } from '../../lib/backoff.js'
import { normalizeRepRange } from '../../lib/rep-range.js'
import { policyFor } from '../../lib/progression.js'

const climbsRange = p => p === 'double' || p === 'triple'
const warmupsOf = cfg => Math.max(0, Math.min(MAX_PLANNED_WARMUPS, Math.round(cfg.warmupSets) || 0))
const stride = cfg => (isPerSide(cfg) ? 2 : 1)
const even = (v, s) => Math.max(s, Math.ceil((Math.round(Number(v)) || 0) / s) * s)
const round2 = v => Math.round(Math.max(0, Number(v) || 0) * 100) / 100

/** What kind of table an exercise gets: its mode, whether its reps are a range (double or triple
 *  progression), whether it is a pyramid. `routine` decides the inherited progression. */
export function tableShape(cfg, routine) {
  const mode = modeOf(cfg)
  const pyramid = mode === 'reps' && isPyramid(cfg)
  const ranged = mode === 'reps' && !pyramid && climbsRange(policyFor(cfg, routine, mode))
  return { mode, pyramid, ranged, perSide: isPerSide(cfg), backoff: isBackoff(cfg) }
}

/** Work sets the plan asks for: a pyramid's list, else `sets`. */
export const workCount = cfg => (tableShape(cfg).pyramid ? cfg.pyramid.length : Math.max(1, Math.round(cfg.sets) || 1))

/**
 * The table's rows, warm-ups first: `{ kind: 'warm', n }` (its weight is worked out at session
 * start, so it has none here) and `{ kind: 'work', k, w, fixed, reps, repsMin, max, sec, min,
 * speed, failure }`. `fixed` is a back-off set's derived weight, which follows the top set.
 */
export function routineRows(cfg, routine, unit) {
  const shape = tableShape(cfg, routine)
  const rows = []
  for (let n = 0; n < warmupsOf(cfg); n++) rows.push({ kind: 'warm', n })
  const count = workCount(cfg)
  const step = shape.backoff ? backoffStepOf(cfg, unit) : 0
  for (let k = 0; k < count; k++) {
    const row = { kind: 'work', k }
    if (shape.mode === 'cardio') Object.assign(row, { min: cfg.min || 20, speed: cfg.speed ?? 8 })
    else {
      row.w = shape.pyramid ? pyramidWeightAt(cfg, k) : step ? backoffAt(cfg.weight, k, step) : (cfg.weight || 0)
      row.fixed = !!step && k > 0
      if (shape.mode === 'time') row.sec = cfg.sec || 45
      else if (shape.pyramid) {
        const target = pyramidTargetAt(cfg.pyramid, k)
        row.max = target === PYRAMID_MAX
        row.reps = row.max ? null : target
      } else {
        row.reps = cfg.reps || 10
        if (shape.ranged) Object.assign(row, normalizeRepRange(cfg.reps, cfg.repsMin, stride(cfg)))
      }
      row.failure = !shape.pyramid && cfg.lastToFailure === true && k === count - 1
    }
    rows.push(row)
  }
  return rows
}

// A pyramid's three lists, kept the same length and in upstream's saved shape: the flat sets and
// reps follow the list, and an all-zero weight or rest list is no field at all.
function withPyramid(cfg, list, weights, rest) {
  const next = { ...cfg }
  const clean = normalizePyramid(list, stride(cfg))
  Object.assign(next, flatFromPyramid(clean), { pyramid: clean })
  const w = normalizePyramidWeight(weights, clean.length)
  const r = normalizePyramidRest(rest, clean.length)
  if (w.length) next.pyramidWeight = w; else delete next.pyramidWeight
  if (r.length) next.pyramidRest = r; else delete next.pyramidRest
  return next
}
const listsOf = cfg => {
  const n = cfg.pyramid.length
  const at = (arr, i) => (Array.isArray(arr) && arr.length ? pyramidTargetAt(arr, i) : 0)
  return {
    list: [...cfg.pyramid],
    weights: Array.from({ length: n }, (_, i) => at(cfg.pyramidWeight, i)),
    rest: Array.from({ length: n }, (_, i) => at(cfg.pyramidRest, i)),
  }
}
// Triple progression's ceiling is only kept while it is above the sets (ExConfig's rule).
const withSets = (cfg, sets) => {
  const next = { ...cfg, sets }
  if (next.setsMax != null && !(next.setsMax > sets)) delete next.setsMax
  return next
}

/** A typed value in work row `k`. `f` is w, r, sec, min or speed. A flat plan has one value per
 *  field, so any row sets it for every row; a back-off set's weight is derived and stays. */
export function setWorkField(cfg, routine, k, f, v) {
  const shape = tableShape(cfg, routine)
  if (f === 'w') {
    const w = round2(v)
    if (shape.pyramid) {
      const { list, weights, rest } = listsOf(cfg)
      weights[k] = w
      return withPyramid(cfg, list, weights, rest)
    }
    if (shape.backoff && k > 0) return cfg
    return { ...cfg, weight: w }
  }
  if (f === 'r') {
    if (shape.pyramid) {
      const { list, weights, rest } = listsOf(cfg)
      list[k] = Math.max(1, Math.round(Number(v)) || 1)
      return withPyramid(cfg, list, weights, rest)
    }
    const reps = even(v || 1, stride(cfg))
    return shape.ranged ? { ...cfg, ...normalizeRepRange(reps, cfg.repsMin, stride(cfg)) } : { ...cfg, reps }
  }
  if (f === 'sec' || f === 'min') return { ...cfg, [f]: Math.max(1, Math.round(Number(v)) || 1) }
  if (f === 'speed') return { ...cfg, speed: Math.max(0, Number(v) || 0) }
  return cfg
}

/** A double/triple-progression range, "from" to "up to", normalised as upstream saves it. */
export function setRange(cfg, from, to) {
  return { ...cfg, ...normalizeRepRange(to, from, stride(cfg)) }
}

/** "+ Add Set": one more work set; a pyramid repeats its last set, up to its limit. */
export function addRow(cfg) {
  if (tableShape(cfg).pyramid) {
    const { list, weights, rest } = listsOf(cfg)
    if (list.length >= MAX_PYRAMID_SETS) return cfg
    list.push(list.at(-1)); weights.push(weights.at(-1)); rest.push(rest.at(-1))
    return withPyramid(cfg, list, weights, rest)
  }
  return withSets(cfg, workCount(cfg) + 1)
}

/** Takes a row out. The plan keeps at least one work set; a warm-up can always go. */
export function removeRow(cfg, row) {
  if (row.kind === 'warm') {
    const next = { ...cfg }
    const n = warmupsOf(cfg) - 1
    if (n > 0) next.warmupSets = n; else delete next.warmupSets
    return next
  }
  const count = workCount(cfg)
  if (count <= 1) return cfg
  if (tableShape(cfg).pyramid) {
    const { list, weights, rest } = listsOf(cfg)
    list.splice(row.k, 1); weights.splice(row.k, 1); rest.splice(row.k, 1)
    return withPyramid(cfg, list, weights, rest)
  }
  return withSets(cfg, count - 1)
}

/** Whether row `row` may become a warm-up: the plan keeps a work set, and stays under the cap. */
export const canWarmUp = (cfg, row) => row.kind === 'work' && modeOf(cfg) !== 'cardio'
  && workCount(cfg) > 1 && warmupsOf(cfg) < MAX_PLANNED_WARMUPS

/** Set type W on a work row: one work set fewer, one warm-up more. */
export function makeWarmup(cfg, row) {
  if (!canWarmUp(cfg, row)) return cfg
  return { ...removeRow(cfg, row), warmupSets: warmupsOf(cfg) + 1 }
}

/** Set type Normal on a warm-up: one warm-up fewer, one work set more. */
export function makeWork(cfg) {
  return addRow(removeRow(cfg, { kind: 'warm' }))
}

/** Set type F: "last set to failure", the one failure a plan holds. Not for cardio or a pyramid
 *  (whose Max set is its own way to say it). */
export const canFail = cfg => modeOf(cfg) !== 'cardio' && !tableShape(cfg).pyramid
export function setFailure(cfg, on) {
  if (!canFail(cfg)) return cfg
  const next = { ...cfg }
  if (on) next.lastToFailure = true; else delete next.lastToFailure
  return next
}

/** A pyramid set's "as many reps as you can" (Max), or back to a number. */
export function setMax(cfg, k, on) {
  if (!tableShape(cfg).pyramid) return cfg
  const { list, weights, rest } = listsOf(cfg)
  list[k] = on ? PYRAMID_MAX : (cfg.reps || 10)
  return withPyramid(cfg, list, weights, rest)
}
