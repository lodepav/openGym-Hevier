// The rest between sets, docked at the bottom of the live workout (hevier/DECISIONS.md D127): the
// countdown (a tap sets the time left on upstream's wheel), the next set beside it, +1 min, +2 min
// and Skip. It is upstream's rest timer (store/useUI.js) drawn another way: upstream's bar steps
// aside on this screen while there is a rest (hevier.css, body.hv-docked), and both go when it ends.
// A timed set's countdown and a hold's count-in keep upstream's bar.
import { useEffect } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t } from '../../lib/i18n.js'
import { restNextLine } from '../../lib/rest-next.js'
import { adjustRestSheet } from '../../components/RestTimer.jsx'

const clock = sec => Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0')

export default function RestDock() {
  const timer = useUI(s => s.timer)
  const other = useUI(s => !!(s.work || s.countIn))
  const next = useStore(s => (timer && !timer.ready ? restNextLine(s.S, timer.forIdx) : ''))
  const mine = !!timer && !other
  const shown = mine && !timer.ready
  useEffect(() => {
    document.body.classList.toggle('hv-docked', mine)
    document.body.classList.toggle('hv-dock-room', shown)   // the page's room for the panel, while it is there
    return () => document.body.classList.remove('hv-docked', 'hv-dock-room')
  }, [mine, shown])
  if (!shown) return null
  const { addRest, skipRest } = useUI.getState()
  const pct = timer.total > 0 ? Math.max(0, Math.min(1, timer.left / timer.total)) : 0
  return <div className="hv-dock" role="region" aria-label={t('Rest')}>
    <div className="hv-dock-top">
      <button type="button" className="hv-dock-clock" onClick={adjustRestSheet}
        aria-label={clock(timer.left) + '. ' + t('Change the time left')}>
        <span className="hv-dock-cap">{timer.kind === 'switch' ? t('Switch sides') : timer.paused ? t('Paused') : t('Rest')}</span>
        <b role="timer">{clock(timer.left)}</b>
      </button>
      {next && <div className="hv-dock-next"><span className="hv-dock-cap">{t('Next')}</span><b>{next}</b></div>}
    </div>
    <div className="hv-dock-bar" aria-hidden="true"><i style={{ transform: `scaleX(${pct})` }} /></div>
    <div className="hv-dock-btns">
      <button type="button" className="btn" onClick={() => addRest(60)}>{t('+1 min')}</button>
      <button type="button" className="btn" onClick={() => addRest(120)}>{t('+2 min')}</button>
      <button type="button" className="btn primary" onClick={() => skipRest()}>{t('Skip')}</button>
    </div>
  </div>
}
