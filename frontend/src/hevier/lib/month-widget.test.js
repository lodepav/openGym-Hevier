import { describe, expect, it } from 'vitest'
import { EXDB, isCardio } from '../../lib/exercises.js'
import { widgetSnapshot, summaryOf } from './month-widget.js'

const BENCH = EXDB.find(e => /bench press/i.test(e.n) && /barbell/i.test(e.eq || '')).id
const RUN = EXDB.find(e => isCardio(e)).id
const set = (done = true, extra = {}) => ({ w: 60, r: 8, done, ...extra })
const W = (d, entries, extra = {}) => ({ id: 'w' + d + Math.random(), d, start: Date.parse(d + 'T10:00:00'), end: Date.parse(d + 'T11:00:00'), entries, ...extra })

describe('hevier month widget snapshot (D44)', () => {
  it('keeps this month and the last, with each day’s kind and each month’s line', () => {
    const S = { weekStart: 1, workouts: [
      W('2026-08-30', [{ id: BENCH, sets: [set()] }]),                                  // too old
      W('2026-09-30', [{ id: BENCH, sets: [set(), set()] }]),
      W('2026-10-02', [{ id: BENCH, sets: [set(), set(), set(false), set(true, { warmup: true })] }]),
      W('2026-10-02', [{ id: BENCH, sets: [set()] }], { name: 'Deload day' }),
      W('2026-10-05', [{ id: BENCH, sets: [set()] }]),
    ] }
    const s = widgetSnapshot(S, '2026-10-17')
    expect(s.v).toBe(1)
    expect(s.ws).toBe(1)
    expect(s.months).toHaveLength(12)
    expect(s.days).toEqual(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'])
    expect(s.kinds).toEqual({ '2026-09-30': 'strength', '2026-10-02': 'deload', '2026-10-05': 'strength' })
    expect(s.totals).toEqual({ '2026-09': summaryOf(1, 2), '2026-10': summaryOf(3, 4) })
    expect(summaryOf(3, 4)).toBe('3 workouts · 4 sets')
    expect(s.empty).toBe('No workouts this month')
    expect(s.plans).toEqual({})
  })

  it('carries the planned days from today to the end of next month, not the trained ones (D68)', () => {
    const S = { weekStart: 1, dayPlan: {}, queue: null, week: { 2: ['run'], 5: ['push'] },
      routines: [{ id: 'run', name: 'Run', ex: [{ id: RUN }] }, { id: 'push', name: 'Push', ex: [{ id: BENCH }] }],
      workouts: [W('2026-10-23', [{ id: BENCH, sets: [set()] }])] }
    const s = widgetSnapshot(S, '2026-10-19')
    expect(s.plans['2026-10-20']).toBe('cardio')
    expect(s.plans['2026-10-23']).toBeUndefined()          // trained already
    expect(s.plans['2026-10-30']).toBe('strength')
    expect(s.plans['2026-11-27']).toBe('strength')
    expect(Object.keys(s.plans).every(d => d >= '2026-10-19' && d < '2026-12-01')).toBe(true)
  })

  it('a Sunday week starts the letters on Sunday; January reaches back to December', () => {
    const s = widgetSnapshot({ weekStart: 0, workouts: [W('2025-12-31', [{ id: BENCH, sets: [set()] }])] }, '2026-01-03')
    expect(s.days[0]).toBe('Su')
    expect(Object.keys(s.kinds)).toEqual(['2025-12-31'])
  })

  it('a day of cardio only is cardio', () => {
    const s = widgetSnapshot({ workouts: [W('2026-10-03', [{ id: RUN, sets: [{ min: 30, done: true }] }])] }, '2026-10-17')
    expect(s.kinds['2026-10-03']).toBe('cardio')
  })
})
