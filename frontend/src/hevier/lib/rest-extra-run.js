// The rests of rest-extra.js at run time, and Hevy's timer that goes away once the rest is over
// (asked 2026-10-20: upstream's stays on Ready until dismissed).
import { useUI } from '../../store/useUI.js'
import { restDue, restFor } from './rest-extra.js'

/** How long Ready shows before the rest bar goes. */
export const READY_MS = 3000

let started = false
export function initRestExtra(store) {
  if (started) return
  started = true
  store.subscribe((state, prev) => {
    const due = restDue(prev?.S?.active, state?.S?.active)
    if (!due) return
    // After upstream's own tick flow, which runs once the store has changed and may start a rest
    // or stop one.
    setTimeout(() => {
      const A = store.get()?.active
      const ui = useUI.getState()
      if (!A?.entries?.[due.idx] || (due.kind === 'unit' && ui.timer && !ui.timer.ready)) return
      ui.startRest(restFor(A, due.idx, due.i, store.get().restSec), due.idx, { forSet: due.i })
    }, 0)
  })
  let readyAt = null
  useUI.subscribe(s => {
    const tm = s.timer
    if (!tm?.ready || tm === readyAt) return
    readyAt = tm
    setTimeout(() => { if (useUI.getState().timer === tm) useUI.getState().stopRest() }, READY_MS)
  })
}
