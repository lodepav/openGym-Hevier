// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { initClockOff, initClockChain, isClockTimer, startingClock } from './clock-off-run.js'
import { storeAdapter } from './store-watch.js'

vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

initClockOff(storeAdapter(useStore, () => {}))
initClockChain()
const timer = extra => ({ left: 60, total: 60, endsAt: Date.now() + 60000, ...extra })

beforeEach(() => {
  useStore.setState({ S: JSON.parse(JSON.stringify(DEF)), user: null })
  useUI.getState().stopRest()
  useUI.getState().stopCountIn()
  useUI.setState({ timer: null, work: null, countIn: null })
  vi.useRealTimers()
})

describe('the Timer and Stopwatch switched off (D117)', () => {
  it('ends a Timer countdown that is running', () => {
    useUI.setState({ timer: timer({ hvClock: true }) })
    useStore.getState().update(s => { s.hvModuleParts = { 'hvWorkout.clock': false } })
    expect(useUI.getState().timer).toBeNull()
  })
  it('the module off ends it too', () => {
    useUI.setState({ timer: timer({ hvClock: true }) })
    useStore.getState().update(s => { s.modules = { ...s.modules, hvWorkout: false } })
    expect(useUI.getState().timer).toBeNull()
  })
  it('leaves a rest between sets running, and the Timer while the part stays on', () => {
    useUI.setState({ timer: timer() })
    useStore.getState().update(s => { s.hvModuleParts = { 'hvWorkout.clock': false } })
    expect(useUI.getState().timer).toBeTruthy()
    useUI.setState({ timer: timer({ hvClock: true }) })
    useStore.getState().update(s => { s.hvModuleParts = { 'hvWorkout.demos': false } })
    expect(useUI.getState().timer).toBeTruthy()
  })
  it('knows the Timer’s countdown from a rest and from one that has ended', () => {
    expect(isClockTimer(timer({ hvClock: true }))).toBe(true)
    expect(isClockTimer(timer())).toBe(false)
    expect(isClockTimer(timer({ hvClock: true, ready: true }))).toBe(false)
    expect(isClockTimer(null)).toBe(false)
  })
})

describe('the Timer does not lead into a hold', () => {
  const owner = { idx: 0, i: 0, id: 'plank', plan: 30, label: 'Plank' }
  let unbind
  const bind = () => { unbind = useUI.getState().bindAuto({ peek: () => owner, focus: vi.fn(), startHold: vi.fn(), forecast: () => [], stop: vi.fn() }) }
  // ClockSheet.jsx TimerTab's go(): the countdown started, then marked as the Timer's
  const startTimer = sec => {
    startingClock(() => useUI.getState().startRest(sec))
    useUI.setState(st => (st.timer ? { timer: { ...st.timer, hvClock: true } } : {}))
  }
  afterEach(() => unbind?.())

  it('a rest after a set still names the hold that starts by itself', () => {
    bind()
    useUI.getState().startRest(60)
    expect(useUI.getState().timer.autoNext).toBe('Plank')
  })
  it('the Timer names no next hold, and its Skip starts no count-in', () => {
    bind()
    startTimer(60)
    expect(isClockTimer(useUI.getState().timer)).toBe(true)
    expect(useUI.getState().timer.autoNext).toBeUndefined()
    useUI.getState().skipRest()
    expect(useUI.getState().timer).toBeNull()
    expect(useUI.getState().countIn).toBeNull()
  })
  it('the Timer running out starts no count-in', () => {
    vi.useFakeTimers({ now: 100_000 })
    bind()
    startTimer(5)
    vi.advanceTimersByTime(6000)
    expect(useUI.getState().countIn).toBeNull()
    expect(useUI.getState().timer?.ready).toBe(true)
  })
  it('a rest after the Timer chains again', () => {
    bind()
    startTimer(60)
    useUI.getState().skipRest()
    useUI.getState().startRest(60)
    expect(useUI.getState().timer.autoNext).toBe('Plank')
    useUI.getState().skipRest()
    expect(useUI.getState().countIn?.owner).toEqual(owner)
  })
})

describe('the Android notification moves the Timer', () => {
  it('keeps it the Timer through Pause, Resume and ±15 s', () => {
    useUI.setState({ timer: timer({ hvClock: true }) })
    useUI.getState().followNativeRest({ endsAt: 0, left: 50, total: 60, paused: true })
    expect(useUI.getState().timer).toMatchObject({ paused: true, hvClock: true })
    useUI.getState().followNativeRest({ endsAt: Date.now() + 65_000, left: 65, total: 75, paused: false })
    expect(useUI.getState().timer).toMatchObject({ left: 65, hvClock: true })
    expect(isClockTimer(useUI.getState().timer)).toBe(true)
  })
  it('keeps a rest after a set its kind, so it ends with its own sound', () => {
    useUI.getState().startRest(60, 0, { rest: 'superset' })
    useUI.getState().followNativeRest({ endsAt: Date.now() + 65_000, left: 65, total: 75, paused: false })
    expect(useUI.getState().timer).toMatchObject({ rk: 'superset' })
    expect(useUI.getState().timer.hvClock).toBeUndefined()
  })
})
