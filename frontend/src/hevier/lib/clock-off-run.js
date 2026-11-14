// D117: the Timer and Stopwatch switched off (Workout extras → Timer and Stopwatch) ends a Timer
// countdown that is running, so it does not ring for a clock that no longer shows. A rest between
// sets and a set's own timer are core and run on; the Stopwatch only counts, so it is left as it was.
import { useUI } from '../../store/useUI.js'
import { partOn } from './module-parts.js'

// A countdown the Timer started is marked on upstream's timer (`hvClock`), which its ticks carry
// over; a rest after a set starts a new timer without it, so the mark is the Timer's alone.
export const isClockTimer = tm => !!tm && tm.hvClock === true && !tm.ready

/** At launch (hevier/index.js): wakes when a module or a part is switched. */
let started = false
export function initClockOff(store, ui = useUI) {
  if (started) return
  started = true
  store.watch(['modules', 'hvModuleParts'])(() => {
    if (!partOn(store.get(), 'hvWorkout', 'clock') && isClockTimer(ui.getState().timer)) ui.getState().stopRest()
  })
}
