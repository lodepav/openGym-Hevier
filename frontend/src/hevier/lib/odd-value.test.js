import { describe, it, expect } from 'vitest'
import { bestsFor, oddValues, longRun } from './odd-value.js'
import { makeSideSet } from '../../lib/workout-model.js'

const S = { workouts: [
  { entries: [{ id: 'x', sets: [{ w: 30, r: 8, done: true }, { w: 20, r: 12, done: true }] }, { id: 'y', sets: [{ w: 200, r: 50 }] }] },
  { entries: [{ id: 'x', sets: [{ w: 25, r: 10 }, { mode: 'time', sec: 90, w: 0 }] }] },
  { entries: [{ id: 'z', sets: [makeSideSet({ w: 24, r: 22 })] }] },
] }

describe('hevier: a mistyped weight or rep count (D90)', () => {
  it('reads the heaviest weight and most reps the exercise has logged, a side counted alone', () => {
    expect(bestsFor(S, 'x')).toEqual({ w: 30, r: 12 })
    expect(bestsFor(S, 'z').r).toBe(11)
    expect(bestsFor(S, 'new')).toEqual({ w: 0, r: 0 })
  })

  it('asks over twice the best and at least 10 more, never for a real jump or a first time', () => {
    const b = { w: 30, r: 12 }
    expect(oddValues({ w: 300, r: 8 }, b)).toEqual([{ f: 'w', typed: 300, best: 30 }])
    expect(oddValues({ w: 30, r: 80 }, b)).toEqual([{ f: 'r', typed: 80, best: 12 }])
    expect(oddValues({ w: 60, r: 24 }, b)).toEqual([])
    expect(oddValues({ w: 12, r: 8 }, { w: 5, r: 3 })).toEqual([])         // over twice, but not 10 more
    expect(oddValues({ w: 300, r: 300 }, { w: 0, r: 0 })).toEqual([])
    expect(oddValues({ w: 32, r: 8 }, { w: 15, r: 8 }, { unit: 'lb' })).toEqual([])   // 17 lb more: under 20
    expect(oddValues({ w: 300, r: 8 }, b, { assisted: true })).toEqual([])
  })

  it('asks under a third of last time’s same set and at least 10 kg or 5 reps less', () => {
    const b = { w: 30, r: 12 }, last = { w: 30, r: 10 }
    expect(oddValues({ w: 3, r: 10 }, b, { last })).toEqual([{ f: 'w', typed: 3, best: 30, low: true }])
    expect(oddValues({ w: 30, r: 1 }, b, { last })).toEqual([{ f: 'r', typed: 1, best: 10, low: true }])
    expect(oddValues({ w: 15, r: 5 }, b, { last })).toEqual([])                     // a deload or a back-off
    expect(oddValues({ w: 2, r: 2 }, b, { last: { w: 6, r: 3 } })).toEqual([])        // under a third, not 10 / 5 less
    expect(oddValues({ w: 3, r: 10 }, b, { last, assisted: true })).toEqual([])
    expect(oddValues({ w: 3, r: 10 }, b)).toEqual([])                                 // no last time
  })

  it('a cardio timer past twice its time and 10 minutes more looks forgotten', () => {
    expect(longRun(100 * 60, 30 * 60, 0)).toBe(1800)
    expect(longRun(100 * 60, 20 * 60, 30 * 60)).toBe(1800)
    expect(longRun(45 * 60, 20 * 60, 0)).toBe(1200)
    expect(longRun(12 * 60, 5 * 60, 0)).toBe(0)        // over twice, but under 10 minutes more
    expect(longRun(50 * 60, 30 * 60, 0)).toBe(0)
    expect(longRun(5 * 3600, 0, 0)).toBe(0)
  })
})
