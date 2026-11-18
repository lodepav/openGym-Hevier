// The phone's workout notification starts at upstream's current exercise (`active.cur`,
// lib/live-activity.js upcomingSets), but the fork's list opens sets by its own rule (D127,
// open-set.js) and never moved `cur` as you trained. A swap or an add made the new exercise
// current, so the notification jumped ahead of the screen. After a tick, a swap or an add, `cur`
// is set to the exercise the screen opens next.
import { openSet } from './open-set.js'
import { newestTick } from './next-set.js'

const ids = A => (A?.entries || []).map(e => e?.id).join('|')

/** The `cur` session `next` should have after the change from `prev`, or null to leave it. */
export function curAfter(prev, next) {
  if (!next?.entries?.length || next.editingWorkoutId) return null
  if (newestTick(prev).at === newestTick(next).at && ids(prev) === ids(next)) return null
  const idx = openSet(next, null)?.idx
  return idx == null || idx === next.cur ? null : idx
}

/** Keeps the running session's `cur` on the set the screen opens (above). */
export function initCurFollow(store) {
  return store.subscribe((state, before) => {
    const A = state.S?.active, B = before.S?.active
    if (!A || !B || A === B || A.id !== B.id) return
    const cur = curAfter(B, A)
    if (cur != null) store.update(s => { if (s.active?.id === A.id) s.active.cur = cur })
  })
}
