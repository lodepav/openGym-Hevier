// A hold on the big clock (D89) ends on its own once its seconds are up: the time is written into
// the set (set-timer.js caps it at the goal, so a hold that ran out while the app was hidden is
// written as held), with the rest's end sound and buzz while the app is on screen. Checked every
// second and on coming back to the app.
import { dueGoals, stopped } from './set-timer.js'
import { chime, alertBuzz, restSoundOf } from '../../lib/sound.js'
import { fmtSec } from '../../lib/history.js'
import { t } from '../../lib/i18n.js'

let started = false
export function initHoldClock(store) {
  if (started) return
  started = true
  const check = () => {
    const S = store.get()
    const due = dueGoals(S?.active)
    if (!due.length) return
    let held = 0
    store.update(st => {
      for (const [ei, si] of due) {
        const e = st.active?.entries?.[ei]
        if (!e?.sets?.[si]) continue
        e.sets[si] = stopped(e.sets[si], 'time')
        held = e.sets[si].sec || held
      }
    })
    if (document.visibilityState !== 'visible') return
    chime(S.sound, restSoundOf(S))
    alertBuzz([200, 100, 200])
    store.toast?.(t('Hold done · {0}', fmtSec(held)))
  }
  setInterval(check, 1000)
  document.addEventListener('visibilitychange', check)
}
