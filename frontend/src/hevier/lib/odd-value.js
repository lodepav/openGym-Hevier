// A weight or rep count typed far past anything logged for the exercise is most likely a typo
// (300 for 30): the tick asks before it logs it (D90). Over twice the best and at least 10 kg
// (20 lb) or 10 reps more, so a real jump never asks; an exercise with nothing logged never does.
// Under a third of last time's same set and at least that much less (3 for 30) asks too, and so
// does a cardio timer left running past twice the set's time and 10 minutes more.
import { isSideSet } from '../../lib/workout-model.js'
import { isHoldRow } from './hold-set.js'

// Ticked ones only: a saved workout keeps its unticked rows too.
const rowsOf = s => (isSideSet(s) ? [s.sides?.L, s.sides?.R] : isHoldRow(s) ? [] : [s]).filter(x => x?.done)

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

/**
 * What in `row` ({ w, r }) looks mistyped: [{ f: 'w' | 'r', typed, best, low }], against the
 * exercise's `best` (too high) and `last`, last time's same set ({ w, r }, too low; `low: true`).
 */
export function oddValues(row, best, { unit = 'kg', assisted = false, last = null } = {}) {
  const out = []
  const w = Number(row?.w) || 0, r = Number(row?.r) || 0
  const lw = Number(last?.w) || 0, lr = Number(last?.r) || 0
  const kg = unit === 'lb' ? 20 : 10
  if (!assisted && best.w > 0 && w > 2 * best.w && w - best.w >= kg) out.push({ f: 'w', typed: w, best: best.w })
  else if (!assisted && lw > 0 && w < lw / 3 && lw - w >= kg) out.push({ f: 'w', typed: w, best: lw, low: true })
  if (best.r > 0 && r > 2 * best.r && r - best.r >= 10) out.push({ f: 'r', typed: r, best: best.r })
  else if (lr > 0 && r < lr / 3 && lr - r >= 5) out.push({ f: 'r', typed: r, best: lr, low: true })
  return out
}

/** Whether `sec` run on a cardio set's timer looks forgotten against its time `planned` and last time's. */
export function longRun(sec, planned, last) {
  const ref = Math.max(Number(planned) || 0, Number(last) || 0)
  return ref > 0 && sec > 2 * ref && sec - ref >= 600 ? ref : 0
}
