import { describe, it, expect } from 'vitest'
import { weekNumbers } from './history-week.js'

const set = (w, r) => ({ w, r, done: true })
const wo = (d, sets, hours = 1) => ({ id: 'w' + d, d, start: Date.parse(d + 'T10:00:00'), end: Date.parse(d + 'T10:00:00') + hours * 3600000,
  entries: [{ id: 'press', sets }] })

describe('History: this week in three numbers (D135)', () => {
  it('workouts against the planned weekdays, the time, the work sets and the records', () => {
    const S = { weekStart: 1, routines: [{ id: 'r', name: 'A' }], week: { 1: ['r'], 3: ['r'], 5: ['r'] }, dayPlan: {},
      workouts: [
        wo('2026-11-09', [set(60, 8)]),                         // last week: the bar
        wo('2026-11-16', [set(65, 8), set(60, 8)], 1.5),       // this week: a record
        { ...wo('2026-11-18', [set(50, 10)]), start: 0, end: 0 }, // no clock
      ] }
    expect(weekNumbers(S, '2026-11-18')).toEqual({ done: 2, planned: 3, ms: 5400000, sets: 3, records: expect.any(Number) })
    expect(weekNumbers(S, '2026-11-18').records).toBeGreaterThan(0)
  })

  it('an empty week is all zeros', () => {
    expect(weekNumbers({ workouts: [], week: {}, routines: [] }, '2026-11-18')).toEqual({ done: 0, planned: 0, ms: 0, sets: 0, records: 0 })
  })
})
