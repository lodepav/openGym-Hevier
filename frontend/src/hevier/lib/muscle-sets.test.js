import { describe, it, expect } from 'vitest'
import { periodOf, muscleSetCounts, lastDays } from './muscle-sets.js'
import { loadOfWorkouts, MUSCLE_NAME } from '../../lib/muscles.js'
import { EXDB } from '../../lib/exercises.js'

const BENCH = EXDB.find(e => /bench press/i.test(e.n) && /barbell/i.test(e.eq || '')).id
const set = (done = true, extra = {}) => ({ w: 60, r: 8, done, ...extra })
const W = (d, sets) => ({ id: 'w' + d + sets.length, d, start: 1, end: 2, entries: [{ id: BENCH, sets }] })

describe('hevier muscle set counts', () => {
  it('bounds a week (by the profile’s first weekday), a month and a year, and the one before', () => {
    // 2026-10-16 is a Friday
    expect(periodOf('week', '2026-10-16', { weekStart: 1 })).toEqual({ from: '2026-10-12', to: '2026-10-18' })
    expect(periodOf('week', '2026-10-16', { weekStart: 1, offset: -1 })).toEqual({ from: '2026-10-05', to: '2026-10-11' })
    expect(periodOf('month', '2026-03-31', { offset: -1 })).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(periodOf('month', '2026-01-10', { offset: -1 })).toEqual({ from: '2025-12-01', to: '2025-12-31' })
    expect(periodOf('year', '2026-10-16')).toEqual({ from: '2026-01-01', to: '2026-12-31' })
  })

  const ws = [
    W('2026-10-13', [set(), set(), set(false), set(true, { warmup: true })]),
    W('2026-10-06', [set()]),
    W('2026-09-01', [set(), set(), set()]),
  ]

  it('counts ticked work sets for the main muscle, against the previous period (D42 default)', () => {
    const { rows, from } = muscleSetCounts(ws, 'week', { today: '2026-10-16', weekStart: 1 })
    expect(from).toBe('2026-10-12')
    expect(rows).toEqual([{ muscle: 'Chest', sets: 2, prev: 1 }])
    expect(muscleSetCounts([], 'year', { today: '2026-10-16' }).rows).toEqual([])
  })

  it('in share mode counts with upstream’s load, a muscle trained only before kept', () => {
    const { rows } = muscleSetCounts(ws, 'week', { today: '2026-10-16', weekStart: 1, mode: 'share' })
    const chest = rows.find(r => r.muscle === MUSCLE_NAME.chest)
    const one = loadOfWorkouts([W('x', [set()])]).chest
    expect(chest.sets).toBeCloseTo(2 * one, 1)
    expect(chest.prev).toBeCloseTo(one, 1)
    expect(rows[0].sets).toBeGreaterThanOrEqual(rows.at(-1).sets)
    const r = muscleSetCounts([W('2026-10-06', [set()])], 'week', { today: '2026-10-16', weekStart: 1 }).rows
    expect(r).toEqual([{ muscle: 'Chest', sets: 0, prev: 1 }])
  })

  it('marks the trained days of the last week and maps their load', () => {
    const r = lastDays([W('2026-10-16', [set()]), W('2026-10-10', [set()]), W('2026-10-09', [set()])], '2026-10-16')
    expect(r.days.map(d => d.d)).toEqual(['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'])
    expect(r.days.filter(d => d.trained).map(d => d.d)).toEqual(['2026-10-10', '2026-10-16'])
    expect(r.workouts).toHaveLength(2)
    expect(r.load.chest).toBeGreaterThan(0)
  })
})
