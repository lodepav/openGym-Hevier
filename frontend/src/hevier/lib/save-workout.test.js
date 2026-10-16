import { describe, it, expect } from 'vitest'
import { whenOf, whenProblem, applyWhen, workoutNumber, workoutsInDays } from './save-workout.js'
import { backfillStart } from '../../lib/backfill.js'

const at = (iso, time) => backfillStart(iso, time)
const W = (id, d, time, min, extra = {}) => ({ id, d, start: at(d, time), end: at(d, time) + min * 60000, entries: [], ...extra })

describe('hevier save workout', () => {
  it('starts from the session’s day, start and length so far', () => {
    const A = { d: '2026-10-16', start: at('2026-10-16', '18:00'), entries: [] }
    expect(whenOf(A, at('2026-10-16', '18:45'))).toEqual({ date: '2026-10-16', time: '18:00', min: 45 })
    const past = { d: '2026-10-10', start: at('2026-10-10', '07:30'), backfill: { durationMin: 50 }, entries: [] }
    expect(whenOf(past)).toEqual({ date: '2026-10-10', time: '07:30', min: 50 })
  })

  it('refuses a day ahead, a bad length and an end in the future', () => {
    const now = at('2026-10-16', '19:00')
    const base = { date: '2026-10-16', time: '18:00', min: 60 }
    expect(whenProblem(base, { ...base, min: null }, '2026-10-16', now)).toBeNull()
    expect(whenProblem(base, { ...base, date: '2026-10-17', min: null }, '2026-10-16', now)).toBe('Pick a day up to today')
    expect(whenProblem(base, { ...base, min: 0 }, '2026-10-16', now)).toMatch(/at least 1 minute/)
    expect(whenProblem(base, { ...base, min: 24 * 60 + 1 }, '2026-10-16', now)).toMatch(/more than a day/)
    expect(whenProblem(base, { ...base, time: '18:30', min: null }, '2026-10-16', now)).toMatch(/future/)
    expect(whenProblem(base, { ...base, min: 90 }, '2026-10-16', now)).toMatch(/future/)
    expect(whenProblem(base, { ...base, date: '2026-10-15', min: 90 }, '2026-10-16', now)).toBeNull()
  })

  it('moves and retimes the saved workout with upstream’s helpers, and leaves it alone otherwise', () => {
    const list = [W('a', '2026-10-12', '18:00', 50), W('b', '2026-10-16', '18:00', 60)]
    const base = { date: '2026-10-16', time: '18:00', min: 60 }
    expect(applyWhen(list, list[1], base, { ...base, min: null })).toBe(list)
    const moved = applyWhen(list, list[1], base, { date: '2026-10-11', time: '09:15', min: 40 })
    expect(moved.map(w => w.id)).toEqual(['b', 'a'])
    expect(moved[0]).toMatchObject({ d: '2026-10-11', start: at('2026-10-11', '09:15'), end: at('2026-10-11', '09:15') + 40 * 60000 })
  })

  it('counts which workout this is and the week up to it', () => {
    const list = [W('a', '2026-10-01', '18:00', 50), W('b', '2026-10-10', '18:00', 50), W('c', '2026-10-14', '18:00', 50), W('d', '2026-10-16', '18:00', 50)]
    expect(workoutNumber(list, list[3])).toBe(4)
    expect(workoutNumber(list, { id: 'zz' })).toBe(0)
    expect(workoutsInDays(list, list[3])).toBe(3)
    expect(workoutsInDays(list, list[0])).toBe(1)
  })
})
