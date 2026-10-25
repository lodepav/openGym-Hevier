// A weight or rep count typed far past anything logged for the exercise is most likely a typo
// (300 for 30): the tick asks before it logs it (D90). Over twice the best and at least 10 kg
// (20 lb) or 10 reps more, so a real jump never asks; an exercise with nothing logged never does.
import { isSideSet } from '../../lib/workout-model.js'
import { isHoldRow } from './hold-set.js'

const rowsOf = s => (isSideSet(s) ? [s.sides?.L, s.sides?.R].filter(Boolean) : isHoldRow(s) ? [] : [s])

/** The heaviest weight and the most reps of any set logged for `exId` (a side counted alone). */
export function bestsFor(S, exId) {
  let w = 0, r = 0
  for (const wk of S?.workouts || []) for (const e of wk.entries || []) {
    if (e.id !== exId) continue
    for (const s of e.sets || []) for (const x of rowsOf(s)) {
      w = Math.max(w, Number(x.w) || 0)
      r = Math.max(r, Number(x.r) || 0)
    }
  }
  return { w, r }
}

/** What in `row` ({ w, r }) looks mistyped against `best`: [{ f: 'w' | 'r', typed, best }]. */
export function oddValues(row, best, { unit = 'kg', assisted = false } = {}) {
  const out = []
  const w = Number(row?.w) || 0, r = Number(row?.r) || 0
  if (!assisted && best.w > 0 && w > 2 * best.w && w - best.w >= (unit === 'lb' ? 20 : 10)) out.push({ f: 'w', typed: w, best: best.w })
  if (best.r > 0 && r > 2 * best.r && r - best.r >= 10) out.push({ f: 'r', typed: r, best: best.r })
  return out
}
