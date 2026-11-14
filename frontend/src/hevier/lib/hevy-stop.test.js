import { describe, expect, it } from 'vitest'
import { stopNotice } from './hevy-stop.js'

describe('hevier: Send to Hevy says when it has stopped (D34)', () => {
  it('tells a refused or lost key once, after a pass with a workout, not for Send now', () => {
    expect(stopNotice(false, { error: 'auth', workouts: 1 })).toEqual({ tell: 'auth', told: true })
    expect(stopNotice(false, { error: 'nokey', workouts: 2 })).toEqual({ tell: 'nokey', told: true })
    expect(stopNotice(true, { error: 'auth', workouts: 1 })).toEqual({ tell: null, told: true })
    expect(stopNotice(false, { error: 'auth', workouts: 0 })).toEqual({ tell: null, told: false })
    expect(stopNotice(false, { error: 'auth', workouts: 1, force: true })).toEqual({ tell: null, told: false })
  })
  it('stays quiet for other errors, and a pass that gets through lets it tell again', () => {
    expect(stopNotice(false, { error: 'offline', workouts: 1 })).toEqual({ tell: null, told: false })
    expect(stopNotice(true, { error: 'rate', workouts: 1 })).toEqual({ tell: null, told: true })
    expect(stopNotice(true, { error: null, workouts: 1 })).toEqual({ tell: null, told: false })
  })
})
