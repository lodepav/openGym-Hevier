// [hevier] The workout header's clock (hevier/DECISIONS.md D10): Timer · Stopwatch, as Hevy's.
// The Timer is the wheel the ⏱ always opened (upstream's adjustRestSheet / applyRestLeft, drawn
// here so the two tabs share one sheet): a running rest's "Time left", or with none a countdown
// at the time it last ran (`S.hvTimerSec`, else the rest set in Settings), with the rest's alert
// (`applyRestLeft` starts one when no rest runs). While its countdown runs the sheet shows it as
// Hevy does, a large ring with −15 · +15 · Skip; a rest between sets keeps upstream's bar. The Stopwatch only counts (hevier/lib/stopwatch.js); the sheet opens on it while it has
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

// A countdown the Timer started is marked on upstream's timer (`hvClock`), which its ticks carry
// over; a rest after a set starts a new timer without it, so the mark is the Timer's alone.
const isClock = tm => !!tm && tm.hvClock === true && !tm.ready
const lastTimer = S => (S.hvTimerSec > 0 ? S.hvTimerSec : S.restSec > 0 ? S.restSec : 90)

function TimerTab({ close }) {
  const timer = useUI(s => s.timer)
  // What the ⏱ opened before the tabs: a running rest's time left, else a new countdown at the
  // time the Timer last ran (D10), else the rest set in Settings.
  const [{ opened, start }] = useState(() => {
    const tm = useUI.getState().timer
    if (tm && !isClock(tm)) return { opened: tm.ready ? 0 : Math.min(tm.left, REST_MAX), start: null }
    return { opened: undefined, start: Math.min(lastTimer(useStore.getState().S), REST_MAX) }
  })
  const resting = opened !== undefined
  const [v, setV] = useState(resting ? opened : start)
  const read = useRef(null)
  if (!resting && isClock(timer)) return <ClockRing timer={timer} />
  const off = resting ? t('Skip') : null
  const go = () => {
    const now = read.current ? read.current() : v
    if (resting) { close(); applyRestLeft(now, opened); return }
    if (!(now > 0)) return
    useStore.getState().update(s => { s.hvTimerSec = now })
    applyRestLeft(now)
    useUI.setState(st => (st.timer ? { timer: { ...st.timer, hvClock: true } } : {}))
  }
  return <div className={resting ? '' : 'hv-clock'}>
    <div className="dw-read" aria-hidden="true">{fmtDuration(v, { off })}</div>
    <DurationWheel value={v} onChange={setV} min={resting ? 0 : 5} max={REST_MAX} off={off} readRef={read} />
    {resting && <p className="dim small dw-foot">{t('Scroll to 0:00 to end the rest now.')}</p>}
    <Button variant="primary" onClick={go}>{resting ? t('Done') : t('Start timer')}</Button>
  </div>
}

// Hevy's running timer: a large ring with the time left, −15 · +15 · Skip. The rest bar under the
// workout counts the same timer, as upstream draws it.
function ClockRing({ timer }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 250)
    return () => clearInterval(id)
  }, [])
  const left = timer.paused || !timer.endsAt ? timer.left : Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000))
  const share = timer.total > 0 ? Math.min(1, left / timer.total) : 0
  const R = 118, C = 2 * Math.PI * R
  const ui = useUI.getState()
  return <div className="hv-ring">
    <div className="hv-ring-dial" role="timer" aria-label={t('Timer')}>
      <svg viewBox="0 0 260 260" aria-hidden="true">
        <circle cx="130" cy="130" r={R} className="hv-ring-bg" />
        <circle cx="130" cy="130" r={R} className="hv-ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - share)} />
      </svg>
      <span className="hv-ring-t">{fmtClock(left)}</span>
    </div>
    <div className="hv-ring-btns">
      <Button onClick={() => ui.addRest(-15)}>−15</Button>
      <Button onClick={() => ui.addRest(15)}>+15</Button>
      <Button variant="primary" onClick={() => ui.stopRest()}>{t('Skip')}</Button>
    </div>
  </div>
}

const fmtClock = sec => {
  const n = Math.max(0, sec | 0)
  return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0')
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

/** The header's ⏱: the stopwatch's time beside it while it runs (spoken as "Stopwatch 1:05"). */
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
  // one clock in the bar: the stopwatch's time shows beside ⏱ only while it runs (D10)
  if (!on) return null
  return <span className="hv-swh on"><span className="vh">{t('Stopwatch')} </span>{stopwatchShort(ms)}</span>
}
