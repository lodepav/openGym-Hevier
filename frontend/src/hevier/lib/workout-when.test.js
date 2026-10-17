import { describe, expect, it } from 'vitest'
import { hasClock, workoutTimeText, workoutWhenText } from './workout-when.js'

const at = (h, m) => new Date(2026, 9, 17, h, m).getTime()

describe('hevier workout day, time and length', () => {
  it('a workout with a clock shows its start time beside the day', () => {
    const w = { d: '2026-10-17', start: at(18, 5), end: at(18, 50) }
    expect(workoutWhenText(w)).toMatch(/17.*18:05$/)
    expect(workoutTimeText(w)).toBe('45 min')
  })

  it('one under a minute shows its seconds, not a dash', () => {
    expect(workoutTimeText({ d: '2026-10-17', start: at(18, 5), end: at(18, 5) + 40e3 })).toBe('40s')
  })

  it('imported history without a clock keeps the day alone and a dash', () => {
    const w = { d: '2026-10-17', start: at(12, 0) }
    expect(hasClock(w)).toBe(false)
    expect(workoutWhenText(w)).not.toContain('·')
    expect(workoutTimeText(w)).toBe('–')
  })
})
