import { describe, it, expect } from 'vitest'
import { periodOf, muscleSetCounts, lastDays, workoutSplit } from './muscle-sets.js'
import { loadOfWorkouts } from '../../lib/muscles.js'
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

  it('counts ticked work sets with upstream’s load, against the previous period', () => {
    const ws = [
      W('2026-10-13', [set(), set(), set(false), set(true, { warmup: true })]),
      W('2026-10-06', [set()]),
      W('2026-09-01', [set(), set(), set()]),
    ]
    const { rows, from } = muscleSetCounts(ws, 'week', { today: '2026-10-16', weekStart: 1 })
    expect(from).toBe('2026-10-12')
    const chest = rows.find(r => r.muscle === 'chest')
    const one = loadOfWorkouts([W('x', [set()])]).chest
    expect(chest.sets).toBeCloseTo(2 * one, 1)
    expect(chest.prev).toBeCloseTo(one, 1)
    expect(rows[0].sets).toBeGreaterThanOrEqual(rows.at(-1).sets)
    expect(muscleSetCounts([], 'year', { today: '2026-10-16' }).rows).toEqual([])
  })

  it('marks the trained days of the last week and maps their load', () => {
    const r = lastDays([W('2026-10-16', [set()]), W('2026-10-10', [set()]), W('2026-10-09', [set()])], '2026-10-16')
    expect(r.days.map(d => d.d)).toEqual(['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'])
    expect(r.days.filter(d => d.trained).map(d => d.d)).toEqual(['2026-10-10', '2026-10-16'])
    expect(r.workouts).toHaveLength(2)
    expect(r.load.chest).toBeGreaterThan(0)
  })
})

describe('hevier workout muscle split', () => {
  it('counts one workout’s sets per muscle, most first, as upstream’s load does', () => {
    const w = W('2026-10-01', [set(), set(), set(false)])
    const split = workoutSplit(w)
    const load = loadOfWorkouts([w])
    expect(split[0].muscle).toBe('chest')
    expect(split.map(r => r.sets)).toEqual([...split.map(r => r.sets)].sort((a, b) => b - a))
    for (const r of split) expect(r.sets).toBe(Math.round(load[r.muscle] * 10) / 10)
  })

  it('is empty for a workout with nothing ticked', () => {
    expect(workoutSplit(W('2026-10-01', [set(false)]))).toEqual([])
  })
})
