// The Summary tab of Hevy's exercise details (reference/SCREENS.md §7) over openGym's own read-back
// of an exercise's log, lib/exercise-history.js: the same sessions, the same "heaviest" (on an
// assistance machine, the least help), warm-ups left out. What this adds
// is derived from those sessions: Hevy's records (best set volume, best session volume) and its
// table of the heaviest weight for each rep count. The records follow D51's rules, as records.js
// reads them: warm-ups never count, and the best 1RM is the profile's formula.
import { exerciseHistory } from '../../lib/exercise-history.js'
import { estimate1RM, formulaOf } from '../../lib/onerm.js'
import { isSideSet } from '../../lib/workout-model.js'
import { beatsWeight, isAssisted } from '../../lib/exercises.js'

const DAY = 86400000
export const RANGES = { '3m': 91 * DAY, '1y': 365 * DAY, all: Infinity }

/** The points of a series inside a range ('3m' | '1y' | 'all') that ends at `now`. */
export const inRange = (points, range, now = Date.now()) =>
  (points || []).filter(p => now - p.t <= (RANGES[range] ?? Infinity))

// A set's done sides, each with its own weight and reps, as the records read them (records.js): a
// per-side set's best is one side's, 28 kg × 11, not both sides' 22 (changed 2026-10-25, at the
// user's request after the UX review). Session totals (volume) still count both sides.
const parts = x => (isSideSet(x) ? [x.sides.L, x.sides.R] : [x])
  .filter(p => p?.done === true).map(p => ({ w: Number(p.w) || 0, r: Math.max(0, Number(p.r) || 0), rir: p.rir ?? null }))

const top = (list, key) => list.reduce((best, x) => (x[key] > (best?.[key] ?? 0) ? x : best), null)

/**
 * { metric, total, sessions (newest first), series: { main, e1rm?, setVol? }, records, reps }
 * `metric` is upstream's: 'weight' | 'reps' | 'sec' | 'min'. `records` holds { v, d, … } or null:
 * best (the chart's own number), e1rm, setVol (one set's weight × reps), sessionVol. `reps` is the
 * heaviest weight for each rep count, fewest reps first, a weighted exercise only.
 */
export function exerciseSummary(S, exId) {
  // Warm-ups stay out of the session volume whatever upstream's switch says (D51).
  const h = exerciseHistory(S?.volumeWarmups ? { ...S, volumeWarmups: false } : S, exId, { limit: Infinity })
  const chron = [...h.sessions].reverse()
  const weighted = h.metric === 'weight'
  // There is no honest tonnage for the help an assistance machine gives (exercise-history.js).
  const tonnage = weighted && !isAssisted(exId)
  const lifts = chron.filter(s => s.mode === 'reps')

  const setVols = tonnage ? lifts.map(s => {
    const best = top(s.sets.flatMap(parts).map(x => ({ ...x, v: x.w * x.r })), 'v')
    return best ? { t: s.t, d: s.d, y: best.v, w: best.w, r: best.r } : null
  }).filter(p => p && p.y > 0) : []

  // Each session's best 1RM in the profile's formula, a set's RIR read in, as records.js reads it:
  // the chart's curve and the Best 1RM tile, so the tile is the curve's top.
  const formula = formulaOf(S)
  // A session logged as assisted has no 1RM either, as upstream's bestSetOf reads it (#232).
  const e1rmPoints = isAssisted(exId) ? [] : lifts.filter(s => s.target?.assisted !== true).map(s => ({ t: s.t, d: s.d,
    y: Math.max(0, ...s.sets.flatMap(parts).map(x => estimate1RM(x.w, x.r, formula, x.rir) || 0)) })).filter(p => p.y > 0)

  // Reps without load: a session's most reps in one set, a per-side set's one side.
  const mostReps = h.metric === 'reps'
    ? new Map(lifts.map(s => [s.t, Math.max(0, ...s.sets.flatMap(parts).map(x => x.r))])) : null
  const main = mostReps ? h.points.map(p => ({ ...p, y: mostReps.get(p.t) ?? p.y })) : h.points
  const series = { main }
  if (weighted && e1rmPoints.length) series.e1rm = e1rmPoints
  if (setVols.length) series.setVol = setVols

  const prSession = chron.find(s => s.pr) || null
  const topReps = mostReps && top(main, 'y')
  const e1 = top(e1rmPoints, 'y')
  const sv = top(setVols, 'y')
  const sessVol = tonnage ? top(lifts.filter(s => s.volume > 0), 'volume') : null
  const records = {
    best: mostReps ? (topReps ? { v: topReps.y, d: topReps.d } : null)
      : h.best > 0 && prSession ? { v: h.best, d: prSession.d } : null,
    e1rm: e1 ? { v: e1.y, d: e1.d } : null,
    setVol: sv ? { v: sv.y, w: sv.w, r: sv.r, d: sv.d } : null,
    sessionVol: sessVol ? { v: sessVol.volume, d: sessVol.d } : null,
  }

  const byReps = new Map()
  if (weighted) for (const s of lifts) for (const { r, w } of s.sets.flatMap(parts)) {
    if (!(r > 0) || !(w > 0)) continue
    const had = byReps.get(r)
    // A tie keeps the first time it was reached, as upstream's PR marker does.
    if (!had || beatsWeight(exId, w, had.w)) byReps.set(r, { r, w, d: s.d })
  }
  const reps = [...byReps.values()].sort((a, b) => a.r - b.r)

  return { metric: h.metric, total: h.total, sessions: h.sessions, series, records, reps }
}
