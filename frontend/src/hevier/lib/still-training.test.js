import { describe, it, expect } from 'vitest'
import { stillDue, keepGoing, lastTickMin, STILL_AFTER } from './still-training.js'

const T0 = 1_800_000_000_000
const A = (over = {}) => ({ start: T0, entries: [{ id: '0043', sets: [{ w: 60, r: 8, done: true, at: T0 + 42 * 60000 + 5000 }, { w: 60, r: 8, done: false, at: T0 + 90 * 60000 }] }], ...over })

describe('hevier: Still training? (D60)', () => {
  it('asks once a live workout has been open five hours', () => {
    expect(stillDue(A(), T0 + STILL_AFTER - 1, null)).toBe(false)
    expect(stillDue(A(), T0 + STILL_AFTER, null)).toBe(true)
    expect(stillDue(A({ editingWorkoutId: 'x' }), T0 + STILL_AFTER, null)).toBe(false)
    expect(stillDue(A({ backfill: true }), T0 + STILL_AFTER, null)).toBe(false)
    expect(stillDue(null, T0 + STILL_AFTER, null)).toBe(false)
  })

  it('Keep going asks again five hours later, and only for that workout', () => {
    const seen = keepGoing(A(), T0 + STILL_AFTER)
    expect(stillDue(A(), T0 + 2 * STILL_AFTER - 1, seen)).toBe(false)
    expect(stillDue(A(), T0 + 2 * STILL_AFTER, seen)).toBe(true)
    expect(stillDue(A({ start: T0 + 1 }), T0 + STILL_AFTER + 1, seen)).toBe(true)
  })

  it('ends the length at the last ticked set', () => {
    expect(lastTickMin(A())).toBe(43)
    expect(lastTickMin(A({ entries: [] }))).toBeNull()
  })
})
