// [hevier] The workout header's ⏱ (hevier/DECISIONS.md D10), Hevy's clock: a sheet with a Timer
// and a Stopwatch (ClockSheet.jsx). On the Timer, a running rest shows upstream's "Time left"
// wheel; with none, a wheel that starts a countdown of its own, at the rest set in Settings, with
// the rest's alert (upstream's `startRest`, through `applyRestLeft`, which starts one when no rest
// runs). The sheet opens on the Stopwatch while it has time on it.
import { createElement } from 'react'
import { useUI } from '../../store/useUI.js'
import { useStore } from '../../store/useStore.js'
import { ofSession, showing, useStopwatch } from '../lib/stopwatch.js'
import { ClockSheet } from './ClockSheet.jsx'

export function timerSheet() {
  const session = useStore.getState().S.active?.start ?? null
  const tab = showing(ofSession(useStopwatch.getState().w, session)) ? 'stopwatch' : 'timer'
  return useUI.getState().openSheet(close => createElement(ClockSheet, { close, session, tab }))
}
