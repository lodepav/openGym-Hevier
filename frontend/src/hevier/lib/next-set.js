// The set to do next, highlighted in the workout (asked 2026-10-20, the user's choice of three
// mock-ups: a lighter row with a blue edge, and its values white and bold). It is the first
// unticked set of the exercise last ticked in, else of the next exercise with one left (on round
// the end to the first): so it follows the order you train in, not only the screen's.
const at = s => Math.max(Number(s?.at) || 0, Number(s?.sides?.L?.at) || 0, Number(s?.sides?.R?.at) || 0)
const sideStarted = s => !!(s?.sides?.L?.done || s?.sides?.R?.done)

/** `{ idx, i }` of the next set of the running session `A`, or null when every set is done. */
export function nextSet(A) {
  const E = A?.entries || []
  if (!E.length) return null
  // The exercise of the newest tick; with none yet, the first.
  let from = 0, newest = 0
  E.forEach((e, idx) => (e.sets || []).forEach(s => {
    const t = s.done || sideStarted(s) ? at(s) : 0
    if (t > newest) { newest = t; from = idx }
  }))
  for (let k = 0; k < E.length; k++) {
    const idx = (from + k) % E.length
    const i = (E[idx].sets || []).findIndex(s => !s.done)
    if (i !== -1) return { idx, i }
  }
  return null
}
