// The Summary tab of Hevy's exercise details (reference/SCREENS.md §7) over openGym's own read-back
// of an exercise's log, lib/exercise-history.js: the same sessions, the same "heaviest" (on an
// assistance machine, the least help), the same estimated 1RM, warm-ups left out. What this adds
// is derived from those sessions: Hevy's records (best set volume, best session volume) and its
// table of the heaviest weight for each rep count.
import { exerciseHistory } from '../../lib/exercise-history.js'
import { completedRepsOf } from '../../lib/history.js'
import { beatsWeight, isAssisted } from '../../lib/exercises.js'

const DAY = 86400000
export const RANGES = { '3m': 91 * DAY, '1y': 365 * DAY, all: Infinity }

/** The points of a series inside a range ('3m' | '1y' | 'all') that ends at `now`. */
export const inRange = (points, range, now = Date.now()) =>
  (points || []).filter(p => now - p.t <= (RANGES[range] ?? Infinity))

const top = (list, key) => list.reduce((best, x) => (x[key] > (best?.[key] ?? 0) ? x : best), null)

/**
 * { metric, total, sessions (newest first), series: { main, e1rm?, setVol? }, records, reps }
 * `metric` is upstream's: 'weight' | 'reps' | 'sec' | 'min'. `records` holds { v, d, … } or null:
 * best (the chart's own number), e1rm, setVol (one set's weight × reps), sessionVol. `reps` is the
 * heaviest weight for each rep count, fewest reps first, a weighted exercise only.
 */
export function exerciseSummary(S, exId) {
  const h = exerciseHistory(S, exId, { limit: Infinity })
  const chron = [...h.sessions].reverse()
  const weighted = h.metric === 'weight'
  // There is no honest tonnage for the help an assistance machine gives (exercise-history.js).
  const tonnage = weighted && !isAssisted(exId)
  const lifts = chron.filter(s => s.mode === 'reps')

  const setVols = tonnage ? lifts.map(s => {
    const best = top(s.sets.map(x => ({ w: Number(x.w) || 0, r: completedRepsOf(x) })).map(x => ({ ...x, v: x.w * x.r })), 'v')
    return best ? { t: s.t, d: s.d, y: best.v, w: best.w, r: best.r } : null
  }).filter(p => p && p.y > 0) : []

  const series = { main: h.points }
  if (weighted && h.e1rmPoints.length) series.e1rm = h.e1rmPoints
  if (setVols.length) series.setVol = setVols

  const prSession = chron.find(s => s.pr) || null
  const e1 = top(h.e1rmPoints, 'y')
  const sv = top(setVols, 'y')
  const sessVol = tonnage ? top(lifts.filter(s => s.volume > 0), 'volume') : null
  const records = {
    best: h.best > 0 && prSession ? { v: h.best, d: prSession.d } : null,
    e1rm: e1 ? { v: e1.y, d: e1.d } : null,
    setVol: sv ? { v: sv.y, w: sv.w, r: sv.r, d: sv.d } : null,
    sessionVol: sessVol ? { v: sessVol.volume, d: sessVol.d } : null,
  }

  const byReps = new Map()
  if (weighted) for (const s of lifts) for (const x of s.sets) {
    const r = completedRepsOf(x), w = Number(x.w) || 0
    if (!(r > 0) || !(w > 0)) continue
    const had = byReps.get(r)
    // A tie keeps the first time it was reached, as upstream's PR marker does.
    if (!had || beatsWeight(exId, w, had.w)) byReps.set(r, { r, w, d: s.d })
  }
  const reps = [...byReps.values()].sort((a, b) => a.r - b.r)

  return { metric: h.metric, total: h.total, sessions: h.sessions, series, records, reps }
}
