// The Hevy PREVIOUS column (hevier/DECISIONS.md D3): for each row of an exercise in the running
// session, the matching set from the last time it was done — warm-up N against last time's warm-up
// N, work set N against last time's work set N. Read-only over upstream's history; nothing here
// changes what is logged or how the next session is built.
import { lastEntryFor } from '../../lib/history.js'
import { isWarmupRow } from '../../lib/workout-model.js'

// Last time's finished warm-ups, from the same saved workout lastEntryFor read the work sets from.
// lastEntryFor leaves warm-ups out on purpose (they must not seed progression); the column still
// wants them, so they are looked up beside it rather than by changing that helper.
function lastWarmups(H, exId, last) {
  const workouts = H.workouts || []
  for (let i = workouts.length - 1; i >= 0; i--) {
    const w = workouts[i]
    if (w.d !== last.d) continue
    const en = (w.entries || []).find(e => e && e.id === exId && (!last.rid || !e.rid || e.rid === last.rid))
    if (en) return (en.sets || []).filter(s => s.done && isWarmupRow(s))
  }
  return []
}

/**
 * One slot per row of `entry.sets`: the previous set it lines up with, or null when last time had
 * no set at that position (or there was no last time). `H` is the history the session reads from
 * (backfill's sessionHistory, so a workout logged into the past is held against what came before it).
 */
export function previousSetsFor(H, entry) {
  const rows = entry?.sets || []
  const last = entry ? lastEntryFor(H, entry.id, entry.rid) : null
  if (!last) return rows.map(() => null)
  const warm = lastWarmups(H, entry.id, last)
  let w = 0, k = 0
  return rows.map(row => (isWarmupRow(row) ? warm[w++] : last.sets[k++]) || null)
}
