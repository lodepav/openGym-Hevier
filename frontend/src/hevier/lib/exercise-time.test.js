import { describe, it, expect } from 'vitest'
import { entryTimes, timedSessions, timeSections, periodSince, timeSpoken } from './exercise-time.js'

const MIN = 60000
const T0 = Date.UTC(2026, 9, 20, 17)
const tick = (min, extra = {}) => ({ w: 50, r: 8, done: true, at: T0 + min * MIN, ...extra })
const wo = (entries, extra = {}) => ({ id: 'w', d: '2026-10-20', start: T0, end: T0 + 60 * MIN, entries, ...extra })

describe('hevier: exercise time (D88)', () => {
  it('gives the time up to each tick to that set’s exercise', () => {
    const w = wo([{ id: 'a', sets: [tick(3), tick(6), tick(9)] }, { id: 'b', sets: [tick(13), tick(16)] }])
    expect(entryTimes(w)).toEqual([9 * MIN, 7 * MIN])
  })

  it('splits a superset’s time as its sets were done', () => {
    const w = wo([{ id: 'a', sets: [tick(2), tick(6)] }, { id: 'b', sets: [tick(4), tick(8)] }])
    expect(entryTimes(w)).toEqual([4 * MIN, 4 * MIN])
  })

  it('leaves out unticked sets, untimed workouts and ticks outside the workout', () => {
    expect(entryTimes(wo([{ id: 'a', sets: [{ w: 50, r: 8, done: true }] }]))).toEqual([])
    const w = wo([{ id: 'a', sets: [tick(5), tick(7, { done: false })] }, { id: 'b', sets: [tick(-5), tick(10), tick(200)] }])
    expect(entryTimes(w)).toEqual([5 * MIN, 5 * MIN])
  })

  it('counts a timed row ticked as it began for its own length', () => {
    const w = wo([{ id: 'a', sets: [tick(10)] }, { id: 'bike', sets: [tick(11, { min: 20, w: 0, r: 0 })] }, { id: 'c', sets: [tick(33)] }])
    expect(entryTimes(w)).toEqual([10 * MIN, 20 * MIN, 3 * MIN])
  })

  it('a pause past the forgotten-session gap is a break, not the next exercise’s', () => {
    const w = wo([{ id: 'a', sets: [tick(5)] }, { id: 'b', sets: [tick(40), tick(42)] }], { end: T0 + 50 * MIN })
    expect(entryTimes(w)).toEqual([5 * MIN, 2 * MIN])
  })

  it('a session per exercise, kept-out entries left out after the times', () => {
    const w = wo([
      { id: 'a', hvGym: 'g1', sets: [tick(5)] },
      { id: 'x', noProg: true, sets: [tick(8)] },
      { id: 'a', hvGym: 'g1', sets: [tick(10)] },
    ])
    expect(timedSessions([w])).toEqual([{ id: 'a', gym: 'g1', ms: 7 * MIN, sets: 2 }])
    expect(timedSessions([w], '2026-10-21')).toEqual([])
  })

  it('sorts by the average, longest first, and groups by muscle or gym', () => {
    const s = [
      { id: 'a', gym: 'g1', ms: 10 * MIN }, { id: 'a', gym: '', ms: 6 * MIN },
      { id: 'b', gym: 'g1', ms: 12 * MIN }, { id: 'c', gym: 'g2', ms: 3 * MIN },
    ]
    const flat = timeSections(s)
    expect(flat[0].rows.map(r => [r.id, r.avg / MIN, r.sessions, r.total / MIN])).toEqual([['b', 12, 1, 12], ['a', 8, 2, 16], ['c', 3, 1, 3]])
    expect(timeSections(s, { asc: true })[0].rows.map(r => r.id)).toEqual(['c', 'a', 'b'])
    const gyms = timeSections(s, { by: 'gym' })
    expect(gyms.map(g => [g.key, g.rows.map(r => r.id)])).toEqual([['g1', ['b', 'a']], ['g2', ['c']], ['', ['a']]])
    const muscles = timeSections(s, { by: 'muscle', muscleOf: id => ({ a: 'Chest', b: 'Lats' })[id] })
    expect(muscles.map(g => g.key)).toEqual(['Chest', 'Lats', ''])
  })

  it('a session of one set is counted but gives no average: too few sets (the sixth audit, 2026-11-22)', () => {
    const one = wo([{ id: 'a', sets: [tick(1)] }, { id: 'b', sets: [tick(3), tick(6)] }])
    expect(timedSessions([one]).map(x => [x.id, x.sets])).toEqual([['a', 1], ['b', 2]])
    const s = [{ id: 'a', gym: '', ms: MIN / 60, sets: 1 }, { id: 'b', gym: '', ms: 2 * MIN, sets: 3 },
      { id: 'c', gym: '', ms: 9 * MIN, sets: 1 }, { id: 'c', gym: '', ms: 4 * MIN, sets: 4 }]
    const [flat] = timeSections(s)
    // The count is of the timed sessions, as the total and average are; with none timed, of all (the seventh critique, 2026-11-22).
    expect(flat.rows.map(r => [r.id, r.sessions, r.avg == null ? null : r.avg / MIN, r.total / MIN])).toEqual([['c', 1, 4, 4], ['b', 1, 2, 2], ['a', 1, null, 0]])
    expect(timeSections([...s, { id: 'a', gym: '', ms: MIN, sets: 1 }])[0].rows.find(r => r.id === 'a').sessions).toBe(2)
    // Last whichever way round, and out of a section's total.
    expect(timeSections(s, { asc: true })[0].rows.map(r => r.id)).toEqual(['b', 'c', 'a'])
    expect(timeSections(s, { by: 'gym' })[0].total).toBe(6 * MIN)
  })

  it('a session under 10 s a set is not timed either: its sets were ticked at once (the eighth critique, 2026-11-22)', () => {
    const s = [{ id: 'a', gym: '', ms: 5000, sets: 3 }, { id: 'b', gym: '', ms: 30000, sets: 3 },
      { id: 'b', gym: '', ms: 3000, sets: 2 }, { id: 'c', gym: '', ms: 1000, sets: 1 }, { id: 'd', gym: '', ms: 2000 }]
    const rows = timeSections(s)[0].rows
    expect(rows.map(r => [r.id, r.avg, r.quick])).toEqual([['b', 30000, false], ['d', 2000, false], ['a', null, true], ['c', null, false]])
    expect(timeSections(s, { by: 'gym' })[0].total).toBe(32000)
  })

  it('a time in words for TalkBack', () => {
    expect([90, 45, 120, 3600 + 5 * 60 + 9, 2 * 3600, 0, 1].map(timeSpoken)).toEqual(['1 minute 30 seconds', '45 seconds', '2 minutes', '1 hour 5 minutes', '2 hours', '0 seconds', '1 second'])
  })

  it('periods count back from today', () => {
    expect(periodSince('30d', '2026-10-25')).toBe('2026-09-26')
    expect(periodSince('all', '2026-10-25')).toBe('')
  })
})
