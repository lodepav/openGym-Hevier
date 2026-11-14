// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { initClockOff, isClockTimer } from './clock-off-run.js'
import { storeAdapter } from './store-watch.js'

vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

initClockOff(storeAdapter(useStore, () => {}))
const timer = extra => ({ left: 60, total: 60, endsAt: Date.now() + 60000, ...extra })

beforeEach(() => {
  useStore.setState({ S: JSON.parse(JSON.stringify(DEF)), user: null })
  useUI.setState({ timer: null })
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
