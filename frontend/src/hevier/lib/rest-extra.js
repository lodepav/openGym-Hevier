// Hevy's rests where upstream starts none (asked 2026-10-20): after the first side of a per-side
// set, which upstream's tick flow does not count as a set done (its row is done only with both
// sides), and after an exercise's last set, which upstream leaves without a rest when the next
// exercise opens with a warm-up, or when it was the workout's last. Read off two copies of the
// running session; the rest is timed as upstream times the set's (restSecFor).
import { isSideSet, isWarmupRow } from '../../lib/workout-model.js'
import { supersetUnits } from '../../lib/history.js'
import { restSecFor, warmupRestSecFor } from '../../lib/supersetFlow.js'
import { pyramidRestFor } from '../../lib/pyramid.js'

const live = A => !!A && !A.backfill && !A.editingWorkoutId
const sideDone = (s, k) => !!s?.sides?.[k]?.done

/**
 * The set whose tick in `after` may be owed a rest upstream does not start, or null:
 * `{ idx, i, kind }`, kind 'side' (one side of a per-side set) or 'unit' (the tick finished its
 * exercise, or its superset's round of last sets). Only one tick apart: a session swapped or
 * rebuilt wholesale owes nothing. A 'unit' rest is due only when no rest is running by then.
 */
export function restDue(before, after) {
  if (!live(before) || !live(after) || before.start !== after.start) return null
  const E0 = before.entries || [], E1 = after.entries || []
  if (E0.length !== E1.length) return null
  let hit = null
  for (let idx = 0; idx < E1.length; idx++) {
    const a = E0[idx]?.sets || [], b = E1[idx]?.sets || []
    if (E0[idx]?.id !== E1[idx]?.id || a.length !== b.length) return null
    for (let i = 0; i < b.length; i++) {
      const was = a[i], now = b[i]
      if (isSideSet(now) && !now.done && ['L', 'R'].some(k => sideDone(now, k) && !sideDone(was, k))) hit = { idx, i, kind: 'side' }
      else if (now.done && !was?.done) hit = hit || { idx, i, kind: 'tick' }
    }
  }
  if (!hit || hit.kind === 'side') return hit
  const unit = supersetUnits(E1).find(u => u.includes(hit.idx)) || [hit.idx]
  const allDone = es => unit.every(u => (es[u]?.sets || []).every(s => s.done))
  return allDone(E1) && !allDone(E0) ? { ...hit, kind: 'unit' } : null
}

/** How long the rest after set `i` of entry `idx` runs, as upstream works it out. */
export function restFor(A, idx, i, defaultRestSec) {
  const entries = A.entries
  const unit = supersetUnits(entries).find(u => u.includes(idx)) || [idx]
  const setRest = { idx, sec: pyramidRestFor(entries[idx].target, entries[idx].sets, i) }
  const sec = restSecFor(entries, unit, defaultRestSec, setRest)
  return isWarmupRow(entries[idx].sets[i]) ? warmupRestSecFor(entries[idx], i, sec) : sec
}
