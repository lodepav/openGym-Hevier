// The Hevy PREVIOUS column (hevier/DECISIONS.md D3, D21): for each row of an exercise in the running
// session, the matching set from the last time it was done — warm-up N against last time's warm-up
// N, work set N against last time's work set N. Read-only over upstream's history; nothing here
// changes what is logged or how the next session is built.
import { entryExcluded, entryRoutineId } from '../../lib/history.js'
import { isWarmupRow } from '../../lib/workout-model.js'
import { entryLabelKey, isCable } from './gym-labels.js'

// Each counting past session of the exercise, newest first, as its finished warm-ups and work sets:
// with a routine id that routine's own sessions first, then the rest (upstream's lastEntryFor
// order, issue #216, carried on past the last session). Warm-ups are read here beside the work
// sets, as lastEntryFor leaves them out on purpose (they must not seed progression). With a label
// (D82: a brand, a cable setup), the sessions done with it come first, then those done with none;
// another brand's are never read. No label reads every session, as before, but a cable always has
// one: '' is its unbranded 1:1, and its setup is kept in the fallback (`LF|x2` falls back to `|x2`,
// never to 1:1), so a ×2's per-stack numbers and a 1:1's never fill each other.
function* pastSessions(H, exId, rid, label) {
  const workouts = H?.workouts || []
  const seen = new Set()
  const cut = label ? label.lastIndexOf('|') : -1
  const keys = label ? [label, cut >= 0 ? label.slice(cut) : ''] : isCable(exId) ? [''] : [null]
  for (const lk of keys) for (const own of rid ? [true, false] : [false]) {
    for (let i = workouts.length - 1; i >= 0; i--) {
      const w = workouts[i]
      const en = (w.entries || []).find(e => e && e.id === exId && (!own || entryRoutineId(w, e) === rid) && (lk == null || entryLabelKey(e) === lk))
      if (!en || seen.has(en) || entryExcluded(w, en)) continue
      seen.add(en)
      const done = (en.sets || []).filter(s => s.done)
      const work = done.filter(s => !isWarmupRow(s))
      if (work.length) yield { warm: done.filter(isWarmupRow), work }
    }
  }
}

/** Settings → Previous values (D21): 'routine' (the default, D3's rule) or 'any'. */
export const previousMode = S => (S?.hvPrevious === 'any' ? 'any' : 'routine')

/**
 * One slot per row of `entry.sets`: the previous set it lines up with, or null when last time had
 * no set at that position (or there was no last time). `H` is the history the session reads from
 * (backfill's sessionHistory, so a workout logged into the past is held against what came before it).
 * `mode` 'any' skips the same-routine lookup: the newest workout with the exercise. A slot the last
 * session lacked is read from the last one that had it; `walk: false` keeps to the last session.
 * `label` is the session's label key (gym-labels.js labelKey, D82): its sessions first, then
 * unlabelled ones (a cable's: the same setup's); '' or none reads them all, but a cable's '' is its
 * unbranded 1:1.
 */
export function previousSetsFor(H, entry, mode = 'routine', { walk = true, label = '' } = {}) {
  const rows = entry?.sets || []
  const out = rows.map(() => null)
  if (!entry || !rows.length) return out
  // Row r is warm-up wi or work set ki; a slot last time lacked is read from the last session
  // that had it (Hevy's way: a fourth set done two weeks ago still shows).
  let w = 0, k = 0
  const slots = rows.map(row => (isWarmupRow(row) ? ['warm', w++] : ['work', k++]))
  let open = rows.length
  for (const past of pastSessions(H, entry.id, mode === 'any' ? null : entry.rid, label)) {
    slots.forEach(([kind, n], r) => { if (!out[r] && past[kind][n]) { out[r] = past[kind][n]; open-- } })
    if (!open || !walk) break
  }
  return out
}
