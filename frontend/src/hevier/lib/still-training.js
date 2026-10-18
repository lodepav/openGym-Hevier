// D60: Hevy's "Still training?". A workout left open for five hours is asked about once, while the
// app is open; Keep going asks again five hours later, Finish opens Save Workout with the length
// ending at the last ticked set. What was answered is kept on the device only (`hevier_still`).
import { hasCompletedWork } from '../../lib/workout-model.js'

export const STILL_AFTER = 5 * 3600e3
const KEY = 'hevier_still'

const live = A => !!A && !A.editingWorkoutId && !A.backfill && A.start > 0

/** Whether to ask now: a live session open for STILL_AFTER, not answered since (`seen`). */
export function stillDue(A, now, seen) {
  if (!live(A) || now - A.start < STILL_AFTER) return false
  return !(seen && seen.start === A.start && now < seen.next)
}

/** After Keep going: ask again STILL_AFTER from now. */
export const keepGoing = (A, now) => ({ start: A.start, next: now + STILL_AFTER })

/** The session's length up to its last ticked set, in whole minutes (at least 1), or null. */
export function lastTickMin(A) {
  let last = 0
  for (const e of A?.entries || []) for (const s of e?.sets || []) if (hasCompletedWork(s) && s.at > last) last = s.at
  return last > A.start ? Math.max(1, Math.ceil((last - A.start) / 60000)) : null
}

export function readSeen() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null } catch { return null }
}
export function writeSeen(v) {
  try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* private mode: asks again */ }
}
