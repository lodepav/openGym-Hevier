// A set made a warm-up, or a warm-up made a work set, in the live workout. Upstream moves the row
// to where the work sets begin (makeWarmupAt / makeWorkAt) with the numbers it had, so each work
// set after it showed the suggestion of the set next to it: a new set made a warm-up from set 1
// left sets 1–3 at last time's sets 2–4. The suggestions belong to "work set N" and "warm-up N"
// (the PREVIOUS column's slots, D3), not to a row, so after the change each untouched row takes
// the suggestion its slot had before, and a slot new to its kind takes last time's set for it
// (D69's fill), else keeps its numbers. A row typed into or ticked keeps its own (D2).
import { isWarmupRow, isSideSet, syncSideAggregate } from '../../lib/workout-model.js'
import { fill } from './plain-routine.js'

/** Where each row after a move came from: `order[j]` is the old index of new row `j`. */
export function moveOrder(length, from, to) {
  const order = []
  for (let i = 0; i < length; i++) if (i !== from) order.push(i)
  order.splice(to, 0, from)
  return order
}

/** Where upstream's move puts row `i`: where the work sets begin once it is taken out (placeRow). */
export function movedTo(rows, i) {
  const next = rows.filter((_, j) => j !== i)
  const first = next.findIndex(x => !isWarmupRow(x))
  return first === -1 ? next.length : first
}

// The numbers a suggestion is: what plainRows and upstream's build write on a row.
const KEYS = ['w', 'r', 'weightOrigin', 'hvLast']
function take(row, from) {
  const out = { ...row }
  for (const k of KEYS) {
    if (from[k] !== undefined) out[k] = from[k]
    else delete out[k]
  }
  if (!isSideSet(row) || !isSideSet(from)) return out
  const side = k => {
    const s = { ...row.sides[k] }
    for (const f of ['w', 'r', 'weightOrigin']) {
      if (from.sides[k][f] !== undefined) s[f] = from.sides[k][f]
      else delete s[f]
    }
    return s
  }
  return syncSideAggregate({ ...out, sides: { L: side('L'), R: side('R') } })
}

/**
 * The rows `after` (upstream's, the row at `from` moved to `to`) with their suggestions back on
 * their slots. `free(i)` says whether old row `i` still showed a suggestion (unticked, untouched),
 * `prev` is last time's set for each new row (previousSetsFor over `after`), `mode` the exercise's.
 */
export function relaySuggestions(before, after, from, to, free, prev = [], mode = 'reps') {
  const order = moveOrder(before.length, from, to)
  // Each kind's slots before the change: the row's numbers when it showed a suggestion, else null.
  const slots = { warm: [], work: [] }
  before.forEach((row, i) => slots[isWarmupRow(row) ? 'warm' : 'work'].push(free(i) ? row : null))
  const seen = { warm: 0, work: 0 }
  return after.map((row, j) => {
    const kind = isWarmupRow(row) ? 'warm' : 'work'
    const n = seen[kind]++
    if (row.done || !free(order[j])) return row
    if (n < slots[kind].length) return slots[kind][n] ? take(row, slots[kind][n]) : row
    const p = prev[j]
    return p && isWarmupRow(p) === isWarmupRow(row) ? fill(row, p, mode) : row
  })
}
