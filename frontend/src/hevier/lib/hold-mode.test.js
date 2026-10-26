import { afterEach, describe, it, expect } from 'vitest'
import { holdMode } from './hold-mode.js'
import { defaultConfig } from '../../lib/history.js'
import { hooks } from '../hooks.js'

const S = workouts => ({ workouts })
const w = (d, id, sets) => ({ d, entries: [{ id, sets }] })

describe('holdMode (D55)', () => {
  it('makes an exercise whose last sets were timed timed', () => {
    expect(holdMode(S([w('2026-10-01', '0001', [{ sec: 30, w: 0, done: true }])]), '0001')).toBe('time')
    expect(holdMode(S([
      w('2026-09-01', '0001', [{ sec: 30, w: 0, done: true }]),
      w('2026-10-01', '0001', [{ r: 10, w: 0, done: true }]),
    ]), '0001')).toBe(null)
  })
  it('leaves everything else to upstream', () => {
    expect(holdMode(S([]), '0025')).toBe(null)
    expect(holdMode(null, '0025')).toBe(null)
  })
})

describe('defaultConfig with the hook (S32)', () => {
  afterEach(() => { hooks.defaultMode = null })
  it('is upstream\'s with the hook empty', () => {
    expect(defaultConfig('0463').mode).toBe('time')   // upstream's isHold since 1.4.3 (#694)
  })
  it('starts an exercise last logged as holds as a timed one, and an explicit mode still wins', () => {
    hooks.defaultMode = id => holdMode(S([w('2026-10-01', '0001', [{ sec: 30, w: 0, done: true }])]), id)
    expect(defaultConfig('0001')).toMatchObject({ mode: 'time', sec: 45, sets: 3 })
    expect(defaultConfig('0001', 'reps').mode).toBe('reps')
    expect(defaultConfig('0025').mode).toBe('reps')
    // A catalogue hold logged as reps last time is still upstream's hold.
    hooks.defaultMode = id => holdMode(S([w('2026-10-01', '0463', [{ w: 0, r: 10, done: true }])]), id)
    expect(defaultConfig('0463').mode).toBe('time')
  })
})
