// The typical time between two sets of an exercise, for the Exercise time page (D88), against the
// rest the timer runs for it. From the tick times (`at`): the gap from one ticked work set of an
// entry to its next, which holds the rest and the next set too, so it is "between sets", not rest.
// Left out: warm-ups, an entry in a superset (its gaps hold the partner's sets: a round, not a
// rest), a gap longer than upstream's forgotten-session gap (a break), a tick before the start or
// past the end (the log caught up later), an entry kept out of progression (D57), and workouts
// with no tick times (imported). A per-side set is one row with one tick, so it counts once; a timed
// per-side hold is an L row and an R row, read by the R row's tick.
import { FORGOTTEN_GAP_MS } from '../../lib/finish-workout.js'
import { entryExcluded, setSpanAt, supersetUnits } from '../../lib/history.js'
import { hasCompletedWork, isWarmupRow } from '../../lib/workout-model.js'
import { restFor } from './rest-extra.js'

export const MIN_GAPS = 5

// The middle value; of an even count the upper of the two, so it is always a time that happened.
const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]

/**
 * Per exercise id, over the workouts from `since` (an ISO day, '' for all):
 * `{ gap, rest, n }`, the median gap in ms, the median rest in seconds its sets were set to (as
 * the live workout's timer works it out, with the profile's `restSec` and `warmupRestSec`) and the
 * number of gaps. Only exercises with at least MIN_GAPS gaps are in the map.
 */
export function setGaps(workouts, since = '', S = {}) {
  const by = new Map()
  for (const w of workouts || []) {
    if (since && !(String(w?.d || '') >= since)) continue
    const start = Number(w?.start), end = Number(w?.end)
    if (!Number.isFinite(start) || !Array.isArray(w?.entries)) continue
    const solo = new Set(supersetUnits(w.entries).filter(u => u.length === 1).map(u => u[0]))
    w.entries.forEach((e, idx) => {
      if (!solo.has(idx) || entryExcluded(w, e)) return
      const ticks = (e?.sets || []).map((s, i) => ({ i, at: s?.at, s }))
        .filter(({ s, at, i }) => !(s?.side === 'L' && setSpanAt(e.sets, i)[1] === 2) && hasCompletedWork(s) && !isWarmupRow(s) && Number.isFinite(at) && at >= start && !(at > end))
        .sort((a, b) => a.at - b.at)
      for (let k = 1; k < ticks.length; k++) {
        const ms = ticks[k].at - ticks[k - 1].at
        if (!(ms > 0) || ms > FORGOTTEN_GAP_MS) continue
        const r = by.get(e.id) || by.set(e.id, { gaps: [], rests: [] }).get(e.id)
        r.gaps.push(ms)
        r.rests.push(restFor(w, idx, ticks[k - 1].i, S?.restSec, S?.warmupRestSec))
      }
    })
  }
  const out = new Map()
  for (const [id, { gaps, rests }] of by) {
    if (gaps.length >= MIN_GAPS) out.set(id, { gap: median(gaps), rest: median(rests), n: gaps.length })
  }
  return out
}
