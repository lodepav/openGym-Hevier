// [hevier] The workout header's clock (hevier/DECISIONS.md D10): Timer · Stopwatch, as Hevy's.
// The Timer is the wheel the ⏱ always opened (upstream's adjustRestSheet / applyRestLeft, drawn
// here so the two tabs share one sheet): a running rest's "Time left", or with none a countdown
// at the rest set in Settings, with the rest's alert (`applyRestLeft` starts one when no rest
// runs). The Stopwatch only counts (hevier/lib/stopwatch.js); the sheet opens on it while it has
// time on it.
import { useEffect, useRef, useState } from 'react'
import { useUI } from '../../store/useUI.js'
import { useStore } from '../../store/useStore.js'
import { t } from '../../lib/i18n.js'
import { REST_MAX, fmtDuration } from '../../lib/duration.js'
import DurationWheel from '../../components/DurationWheel.jsx'
import { applyRestLeft } from '../../components/RestTimer.jsx'
import { Button, Segmented } from '../../components/ui.jsx'
import { elapsed, running, startW, stopW, resetW, ofSession, showing, stopwatchText, stopwatchShort, useStopwatch } from '../lib/stopwatch.js'

function TimerTab({ close }) {
  // What the ⏱ opened before the tabs: a running rest's time left, else a new countdown.
  const [{ opened, start }] = useState(() => {
    const tm = useUI.getState().timer
    if (tm) return { opened: tm.ready ? 0 : Math.min(tm.left, REST_MAX), start: null }
    const sec = useStore.getState().S.restSec
    return { opened: undefined, start: sec > 0 ? Math.min(sec, REST_MAX) : 90 }
  })
  const resting = opened !== undefined
  const [v, setV] = useState(resting ? opened : start)
  const read = useRef(null)
  const off = resting ? t('Skip') : null
  return <>
    <div className="dw-read" aria-hidden="true">{fmtDuration(v, { off })}</div>
    <DurationWheel value={v} onChange={setV} min={resting ? 0 : 5} max={REST_MAX} off={off} readRef={read} />
    {resting && <p className="dim small dw-foot">{t('Scroll to 0:00 to end the rest now.')}</p>}
    <Button variant="primary" onClick={() => { const now = read.current ? read.current() : v; close(); applyRestLeft(now, opened) }}>
      {resting ? t('Done') : t('Start timer')}</Button>
  </>
}

function StopwatchTab({ session }) {
  const w = ofSession(useStopwatch(s => s.w), session)
  const apply = useStopwatch(s => s.apply)
  const [, tick] = useState(0)
  const on = running(w)
  useEffect(() => {
    if (!on) return
    const id = setInterval(() => tick(n => n + 1), 100)
    return () => clearInterval(id)
  }, [on])
  const ms = elapsed(w, Date.now())
  const go = fn => apply(cur => fn(ofSession(cur, session), Date.now()))
  return <>
    <div className="dw-read hv-sw" role="timer" aria-label={t('Stopwatch')}>{stopwatchText(ms)}</div>
    <div className="hv-sw-btns">
      <Button onClick={() => go(resetW)} disabled={on || ms === 0}>{t('Reset')}</Button>
      <Button variant="primary" onClick={() => go(on ? stopW : startW)}>{on ? t('Stop') : ms ? t('Resume') : t('Start')}</Button>
    </div>
  </>
}

export function ClockSheet({ close, session, tab: first = 'timer' }) {
  const [tab, setTab] = useState(first)
  return <>
    <Segmented className="hv-xd-tabs" value={tab} onChange={setTab}
      options={[{ value: 'timer', label: t('Timer') }, { value: 'stopwatch', label: t('Stopwatch') }]} />
    <div style={{ height: 12 }} />
    {tab === 'timer' ? <TimerTab close={close} /> : <StopwatchTab session={session} />}
    <div style={{ height: 8 }} />
  </>
}

/** Opens the clock sheet from the header's ⏱. */
export function timerSheet() {
  const session = useStore.getState().S.active?.start ?? null
  const tab = showing(ofSession(useStopwatch.getState().w, session)) ? 'stopwatch' : 'timer'
  return useUI.getState().openSheet(close => <ClockSheet close={close} session={session} tab={tab} />)
}

/** The header's ⏱: the stopwatch's time beside it while it has some (spoken as "Stopwatch 1:05"). */
export function HeaderClock({ session }) {
  const w = ofSession(useStopwatch(s => s.w), session)
  const [, tick] = useState(0)
  const on = running(w)
  useEffect(() => {
    if (!on) return
    const id = setInterval(() => tick(n => n + 1), 1000)
    return () => clearInterval(id)
  }, [on])
  const ms = elapsed(w, Date.now())
  if (!ms && !on) return null
  return <span className={'hv-swh' + (on ? ' on' : '')}><span className="vh">{t('Stopwatch')} </span>{stopwatchShort(ms)}</span>
}
