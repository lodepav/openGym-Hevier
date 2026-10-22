// Beat last time (hevier/DECISIONS.md D66), Dorian Yates' way of reading a log: each work set of
// a finished workout against the same set last time, ↑ better, = the same, ↓ less. Last time is
// the PREVIOUS column's (D3, D21), read from the log as it stood before this workout, so an old
// workout is held against what came before it. Nothing is stored.
import { historyAsOf } from '../../lib/backfill.js'
import { isWarmupRow } from '../../lib/workout-model.js'
import { isAssisted } from '../../lib/exercises.js'
import { estimate1RM, formulaOf } from '../../lib/onerm.js'
import { previousSetsFor, previousMode } from './previous-sets.js'
import { entryLabelKey } from './gym-labels.js'

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0)
const sign = d => (Math.abs(d) < 1e-9 ? 0 : d > 0 ? 1 : -1)

/**
 * How set `s` compares with set `p`: 1 better, 0 the same, -1 less, null when they cannot be
 * compared (no last time, or one is timed and the other is not). A hold or cardio set by its
 * time; a set with no load by its reps; a loaded one by weight and reps when both point the same
 * way, else by upstream's estimated 1RM (more weight for fewer reps can still be better). On an
 * assistance machine less weight is more.
 */
export function setTrend(s, p, { assisted = false, formula } = {}) {
  if (!s || !p) return null
  const time = x => num(x.sec) || num(x.min) * 60
  const timed = x => !num(x.r) && time(x) > 0
  if (timed(s) || timed(p)) return timed(s) && timed(p) ? sign(time(s) - time(p)) : null
  const [w, pw, r, pr] = [num(s.w), num(p.w), num(s.r), num(p.r)]
  if (!r || !pr) return null
  if (!w && !pw) return sign(r - pr)
  const dw = assisted ? sign(pw - w) : sign(w - pw)
  const dr = sign(r - pr)
  if (dw === dr || dw === 0 || dr === 0) return dw || dr
  if (assisted) return null
  const [a, b] = [estimate1RM(w, r, formula), estimate1RM(pw, pr, formula)]
  return a && b ? sign(a - b) : null
}

/** One slot per set of entry `i` of finished workout `w`: its trend, null for a warm-up or none. */
export function workoutTrends(S, w, i) {
  const e = w?.entries?.[i]
  if (!e) return []
  const H = historyAsOf(S, { d: w.d, start: w.start || 0, replaceId: w.id ?? null, strict: true })
  const prev = previousSetsFor(H, e, previousMode(S), { walk: false, label: entryLabelKey(e) })
  const opts = { assisted: isAssisted(e.id), formula: formulaOf(S) }
  return (e.sets || []).map((s, k) => (s?.done && !isWarmupRow(s) ? setTrend(s, prev[k], opts) : null))
}
