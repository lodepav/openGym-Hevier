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

// The Timer is not a rest after a set, so it never leads into a hold that starts by itself
// (lib/auto-holds.js): while its countdown is up, while it starts and while it is skipped, the
// workout screen's hooks (useUI bindAuto) see no next hold. Upstream's rest asks them for one when
// it starts (its "Up next" and the alarm's chain cues), runs out and is skipped.
let quiet = 0
const quietly = fn => { quiet++; try { return fn() } finally { quiet-- } }
/** ClockSheet.jsx starts the Timer's countdown through this: it is marked only once it runs. */
export const startingClock = quietly

/** At launch (hevier/index.js), before the workout screen binds its hooks. */
let chained = false
export function initClockChain(ui = useUI) {
  if (chained) return
  chained = true
  const { bindAuto, skipRest, followNativeRest } = ui.getState()
  const noHold = () => quiet > 0 || isClockTimer(ui.getState().timer)
  ui.setState({
    bindAuto: h => bindAuto(h && { ...h, peek: () => (noHold() ? null : h.peek?.()) }),
    // skipRest stops the countdown before it asks for the next hold, so the mark is read first
    skipRest: (...a) => (isClockTimer(ui.getState().timer) ? quietly(() => skipRest(...a)) : skipRest(...a)),
    // The Android notification's Pause and ±15 s rebuild upstream's timer without the Timer's mark
    // or the rest's kind (its end sound): both are put back.
    followNativeRest: (...a) => {
      const was = ui.getState().timer
      const keep = { ...(was?.hvClock ? { hvClock: true } : {}), ...(was?.rk ? { rk: was.rk } : {}) }
      const out = was?.hvClock ? quietly(() => followNativeRest(...a)) : followNativeRest(...a)
      const tm = ui.getState().timer
      if (tm && Object.keys(keep).length) ui.setState({ timer: { ...tm, ...keep } })
      return out
    },
  })
}
