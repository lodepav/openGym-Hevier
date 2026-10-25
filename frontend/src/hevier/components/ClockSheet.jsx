// [hevier] The workout header's clock (hevier/DECISIONS.md D10): Timer · Stopwatch, as Hevy's.
// The Timer always opens on a new countdown at the time it last ran (`S.hvTimerSec`, else the rest
// set in Settings), with the rest's alert; starting it ends a rest between sets that is running
// (changed 2026-10-25: a running rest opened its "Time left" wheel here, which the rest bar's time
// still does). While its countdown runs the sheet shows it as Hevy does, a large ring with
// −15 · +15 · Skip. The Stopwatch only counts (hevier/lib/stopwatch.js); the sheet opens on it
// while it has time on it. A hold set's own clock (D89) is the same ring, counting its seconds down.
import { useEffect, useRef, useState } from 'react'
import { useUI } from '../../store/useUI.js'
import { useStore } from '../../store/useStore.js'
import { t } from '../../lib/i18n.js'
import { REST_MAX, fmtDuration } from '../../lib/duration.js'
import DurationWheel from '../../components/DurationWheel.jsx'
import { applyRestLeft } from '../../components/RestTimer.jsx'
import { Button, Segmented } from '../../components/ui.jsx'
import { RUN, GOAL, goalLeft, runningSec, startRun, stopped, moveGoal } from '../lib/set-timer.js'
import { elapsed, running, startW, stopW, resetW, ofSession, showing, stopwatchText, stopwatchShort, useStopwatch } from '../lib/stopwatch.js'

// A countdown the Timer started is marked on upstream's timer (`hvClock`), which its ticks carry
// over; a rest after a set starts a new timer without it, so the mark is the Timer's alone.
const isClock = tm => !!tm && tm.hvClock === true && !tm.ready
const lastTimer = S => (S.hvTimerSec > 0 ? S.hvTimerSec : S.restSec > 0 ? S.restSec : 90)

function TimerTab() {
  const timer = useUI(s => s.timer)
  const [v, setV] = useState(() => Math.min(lastTimer(useStore.getState().S), REST_MAX))
  const read = useRef(null)
  if (isClock(timer)) {
    const ui = useUI.getState()
    return <Ring left={leftOf(timer)} total={timer.total} label={t('Timer')}
      onMinus={() => ui.addRest(-15)} onPlus={() => ui.addRest(15)} onEnd={() => ui.stopRest()} end={t('Skip')} />
  }
  const go = () => {
    const now = read.current ? read.current() : v
    if (!(now > 0)) return
    useStore.getState().update(s => { s.hvTimerSec = now })
    useUI.getState().stopRest()
    applyRestLeft(now)
    useUI.setState(st => (st.timer ? { timer: { ...st.timer, hvClock: true } } : {}))
  }
  return <div className="hv-clock">
    <div className="dw-read" aria-hidden="true">{fmtDuration(v)}</div>
    <DurationWheel value={v} onChange={setV} min={5} max={REST_MAX} readRef={read} />
    <Button variant="primary" onClick={go}>{t('Start timer')}</Button>
  </div>
}

const leftOf = tm => (tm.paused || !tm.endsAt ? tm.left : Math.max(0, Math.ceil((tm.endsAt - Date.now()) / 1000)))

// Redraws its caller four times a second while shown.
function useTick() {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 250)
    return () => clearInterval(id)
  }, [])
}

// Hevy's running timer: a large ring with the time left, −15 · +15 and an end button. The rest
// bar under the workout counts the Timer's countdown, as upstream draws it.
function Ring({ left, total, label, title, onMinus, onPlus, onEnd, end }) {
  useTick()
  const share = total > 0 ? Math.min(1, left / total) : 0
  const R = 118, C = 2 * Math.PI * R
  return <div className="hv-ring">
    {title && <div className="hv-ring-title">{title}</div>}
    <div className="hv-ring-dial" role="timer" aria-label={label}>
      <svg viewBox="0 0 260 260" aria-hidden="true">
        <circle cx="130" cy="130" r={R} className="hv-ring-bg" />
        <circle cx="130" cy="130" r={R} className="hv-ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - share)} />
      </svg>
      <span className="hv-ring-t">{fmtClock(left)}</span>
    </div>
    <div className="hv-ring-btns">
      <Button onClick={onMinus}>−15</Button>
      <Button onClick={onPlus}>+15</Button>
      <Button variant="primary" onClick={onEnd}>{end}</Button>
    </div>
  </div>
}

// A hold's own clock (D89): its seconds counted down on the ring; −15 · +15 move the goal, Stop
// writes the time held. The set is read from the store, so the sheet closes once the hold has
// stopped, by Stop, its tick, or running out (hold-clock-run.js).
function HoldRing({ ei, si, title, close }) {
  useTick()
  const s = useStore(st => st.S.active?.entries?.[ei]?.sets?.[si])
  const on = !!s?.[RUN]
  useEffect(() => { if (!on) close() }, [on, close])
  if (!on) return null
  const edit = fn => useStore.getState().update(st => {
    const e = st.active?.entries?.[ei]
    if (e?.sets?.[si]?.[RUN]) fn(e, e.sets[si])
  })
  const left = goalLeft(s)
  return <Ring left={left != null ? Math.max(0, left) : runningSec(s)} total={s[GOAL] || 0} label={t('Timed hold')} title={title}
    onMinus={() => edit((e, x) => moveGoal(x, -15))} onPlus={() => edit((e, x) => moveGoal(x, 15))}
    onEnd={() => edit((e, x) => { e.sets[si] = stopped(x, 'time') })} end={t('Stop')} />
}

/** Starts set `si` of entry `ei` on the big clock, counting down from `goal` seconds, and opens it. */
export function holdClockSheet(ei, si, goal, title) {
  useUI.getState().stopRest()
  useStore.getState().update(st => startRun(st.active, ei, si, Date.now(), goal))
  return openHoldClock(ei, si, title)
}

/** Opens the big clock of a hold already running. */
export const openHoldClock = (ei, si, title) =>
  useUI.getState().openSheet(close => <HoldRing ei={ei} si={si} title={title} close={close} />)

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
    {tab === 'timer' ? <TimerTab /> : <StopwatchTab session={session} />}
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
