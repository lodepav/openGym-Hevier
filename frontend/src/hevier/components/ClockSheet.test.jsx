// @vitest-environment happy-dom
// The workout header's ⏱ (D10): Timer · Stopwatch. The Timer starts a countdown at the Settings
// rest with no rest running (D10), or adjusts the running one; the Stopwatch counts.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const apply = vi.fn()
vi.mock('../../components/RestTimer.jsx', () => ({ applyRestLeft: (...a) => apply(...a) }))
const { HeaderClock, timerSheet } = await import('./ClockSheet.jsx')
const { useUI } = await import('../../store/useUI.js')
const { useStore } = await import('../../store/useStore.js')
const { useStopwatch, elapsed, startW, stopW, resetW, ofSession, stopwatchText } = await import('../lib/stopwatch.js')

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, host
function open() {
  timerSheet()
  const top = useUI.getState().sheets.at(-1)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(top.render(() => useUI.setState({ sheets: [] }))))
  return host
}
const btn = text => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === text)

beforeEach(() => {
  localStorage.clear()
  apply.mockClear()
  useUI.setState({ sheets: [], timer: null })
  useStopwatch.setState({ w: { session: null, since: null, acc: 0 } })
  useStore.setState(st => ({ S: { ...st.S, restSec: 120, active: { start: 1000, entries: [] } } }))
})
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = host = null; vi.useRealTimers() })

describe('hevier workout clock', () => {
  it('opens on the Timer at the Settings rest with no rest running, and starts it', () => {
    open()
    expect(host.querySelector('.seg button.on').textContent).toBe('Timer')
    expect(host.querySelector('.dw-read').textContent).toBe('2:00')
    act(() => btn('Start timer').click())
    expect(apply).toHaveBeenCalledWith(120)
    expect(useStore.getState().S.hvTimerSec).toBe(120)
  })

  it('opens next time on the time it last ran, and shows its countdown as a ring', () => {
    useStore.setState(st => ({ S: { ...st.S, hvTimerSec: 45 } }))
    open()
    expect(host.querySelector('.dw-read').textContent).toBe('45s')
    expect(host.querySelector('.hv-clock')).toBeTruthy()
    act(() => useUI.setState({ timer: { left: 40, total: 45, hvClock: true } }))
    expect(host.querySelector('.hv-ring-t').textContent).toBe('0:40')
    expect(btn('Skip')).toBeTruthy()
  })

  it('a rest between sets keeps the wheel, not the ring', () => {
    useUI.setState({ timer: { left: 40, total: 90 } })
    open()
    expect(host.querySelector('.hv-ring')).toBeNull()
  })

  it('a running rest opens at its time left, and Done adjusts it', () => {
    useUI.setState({ timer: { left: 30 } })
    open()
    expect(host.querySelector('.dw-read').textContent).toBe('30s')
    act(() => btn('Done').click())
    expect(apply).toHaveBeenCalledWith(30, 30)
  })

  it('the Stopwatch starts, stops, resumes and resets, and the sheet opens on it while it has time', () => {
    vi.useFakeTimers({ now: 50_000 })
    open()
    act(() => [...host.querySelectorAll('.seg button')].find(b => b.textContent === 'Stopwatch').click())
    expect(host.querySelector('.hv-sw').textContent).toBe('0:00.0')
    act(() => btn('Start').click())
    act(() => vi.advanceTimersByTime(4200))
    expect(host.querySelector('.hv-sw').textContent).toBe('0:04.2')
    act(() => btn('Stop').click())
    expect(btn('Resume')).toBeTruthy()
    act(() => root.unmount()); host.remove()
    open()
    expect(host.querySelector('.seg button.on').textContent).toBe('Stopwatch')
    expect(host.querySelector('.hv-sw').textContent).toBe('0:04.2')
    act(() => btn('Reset').click())
    expect(host.querySelector('.hv-sw').textContent).toBe('0:00.0')
    expect(JSON.parse(localStorage.getItem('hevier_stopwatch'))).toMatchObject({ session: 1000, acc: 0, since: null })
  })

  it('the header shows a running stopwatch of this workout, not of another', () => {
    vi.useFakeTimers({ now: 10_000 })
    useStopwatch.setState({ w: { session: 1000, since: 10_000 - 65_000, acc: 0 } })
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
    act(() => root.render(<HeaderClock session={1000} />))
    expect(host.textContent).toBe('Stopwatch 1:05')   // "Stopwatch" is for screen readers only (.vh)
    act(() => root.render(<HeaderClock session={2000} />))
    expect(host.textContent).toBe('')
  })
})

describe('hevier stopwatch', () => {
  it('counts what ran, keeps it while stopped, and is fresh for another session', () => {
    let w = ofSession(null, 7)
    w = startW(w, 1000)
    expect(elapsed(w, 3500)).toBe(2500)
    w = stopW(w, 3500)
    expect(elapsed(w, 99_999)).toBe(2500)
    w = startW(w, 10_000)
    expect(elapsed(w, 10_500)).toBe(3000)
    expect(elapsed(resetW(w), 10_500)).toBe(0)
    expect(ofSession(w, 8)).toEqual({ session: 8, since: null, acc: 0 })
    expect(stopwatchText(3_725_300)).toBe('1:02:05.3')
  })
})
