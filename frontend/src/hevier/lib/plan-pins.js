// A planned day trains what you picked (D124): "the rotation adapts to my plans". Upstream's
// pinState (lib/queue.js) calls a pin fulfilled once the pass has its session done at any time,
// so a day planned for later reads as rest. Here a pin dated today or later is 'done' only when
// that routine was trained in its own calendar week, up to and including the planned day.
import { todayISO, weekKey, weekStartOf } from '../../lib/format.js'
import { pinState } from '../../lib/queue.js'

const idsOf = w => (Array.isArray(w.routineIds) ? w.routineIds : (w.routineId ? [w.routineId] : []))

/** 'open' | 'done' | null for a dayPlan pin naming `id` on `iso`, as of `today`. */
export function pinOn(S, iso, id, today = todayISO()) {
  const up = pinState(S, id, today)
  if (!up || iso < today) return up
  const from = weekKey(iso, weekStartOf(S))
  const done = (S.workouts || []).some(w => {
    const d = String(w.d || '')
    return d >= from && d <= iso && idsOf(w).includes(id)
  })
  return done ? 'done' : 'open'
}
