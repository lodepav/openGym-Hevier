// Beat last time (hevier/DECISIONS.md D66, replaced at the 1.4.4 merge by upstream's #907): each
// work set against the same set last time, ↑ better, = the same, ↓ less. The comparison and its
// switch are upstream's (lib/set-trend.js setTrend, Settings → Compare sets with last time); which
// set it is held against stays the PREVIOUS column's (D3, D21, by machine label D82), read from the
// log as it stood before the workout, so the arrow and PREVIOUS always speak of the same set.
// Nothing is stored.
import { historyAsOf } from '../../lib/backfill.js'
import { isWarmupRow } from '../../lib/workout-model.js'
import { isAssisted } from '../../lib/exercises.js'
import { formulaOf } from '../../lib/onerm.js'
import { setTrend as upstreamTrend, setTrendOn } from '../../lib/set-trend.js'
import { previousSetsFor, previousMode } from './previous-sets.js'
import { entryLastKey } from './gym-labels.js'

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0)
// A row's kind as upstream compares it: a hold by its seconds, cardio by its minutes, else reps.
const modeOfRow = x => (num(x.min) > 0 || num(x.speed) > 0 ? 'cardio' : !num(x.r) && num(x.sec) > 0 ? 'time' : 'reps')

/**
 * How set `s` compares with set `p`: 1 better, 0 the same, -1 less, null when they cannot be
 * compared (no last time, or one is a hold and the other is not), by upstream's rule (#907).
 */
export function setTrend(s, p, { assisted = false, formula } = {}) {
  if (!s || !p) return null
  const mode = modeOfRow(s)
  if (modeOfRow(p) !== mode) return null
  return upstreamTrend(s, p, { mode, assisted, formula })?.dir ?? null
}

/** Whether the arrows are on: upstream's switch (Settings → Compare sets with last time). */
export const trendsOn = setTrendOn

/** One slot per set of entry `i` of finished workout `w`: its trend, null for a warm-up or none. */
export function workoutTrends(S, w, i) {
  const e = w?.entries?.[i]
  if (!e || !setTrendOn(S)) return []
  const H = historyAsOf(S, { d: w.d, start: w.start || 0, replaceId: w.id ?? null, strict: true })
  const prev = previousSetsFor(H, e, previousMode(S), { walk: false, label: entryLastKey(e) })
  const opts = { assisted: isAssisted(e.id), formula: formulaOf(S) }
  return (e.sets || []).map((s, k) => (s?.done && !isWarmupRow(s) ? setTrend(s, prev[k], opts) : null))
}
