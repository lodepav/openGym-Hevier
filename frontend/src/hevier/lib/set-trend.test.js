// @vitest-environment happy-dom
// Beat last time (DECISIONS.md D66).
import { describe, expect, it } from 'vitest'
import { DEF } from '../../store/useStore.js'
import { EXDB } from '../../lib/exercises.js'
import { setTrend, workoutTrends } from './set-trend.js'

describe('hevier: beat last time (D66)', () => {
  it('compares weight and reps, by the estimated 1RM when they disagree', () => {
    expect(setTrend({ w: 60, r: 8 }, { w: 55, r: 8 })).toBe(1)
    expect(setTrend({ w: 60, r: 8 }, { w: 60, r: 8 })).toBe(0)
    expect(setTrend({ w: 60, r: 7 }, { w: 60, r: 8 })).toBe(-1)
    expect(setTrend({ w: 60, r: 9 }, { w: 55, r: 8 })).toBe(1)
    expect(setTrend({ w: 70, r: 6 }, { w: 60, r: 8 })).toBe(1)     // 1RM 84 against 76
    expect(setTrend({ w: 62.5, r: 5 }, { w: 60, r: 8 })).toBe(-1)  // 1RM 72.9 against 76
    expect(setTrend({ w: 60, r: 8 }, null)).toBeNull()
  })

  it('reads reps without load, time for holds and cardio, and less help as more on an assistance machine', () => {
    expect(setTrend({ r: 12 }, { r: 10 })).toBe(1)
    expect(setTrend({ sec: 45 }, { sec: 60 })).toBe(-1)
    expect(setTrend({ min: 20 }, { min: 20 })).toBe(0)
    expect(setTrend({ sec: 45 }, { w: 20, r: 8 })).toBeNull()
    expect(setTrend({ w: 20, r: 8 }, { w: 30, r: 8 }, { assisted: true })).toBe(1)
    expect(setTrend({ w: 20, r: 6 }, { w: 30, r: 8 }, { assisted: true })).toBeNull()
  })

  it('holds a finished workout against the log before it, not after', () => {
    const id = EXDB.find(e => e.n === 'barbell bench press').id
    const day = (d, w, r) => ({ id: d, d, start: new Date(d + 'T18:00:00').getTime(), entries: [{ id, sets: [
      { w: 40, r: 10, done: true, phase: 'warmup' }, { w, r, done: true }] }] })
    const S = { ...structuredClone(DEF), workouts: [day('2026-10-01', 60, 8), day('2026-10-08', 65, 8), day('2026-10-15', 62.5, 8)] }
    expect(workoutTrends(S, S.workouts[0], 0)).toEqual([null, null])   // nothing before it
    expect(workoutTrends(S, S.workouts[1], 0)).toEqual([null, 1])
    expect(workoutTrends(S, S.workouts[2], 0)).toEqual([null, -1])
  })
})
