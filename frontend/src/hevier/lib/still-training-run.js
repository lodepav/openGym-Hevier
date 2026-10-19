// D60 at run time: checks the open workout every minute and when the app comes back, and asks.
import { t } from '../../lib/i18n.js'
import { menuSheet, confirmSheet } from '../../sheets.jsx'
import { nav } from '../../lib/nav.js'
import { SAVE_PATH } from '../hooks.js'
import { durationWords } from './elapsed.js'
import { stillDue, keepGoing, lastTickMin, readSeen, writeSeen } from './still-training.js'
import { discardActive } from '../components/HevyTabBar.jsx'

let started = false
export function initStillTraining(getState) {
  if (started) return
  started = true
  const check = () => {
    const A = getState()?.active
    const now = Date.now()
    if (document.hidden || location.hash.includes(SAVE_PATH) || !stillDue(A, now, readSeen())) return
    // Answered by being asked: Keep going, a tap outside or Finish then Back all wait five hours.
    writeSeen(keepGoing(A, now))
    const upTo = lastTickMin(A)
    menuSheet({
      title: t('Still training?'),
      subtitle: t('This workout has been going for {0}.', durationWords(now - A.start)),
      items: [
        { icon: 'play', label: t('Keep going'), onClick: () => {} },
        { icon: 'check', label: t('Finish workout'), sub: upTo ? t('Ends at your last set, {0}', durationWords(upTo * 60000)) : null,
          onClick: () => nav(SAVE_PATH, { state: { durationMin: upTo || null } }) },
        { icon: 'xmark', label: t('Discard workout'), danger: true, onClick: () => confirmSheet({
          title: t('Discard workout?'), message: t('The sets you logged in this session will be lost.'), confirmText: t('Discard'), danger: true,
          onConfirm: discardActive,
        }) },
      ],
    })
  }
  setInterval(check, 60000)
  document.addEventListener('visibilitychange', check)
  setTimeout(check, 3000)
}
