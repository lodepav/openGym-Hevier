import { describe, expect, it } from 'vitest'
import { workoutCompare, sameRoutine } from './workout-compare.js'
import { EXDB } from '../../lib/exercises.js'

const BENCH = EXDB.find(e => /^barbell bench press$/i.test(e.n)).id
const at = (d, min) => { const s = new Date(d + 'T18:00:00').getTime(); return { d, start: s, end: s + min * 60000 } }
const set = (w, r, extra = {}) => ({ w, r, done: true, ...extra })

describe('hevier: a workout against the last time (workout-compare)', () => {
  it('has nothing to compare with in an empty log or without an earlier one', () => {
    expect(workoutCompare({ workouts: [] }, { id: 'x' })).toBeNull()
    const w = { id: 'a', name: 'Push', ...at('2026-11-10', 50), entries: [] }
    expect(workoutCompare({ workouts: [w] }, w)).toBeNull()
  })

  it('reads the latest earlier workout of the same routine, by hand', () => {
    // 3 × 60 × 8 = 1440 against 2 × 55 × 8 = 880 (its warm-up is no work set and no volume).
    const old = { id: 'o', routineIds: ['r1'], routineId: 'r1', name: 'Push', ...at('2026-11-03', 55),
      entries: [{ id: BENCH, sets: [set(40, 10, { phase: 'warmup' }), set(55, 8), set(55, 8)] }] }
    const other = { id: 'p', routineIds: ['r2'], routineId: 'r2', name: 'Push', ...at('2026-11-05', 30), entries: [{ id: BENCH, sets: [set(100, 1)] }] }
    const now = { id: 'n', routineIds: ['r1'], routineId: 'r1', name: 'Push renamed', ...at('2026-11-10', 51),
      entries: [{ id: BENCH, sets: [set(60, 8), set(60, 8), set(60, 8), set(60, 8, { done: false })] }] }
    const later = { id: 'l', routineIds: ['r1'], name: 'Push', ...at('2026-11-12', 40), entries: [] }
    const S = { unit: 'kg', workouts: [old, other, now, later] }
    expect(workoutCompare(S, now)).toEqual({ prev: old, volume: 560, sets: 1, minutes: -4 })
    // The log's order does not matter (an import can sit out of place).
    expect(workoutCompare({ unit: 'kg', workouts: [later, now, other, old] }, now)).toEqual({ prev: old, volume: 560, sets: 1, minutes: -4 })
  })

  it('matches an import by name, and leaves the minutes out without a clock', () => {
    const imp = (id, d, n) => ({ id, d, start: 0, end: 0, routineId: null, name: 'Legs', entries: [{ id: BENCH, sets: Array.from({ length: n }, () => set(50, 5)) }] })
    const S = { workouts: [imp('a', '2026-01-01', 2), imp('b', '2026-01-04', 3)] }
    const c = workoutCompare(S, S.workouts[1])
    expect(c).toMatchObject({ sets: 1, volume: 250, minutes: null })
    expect(c.prev.id).toBe('a')
  })

  it('does not compare two workouts that share only the name of a workout without a routine', () => {
    const free = (id, d) => ({ id, name: 'Freestyle', ...at(d, 40), entries: [{ id: BENCH, sets: [set(50, 5)] }] })
    const S = { workouts: [free('a', '2026-01-01'), free('b', '2026-01-04')] }
    expect(workoutCompare(S, S.workouts[1])).toBeNull()
  })

  it('takes the same routine by its ids when both have some, else by the name', () => {
    expect(sameRoutine({ routineIds: ['a'], name: 'X' }, { routineIds: ['b'], name: 'X' })).toBe(false)
    expect(sameRoutine({ routineIds: ['a'], name: 'X' }, { routineId: null, name: 'X' })).toBe(true)
    expect(sameRoutine({ routineIds: ['a', 'b'] }, { routineIds: ['b', 'a'] })).toBe(true)
    expect(sameRoutine({ name: '' }, { name: '' })).toBe(false)
  })
})
