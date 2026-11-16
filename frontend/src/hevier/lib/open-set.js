// The live workout's opened set (hevier/DECISIONS.md D127): the first set not yet ticked is shown
// large with the effort row under it, nothing to select; a tap on another set (or on an exercise)
// opens that one instead. Which one is open is worked out here from the session and the last tap.
import { setSpanAt } from '../../lib/history.js'
import { nextSetAfter } from '../../lib/spoken-cues.js'
import { nextSet, newestTick } from './next-set.js'

/**
 * What a tap on set `i` of entry `idx` picks (`i` null: the exercise itself). The entry's id
 * guards against the list changing under it; `done` remembers a set that was ticked when tapped,
 * so it stays open to be looked at; `at` is the newest tick then, and a tick after it ends the tap.
 */
export const pickAt = (A, idx, i = null) =>
  ({ idx, id: A?.entries?.[idx]?.id, i, done: i != null && !!A?.entries?.[idx]?.sets?.[i]?.done, at: newestTick(A).at })

/**
 * `{ idx, i }` of the opened set of session `A` after the tap `pick` (or none), `i` null when an
 * exercise was tapped that has nothing left to do; null when nothing is open. Without a tap it is
 * the next set to do: after a tick the one the rest panel names (in a superset the other exercise's),
 * before any the first (next-set.js); a saved workout being edited opens nothing by itself.
 */
export function openSet(A, pick) {
  const E = A?.entries || []
  const e = pick ? E[pick.idx] : null
  const tick = newestTick(A)
  // A set ticked after the tap means the user moved on: the tap no longer holds the row.
  if (e && e.id === pick.id && !(tick.at > (pick.at || 0))) {
    const rows = e.sets || []
    const s = pick.i != null ? rows[pick.i] : null
    if (s && (pick.done || !s.done)) return { idx: pick.idx, i: pick.i }
    const i = rows.findIndex(x => !x.done)
    if (i !== -1) return { idx: pick.idx, i }
    if (pick.i == null) return { idx: pick.idx, i: null }
  }
  if (!A || A.editingWorkoutId) return null
  if (!tick.at) return nextSet(A)
  // A set half done (one side of a per-side set, the L row of a pair) is finished before anything else opens.
  const rows = E[tick.idx].sets || []
  const [from, count] = setSpanAt(rows, tick.i)
  for (let i = from; i < from + count; i++) if (!rows[i].done) return { idx: tick.idx, i }
  return nextSetAfter(A, tick.idx)
}

/** Whether row `i` of `rows` belongs to the opened set `open.i` (an L/R pair is one set). */
export function isOpenRow(rows, open, i) {
  if (open?.i == null) return false
  const [from, count] = setSpanAt(rows, open.i)
  return i >= from && i < from + count
}
