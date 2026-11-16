// "Redoing A restarts from that workout" (D124): a finished workout on a session the running
// rotation pass already counts done starts the pass over from that session, so its next session
// is the one after it in the rotation, not whatever the old pass still had open.
import { todayISO } from '../../lib/format.js'
import { queueOf, queueDone } from '../../lib/queue.js'
import { rotationIds, sequenceOf, isSimpleSequence } from '../../lib/rotation.js'

const idsOf = w => (Array.isArray(w?.routineIds) ? w.routineIds : (w?.routineId ? [w.routineId] : []))

/**
 * Called with the state `w` has just been written into, before upstream's refillAfter. Returns
 * true when it replaced `s.queue` with a pass that begins at the redone session.
 */
export function restartOnRedo(s, w, today = todayISO()) {
  const q = queueOf(s)
  if (!q?.rotationId || !s.rotation?.id || q.rotationId !== s.rotation.id) return false
  // A loop with rest days or repeats keeps upstream's segments (#536).
  if (!isSimpleSequence(sequenceOf(s))) return false
  const seq = rotationIds(s)
  if (seq.length !== q.ids.length || !seq.every(id => q.ids.includes(id))) return false
  if (!Number.isFinite(w?.start) || !w.d) return false
  // The new pass is strict from this workout's start, so a workout of the pass started after it
  // would count too: such a backdated finish credits as upstream does.
  // shortcut: a backfilled redo older than the pass's latest workout does not restart, upgrade if users backfill redos.
  const others = (s.workouts || []).filter(x => x !== w && (w.id == null || x.id !== w.id))
  if (others.some(x => (x.start ?? 0) >= w.start && idsOf(x).some(id => q.ids.includes(id)))) return false
  const before = queueDone({ ...s, workouts: others }, w.d > today ? w.d : today)
  const credited = idsOf(w)
  const redo = seq.find(id => credited.includes(id) && before.includes(id))
  if (!redo) return false
  const i = seq.indexOf(redo)
  // strict: only the clock counts (queue.js), so the old pass's workouts, by name or date, never do.
  s.queue = { ids: [...seq.slice(i), ...seq.slice(0, i)], since: w.start, startsOn: w.d, label: s.rotation.label || '', rotationId: s.rotation.id, strict: true }
  return true
}
