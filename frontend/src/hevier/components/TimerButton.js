// [hevier] The workout header's ⏱ (hevier/DECISIONS.md D10), Hevy's clock: with a rest running it
// opens upstream's "Time left" wheel; with none, a wheel that starts a countdown of its own, at
// the rest set in Settings, with the rest's alert (upstream's `startRest`, through
// `applyRestLeft`, which starts one when no rest runs).
import { useUI } from '../../store/useUI.js'
import { useStore } from '../../store/useStore.js'
import { t } from '../../lib/i18n.js'
import { REST_MAX } from '../../lib/duration.js'
import { durationSheet } from '../../components/DurationWheel.jsx'
import { adjustRestSheet, applyRestLeft } from '../../components/RestTimer.jsx'

export function timerSheet() {
  if (useUI.getState().timer) return adjustRestSheet()
  const sec = useStore.getState().S.restSec
  return durationSheet({
    title: t('Timer'), value: sec > 0 ? Math.min(sec, REST_MAX) : 90, min: 5, max: REST_MAX,
    onDone: v => applyRestLeft(v),
  })
}
