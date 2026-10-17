// D46 at run time: learns from the swaps the fork's picker makes, and makes a gym's swaps when a
// routine starts there or the session's gym changes. The picker says when a pick is a swap
// (armSwap), since an exercise added mid-workout also carries its routine's `rid` and only the
// swap's own sheet knows which is which; the swap itself is upstream's, so the learning waits for
// the session to show it (its settings sheet or the "keep what's logged" question come first).
import { t, exerciseNameFor } from '../../lib/i18n.js'
import { exOr } from '../../lib/exercises.js'
import { workoutGym, gymName } from './gym-labels.js'
import { learnSwap, plannedSwaps, applyGymSwaps, undoGymSwaps } from './gym-backups.js'

const ARMED_MS = 5 * 60e3
let armed = null

const countOf = (A, id, rid) => (A?.entries || []).filter(e => e?.id === id && (e.rid || null) === rid).length

/** The fork's picker, opened to swap the live session's exercise `like`, wraps its pick with this. */
export function armSwap(getState, like, onPick) {
  return (pick, ...rest) => {
    const S = getState()
    const A = S?.active
    const entry = (A?.entries || []).find(e => e?.id === like)
    if (entry?.rid && pick?.id && pick.id !== like) {
      armed = { rid: entry.rid, from: like, to: pick.id, gymId: workoutGym(S, A), start: A.start, had: countOf(A, pick.id, entry.rid), at: Date.now() }
    }
    return onPick(pick, ...rest)
  }
}

const sessionKey = A => (A ? `${A.start}|${A.backfill ? 'b' : ''}|${A.editingWorkoutId ?? ''}` : '')
const nameOf = id => exerciseNameFor(exOr(id))

/** At launch (hevier/index.js). `subscribe` gets (state, previous) of the whole store. */
let started = false
export function initGymBackups(getState, update, subscribe, toast) {
  if (started) return
  started = true
  const swapNow = () => {
    const S = getState()
    if (!plannedSwaps(S).length) return
    let done = []
    update(s => { done = applyGymSwaps(s) })
    if (!done.length) return
    const gym = gymName(getState(), workoutGym(getState(), getState().active)) || t('this gym')
    toast(t('Swapped for {0}: {1}', gym, done.map(p => `${nameOf(p.from)} → ${nameOf(p.to)}`).join(', ')), {
      action: t('Undo'), onAction: () => update(s => { undoGymSwaps(s, done) }),
    })
  }
  subscribe((st, prev) => {
    const A = st.S?.active, P = prev.S?.active
    if (A === P) return
    // Learn from an armed swap once the session shows the swapped-in exercise.
    if (armed) {
      if (!A || A.start !== armed.start || Date.now() - armed.at > ARMED_MS) armed = null
      else if (countOf(A, armed.to, armed.rid) > armed.had) {
        const a = armed
        armed = null
        setTimeout(() => update(s => { learnSwap(s, a) }), 0)
      }
    }
    // A routine just started, or the session's gym changed: the gym's swaps.
    const begun = A && sessionKey(A) !== sessionKey(P)
    const moved = A && P && sessionKey(A) === sessionKey(P) && workoutGym(st.S, A) !== workoutGym(prev.S, P)
    if (begun || moved) setTimeout(swapNow, 0)
  })
}
