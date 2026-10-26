// The plate line under a set (D84): the load each set puts on the bar, drawn under a set only where
// the stack changes from the set above it with a load. Upstream's plate maths (lib/plates.js).
import { rowLoad, sameLoad } from '../../lib/plates.js'
import { isSideSet } from '../../lib/workout-model.js'

/** Each set's load, or null; a per-side set has one only when both sides are the same weight. */
export const setLoads = (kind, sets, { perSide, base, inv }) => (kind === 'none' ? [] : sets.map(s => {
  if (!(perSide && isSideSet(s))) return rowLoad(kind, s.w, base, inv)
  const L = s.sides.L?.w || 0, R = s.sides.R?.w || 0
  return L && R && L !== R ? null : rowLoad(kind, L || R, base, inv)
}))

/** The load to draw under set `i`, or null when it has none or the last set with one is the same. */
export function plateLineAt(loads, i) {
  const L = loads[i]
  if (!L) return null
  let p = i - 1
  while (p >= 0 && !loads[p]) p--
  return p >= 0 && sameLoad(loads[p], L) ? null : L
}
