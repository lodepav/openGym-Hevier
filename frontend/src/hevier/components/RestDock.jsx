// The rest between sets, docked at the bottom of the live workout (hevier/DECISIONS.md D127): the
// countdown (a tap sets the time left on upstream's wheel), the next set beside it, +1 min, +2 min
// and Skip. It is upstream's rest timer (store/useUI.js) drawn another way: upstream's bar steps
// aside on this screen while there is a rest (hevier.css, body.hv-docked), and both go when it ends.
// A timed set's countdown and a hold's count-in keep upstream's bar.
import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t } from '../../lib/i18n.js'
import { dockNext } from '../lib/dock-next.js'
import { adjustRestSheet } from '../../components/RestTimer.jsx'

const clock = sec => Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0')

export default function RestDock() {
  const timer = useUI(s => s.timer)
  const other = useUI(s => !!(s.work || s.countIn))
  // only what the panel shows of the session: the dock re-renders when the next set changes, not on every keystroke
  const next = useStore(useShallow(s => (timer && !timer.ready ? dockNext(s.S, timer.forIdx) : null)))
  const mine = !!timer && !other
  const shown = mine && !timer.ready
  useEffect(() => {
    document.body.classList.toggle('hv-docked', mine)
    document.body.classList.toggle('hv-dock-room', shown)   // the page's room for the panel, while it is there
    return () => document.body.classList.remove('hv-docked', 'hv-dock-room')
  }, [mine, shown])
  // The page keeps room for the panel at its measured height: at large text it outgrows a fixed one (R12-U5).
  const box = useRef(null)
  useEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => document.body.style.setProperty('--hv-dock-h', el.offsetHeight + 'px'))
    ro.observe(el)
    return () => { ro.disconnect(); document.body.style.removeProperty('--hv-dock-h') }
  }, [shown])
  if (!shown) return null
  const { addRest, skipRest } = useUI.getState()
  const pct = timer.total > 0 ? Math.max(0, Math.min(1, timer.left / timer.total)) : 0
  return <div className="hv-dock" ref={box} role="region" aria-label={t('Rest')}>
    <div className="hv-dock-top">
      <button type="button" className="hv-dock-clock" onClick={adjustRestSheet}
        aria-label={(timer.kind === 'switch' ? t('Switch sides') + ', ' : timer.paused ? t('Paused') + ', ' : '') + clock(timer.left) + '. ' + t('Change the time left')}>
        <span className="hv-dock-cap">{timer.kind === 'switch' ? t('Switch sides') : timer.paused ? t('Paused') : t('Rest')}</span>
        <b role="timer">{clock(timer.left)}</b>
      </button>
      {next && <div className="hv-dock-next"><span className="hv-dock-cap">{t('Next') + ' · ' + next.cap}</span>{next.what && <b>{next.what}</b>}</div>}
    </div>
    <div className="hv-dock-bar" aria-hidden="true"><i style={{ transform: `scaleX(${pct})` }} /></div>
    <div className="hv-dock-btns">
      <button type="button" className="btn" onClick={() => addRest(60)}>{t('+1 min')}</button>
      <button type="button" className="btn" onClick={() => addRest(120)}>{t('+2 min')}</button>
      <button type="button" className="btn primary" onClick={() => skipRest()}>{t('Skip')}</button>
    </div>
  </div>
}
