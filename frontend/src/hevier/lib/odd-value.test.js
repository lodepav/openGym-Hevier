import { describe, it, expect } from 'vitest'
import { longRun } from './odd-value.js'

describe('hevier: a cardio timer left running (D90)', () => {
  it('a cardio timer past twice its time and 10 minutes more looks forgotten', () => {
    expect(longRun(100 * 60, 30 * 60, 0)).toBe(1800)
    expect(longRun(100 * 60, 20 * 60, 30 * 60)).toBe(1800)
    expect(longRun(45 * 60, 20 * 60, 0)).toBe(1200)
    expect(longRun(12 * 60, 5 * 60, 0)).toBe(0)        // over twice, but under 10 minutes more
    expect(longRun(50 * 60, 30 * 60, 0)).toBe(0)
    expect(longRun(5 * 3600, 0, 0)).toBe(0)
  })
})
