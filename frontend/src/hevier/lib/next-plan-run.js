// D128 at run time: a workout started on a routine opens with the numbers planned for it, laid over
// what upstream's start built (its start-from-last, seam S40, has run by then), and the plan is used
// up when that workout is saved; a discarded workout leaves it for the next one.
import { openWithPlan, endPlans, usedBy } from './next-plan.js'

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
const logged = A => (A?.entries || []).some(e => (e?.sets || []).some(s => s?.done))

/**
 * What the running session's change from `P` to `S` does to the plans, or null: `lay`, the routines
 * whose plan a session just started opens with (`id` the session's), and `ended`, `{ id, saved }`
 * of a session that had opened with a plan. A session synced in already laid (its plan marked as
 * its own), an edited saved workout, a past one logged and one with sets already ticked lay nothing.
 */
export function planTurn(S, P) {
  const A = S?.active, B = P?.active
  if (A?.id === B?.id) return null
  const out = {}
  if (B?.id != null && usedBy(S, B.id).length) out.ended = { id: B.id, saved: (S.workouts || []).some(w => w?.id === B.id) }
  if (A && A.editingWorkoutId == null && !A.backfill && !logged(A)) {
    const lay = (A.routineIds || []).filter(rid => isMap(S.hvPlan?.[rid]?.ex) && S.hvPlan[rid].used !== A.id)
    if (lay.length) Object.assign(out, { lay, id: A.id })
  }
  return out.ended || out.lay ? out : null
}

/** At launch (hevier/index.js). */
let started = false
export function initNextPlan(store) {
  if (started) return
  started = true
  store.subscribe((st, prev) => {
    const turn = st.S !== prev.S && planTurn(st.S, prev.S)
    if (!turn) return
    // After the start's own steps (the gym's swaps, D46), as label-refill-run.js waits for them.
    setTimeout(() => store.update(s => {
      if (turn.ended) endPlans(s, turn.ended.id, turn.ended.saved)
      if (turn.lay && s.active?.id === turn.id) openWithPlan(s, turn.lay)
    }), 0)
  })
}
