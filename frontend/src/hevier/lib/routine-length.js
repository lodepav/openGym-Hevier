// How long a routine usually takes, for its page (D37): the median of its last five saved
// workouts with a clock. A session of two routines at once is left out, its length is both's.
import { hasClock } from './workout-when.js'

const idsOf = w => [].concat(w?.routineIds ?? (w?.routineId ? [w.routineId] : [])).filter(Boolean)

/** The median length in ms of routine `r`'s last five timed workouts, by its id, else (imports)
 *  by its name; null with fewer than two. */
export function usualLength(S, r, last = 5) {
  const timed = (S?.workouts || []).filter(w => w && hasClock(w))
  let mine = timed.filter(w => { const ids = idsOf(w); return ids.length === 1 && ids[0] === r?.id })
  if (!mine.length && r?.name) mine = timed.filter(w => !idsOf(w).length && w.name === r.name)
  // By start, not by place in the log: an import can sit out of order.
  const ms = [...mine].sort((a, b) => a.start - b.start).slice(-last).map(w => w.end - w.start).sort((a, b) => a - b)
  if (ms.length < 2) return null
  const mid = ms.length >> 1
  return ms.length % 2 ? ms[mid] : (ms[mid - 1] + ms[mid]) / 2
}
