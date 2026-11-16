// The live workout's opened set (hevier/DECISIONS.md D127): the first set not yet ticked is shown
// large with the effort row under it, nothing to select; a tap on another set (or on an exercise)
// opens that one instead. Which one is open is worked out here from the session and the last tap.
import { setSpanAt } from '../../lib/history.js'
import { isSideSet } from '../../lib/workout-model.js'
import { toScale } from '../../lib/effort.js'
import { nextSet } from './next-set.js'

/**
 * What a tap on set `i` of entry `idx` picks (`i` null: the exercise itself). The entry's id
 * guards against the list changing under it; `done` remembers a set that was ticked when tapped,
 * so it stays open to be looked at, while one ticked after the tap lets the next set open.
 */
export const pickAt = (A, idx, i = null) =>
  ({ idx, id: A?.entries?.[idx]?.id, i, done: i != null && !!A?.entries?.[idx]?.sets?.[i]?.done })

/**
 * `{ idx, i }` of the opened set of session `A` after the tap `pick` (or none), `i` null when an
 * exercise was tapped that has nothing left to do; null when nothing is open. Without a tap it is
 * the next set to do (next-set.js); a saved workout being edited opens nothing by itself.
 */
export function openSet(A, pick) {
  const E = A?.entries || []
  const e = pick ? E[pick.idx] : null
  if (e && e.id === pick.id) {
    const rows = e.sets || []
    const s = pick.i != null ? rows[pick.i] : null
    if (s && (pick.done || !s.done)) return { idx: pick.idx, i: pick.i }
    const i = rows.findIndex(x => !x.done)
    if (i !== -1) return { idx: pick.idx, i }
    if (pick.i == null) return { idx: pick.idx, i: null }
  }
  return A && !A.editingWorkoutId ? nextSet(A) : null
}

/** Whether row `i` of `rows` belongs to the opened set `open.i` (an L/R pair is one set). */
export function isOpenRow(rows, open, i) {
  if (open?.i == null) return false
  const [from, count] = setSpanAt(rows, open.i)
  return i >= from && i < from + count
}

/**
 * The line of set `i` an effort or the big tick logs next: `{ i, side }`. A per-side set logs its
 * sides in the order they are done (`order`), an L/R pair its rows; null when all are ticked.
 */
export function nextLine(rows, i, order = ['L', 'R']) {
  const s = rows?.[i]
  if (!s) return null
  if (isSideSet(s)) {
    const side = order.find(k => !s.sides[k]?.done)
    return side ? { i, side } : null
  }
  const [from, count] = setSpanAt(rows, i)
  for (let j = from; j < from + count; j++) if (!rows[j].done) return { i: j }
  return null
}

/** The effort row's buttons, in RPE: Other sits before them. */
export const EFFORT_ROW = [6, 7, 8, 9, 9.5, 10]
/** Other's choices, 1 to 10 in halves, in RPE. */
export const EFFORT_OTHER = Array.from({ length: 19 }, (_, k) => 1 + k / 2)

/** An effort picked as RPE `rpe`, on the profile's scale `kind` (a profile on RIR stores 10 − RPE). */
export const effortIn = (kind, rpe) => toScale(kind, 10 - rpe)
