import { describe, expect, it } from 'vitest'
import { EXDB } from '../../lib/exercises.js'
import { change, defaultMonth, firstMonth, monthReport, monthWorkouts } from './month-report.js'

const BENCH = EXDB.find(e => /^barbell bench press$/i.test(e.n)).id
const SQUAT = EXDB.find(e => /^barbell full squat$/i.test(e.n)).id
const set = (w, extra = {}) => ({ w, r: 5, done: true, ...extra })
const H = 3600000
const W = (d, entries, extra = {}) => ({ id: d, d, start: Date.parse(d + 'T18:00:00'), end: Date.parse(d + 'T18:00:00') + H, entries, vol: 1000, ...extra })

const log = [
  W('2026-09-10', [{ id: BENCH, sets: [set(70)] }]),
  W('2026-10-01', [{ id: BENCH, sets: [set(40, { phase: 'warmup' }), set(80), set(80)] }], { prs: [BENCH] }),
  W('2026-10-02', [{ id: SQUAT, sets: [set(100), set(100), set(100), set(90, { done: false })] }]),
  W('2026-10-20', [{ id: BENCH, sets: [set(82.5)] }, { id: SQUAT, sets: [set(105)] }], { prs: [BENCH, SQUAT] }),
]

describe('hevier monthly report (D23)', () => {
  it('takes the month’s workouts by their day', () => {
    expect(monthWorkouts(log, 2026, 9).map(w => w.d)).toEqual(['2026-10-01', '2026-10-02', '2026-10-20'])
    expect(monthWorkouts(log, 2026, 7)).toEqual([])
  })

  it('totals the month against the one before', () => {
    const r = monthReport(log, 2026, 9)
    expect(r).toMatchObject({ workouts: 3, duration: 3 * H, volume: 3000, sets: 7 })
    expect(r.prev).toMatchObject({ workouts: 1, duration: H, volume: 1000, sets: 1 })
  })

  it('lists every record of the month, oldest first, from the records it is given (D51)', () => {
    const recs = { '2026-10-20': [{ id: SQUAT, kind: 'weight', v: 105 }], '2026-10-01': [{ id: BENCH, kind: 'weight', v: 80 }, { id: BENCH, kind: 'e1rm', v: 93.3 }] }
    expect(monthReport([...log].reverse(), 2026, 9, 1, 'main', w => recs[w.d] || []).records).toEqual([
      { id: BENCH, kind: 'weight', v: 80, d: '2026-10-01' }, { id: BENCH, kind: 'e1rm', v: 93.3, d: '2026-10-01' },
      { id: SQUAT, kind: 'weight', v: 105, d: '2026-10-20' },
    ])
    expect(monthReport(log, 2026, 9).records).toEqual([])
  })

  it('counts the calendar rows with a workout as weeks trained', () => {
    // October 2026 starts on a Thursday: Monday-first rows are 29 Sep–4 Oct, …, 26 Oct–1 Nov.
    expect(monthReport(log, 2026, 9, 1).weeks).toEqual({ trained: 2, total: 5 })
  })

  it('ranks exercises by work sets, with their heaviest weight; warm-ups and unticked sets left out', () => {
    expect(monthReport(log, 2026, 9).top).toEqual([
      { id: SQUAT, sets: 4, best: 105 },
      { id: BENCH, sets: 3, best: 82.5 },
    ])
  })

  it('opens on last month when it has workouts, else this one', () => {
    expect(defaultMonth(log, '2026-11-05')).toEqual({ y: 2026, mo: 9 })
    expect(defaultMonth(log, '2026-12-05')).toEqual({ y: 2026, mo: 11 })
    expect(defaultMonth(log, '2027-01-03')).toEqual({ y: 2027, mo: 0 })
    expect(firstMonth(log)).toEqual({ y: 2026, mo: 8 })
    expect(firstMonth([])).toBeNull()
  })

  it('says a change as a count or a percentage', () => {
    expect(change(5, 3)).toEqual({ up: true, text: '+2' })
    expect(change(3, 5)).toEqual({ up: false, text: '−2' })
    expect(change(3, 3)).toBeNull()
    expect(change(80, 100, true)).toEqual({ up: false, text: '−20%' })
    expect(change(5, 0, true)).toBeNull()
  })
})
