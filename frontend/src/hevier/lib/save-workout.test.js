import { describe, it, expect } from 'vitest'
import { sessionMin, durationProblem, applyDuration, workoutNumber, workoutsInDays } from './save-workout.js'
import { backfillStart } from '../../lib/backfill.js'

const at = (iso, time) => backfillStart(iso, time)
const W = (id, d, time, min, extra = {}) => ({ id, d, start: at(d, time), end: at(d, time) + min * 60000, entries: [], ...extra })

describe('hevier save workout', () => {
  it('starts from the session’s length so far, or a past workout’s own', () => {
    const A = { d: '2026-10-16', start: at('2026-10-16', '18:00'), entries: [] }
    expect(sessionMin(A, at('2026-10-16', '18:45'))).toBe(45)
    const past = { d: '2026-10-10', start: at('2026-10-10', '07:30'), backfill: { durationMin: 50 }, entries: [] }
    expect(sessionMin(past)).toBe(50)
  })

  it('refuses a bad length and an end in the future', () => {
    const now = at('2026-10-16', '19:00')
    const A = { d: '2026-10-16', start: at('2026-10-16', '18:00'), entries: [] }
    expect(durationProblem(A, null, now)).toBeNull()
    expect(durationProblem(A, 0, now)).toMatch(/at least 1 minute/)
    expect(durationProblem(A, 24 * 60 + 1, now)).toMatch(/more than a day/)
    expect(durationProblem(A, 90, now)).toMatch(/future/)
    expect(durationProblem(A, 50, now)).toBeNull()
    expect(durationProblem({ ...A, d: '2026-10-15', start: at('2026-10-15', '18:00') }, 90, now)).toBeNull()
  })

  it('retimes the saved workout with upstream’s helper, and leaves it alone otherwise', () => {
    const list = [W('a', '2026-10-12', '18:00', 50), W('b', '2026-10-16', '18:00', 60)]
    expect(applyDuration(list, list[1], null)).toBe(list)
    const timed = applyDuration(list, list[1], 40)
    expect(timed[1]).toMatchObject({ id: 'b', end: at('2026-10-16', '18:00') + 40 * 60000 })
  })

  it('counts which workout this is and the week up to it', () => {
    const list = [W('a', '2026-10-01', '18:00', 50), W('b', '2026-10-10', '18:00', 50), W('c', '2026-10-14', '18:00', 50), W('d', '2026-10-16', '18:00', 50)]
    expect(workoutNumber(list, list[3])).toBe(4)
    expect(workoutNumber(list, { id: 'zz' })).toBe(0)
    expect(workoutsInDays(list, list[3])).toBe(3)
    expect(workoutsInDays(list, list[0])).toBe(1)
  })
})
