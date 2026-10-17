import { describe, expect, it } from 'vitest'
import { EXDB } from '../../lib/exercises.js'
import { buildCombinedEntries } from '../../lib/session-merge.js'
import { swapActiveExercise } from '../../lib/active-exercise-swap.js'
import { buildPlannedEntry } from '../../lib/session-start.js'
import { routineUpdates, applyRoutineUpdates, undoRoutineUpdates, summaryParts, setDelta } from './routine-update.js'

const id = re => EXDB.find(e => re.test(e.n)).id
const SQUAT = id(/^barbell full squat$/i)
const BENCH = id(/^barbell bench press$/i)
const ROW = id(/^barbell bent over row$/i)
const CURL = id(/^lever lying leg curl$/i)
const DIP = id(/^chest dip$/i)

const routine = () => ({ id: 'r1', name: 'Leg Day', ex: [
  { id: SQUAT, sets: 5, reps: 5, weight: 100, restSec: 180 },
  { id: BENCH, sets: 3, reps: 8, weight: 60 },
  { id: ROW, sets: 3, reps: 10, weight: 50 },
] })
const state = (r = routine()) => ({ unit: 'kg', routines: [r], workouts: [] })
const start = S => ({ id: 'a1', entries: buildCombinedEntries(S, ['r1']).entries, routineIds: ['r1'] })
const added = (S, exId, extra = {}) => ({ id: exId, ...buildPlannedEntry(S, { id: exId, sets: 3, reps: 10, weight: 30 }, S.routines[0]), rid: 'r1', ...extra })
const tick = e => { e.sets.forEach(s => { s.done = true }); return e }
const one = (S, A) => routineUpdates(S, A)[0]

describe('hevier: keep the workout’s changes in its routine (D35)', () => {
  it('nothing when the workout followed the routine, even with other weights and reps', () => {
    const S = state()
    const A = start(S)
    A.entries.forEach(e => { tick(e); e.sets[0].w += 10; e.sets[0].r = 3 })
    expect(routineUpdates(S, A)).toEqual([])
  })

  it('an exercise added mid-workout joins the routine where it was done', () => {
    const S = state()
    const A = start(S)
    A.entries.splice(1, 0, tick(added(S, CURL)))
    const u = one(S, A)
    expect(u.ex.map(e => e.id)).toEqual([SQUAT, CURL, BENCH, ROW])
    expect(u.ex[1]).toMatchObject({ sets: 3, reps: 10 })
    expect(u.ex[1].rid).toBeUndefined()
    expect(u.summary).toMatchObject({ added: 1, removed: 0, swapped: 0, changed: 0, moved: false })
  })

  it('an exercise taken out of the workout leaves the routine; one left undone stays', () => {
    const S = state()
    const A = start(S)
    A.entries.splice(2, 1)   // the row, removed
    const u = one(S, A)       // the bench, never ticked, is still there
    expect(u.ex.map(e => e.id)).toEqual([SQUAT, BENCH])
    expect(u.summary.removed).toBe(1)
  })

  it('a swap keeps the slot’s place and prescription', () => {
    const S = state()
    const A = start(S)
    swapActiveExercise(A, 1, added(S, DIP))
    const u = one(S, A)
    expect(u.ex.map(e => e.id)).toEqual([SQUAT, DIP, ROW])
    expect(u.ex[1]).toMatchObject({ sets: 3, reps: 8 })
    expect(u.summary).toMatchObject({ swapped: 1, added: 0, removed: 0 })
  })

  it('a removed exercise and one added elsewhere are a removal and an addition', () => {
    const S = state()
    const A = start(S)
    A.entries.splice(1, 1)
    A.entries.push(tick(added(S, CURL)))
    const u = one(S, A)
    expect(u.ex.map(e => e.id)).toEqual([SQUAT, ROW, CURL])
    expect(u.summary).toMatchObject({ added: 1, removed: 1, swapped: 0 })
  })

  it('a new order', () => {
    const S = state()
    const A = start(S)
    A.entries.reverse()
    const u = one(S, A)
    expect(u.ex.map(e => e.id)).toEqual([ROW, BENCH, SQUAT])
    expect(u.summary.moved).toBe(true)
  })

  it('work sets added or removed change the set count, warm-ups do not', () => {
    const S = state()
    const A = start(S)
    const [sq, bench] = A.entries
    sq.sets.push({ ...sq.sets.at(-1) })
    bench.sets.pop()
    expect(setDelta(sq)).toBe(1)
    const u = one(S, A)
    expect(u.ex[0].sets).toBe(6)
    expect(u.ex[1].sets).toBe(2)
    expect(u.ex[0].reps).toBe(5)
    expect(u.summary.changed).toBe(2)
  })

  it('the set count is read against what the session opened with, not the routine’s', () => {
    const S = state()
    const A = start(S)
    A.entries[0].target = { ...A.entries[0].target, sets: 6 }   // progression added a set
    A.entries[0].sets.push({ ...A.entries[0].sets[0] })
    expect(routineUpdates(S, A)).toEqual([])
  })

  it('rest and note from the exercise’s settings, as upstream’s Update routine', () => {
    const S = state()
    const A = start(S)
    A.entries[1].target = { ...A.entries[1].target, restSec: 90, note: 'Pause at the chest' }
    A.entries[0].target = { ...A.entries[0].target, restSec: 0 }
    const u = one(S, A)
    expect(u.ex[1]).toMatchObject({ restSec: 90, note: 'Pause at the chest' })
    expect(u.ex[0].restSec).toBeUndefined()
  })

  it('a superset survives a removed partner as a single exercise', () => {
    const r = routine()
    r.ex[1].sg = 'g'; r.ex[2].sg = 'g'
    const S = state(r)
    const A = start(S)
    A.entries.splice(2, 1)
    expect(one(S, A).ex[1].sg).toBeUndefined()
  })

  it('a combined workout updates each routine on its own; freestyle and edits none', () => {
    const r2 = { id: 'r2', name: 'Arms', ex: [{ id: CURL, sets: 3, reps: 12, weight: 20 }] }
    const S = { ...state(), routines: [routine(), r2] }
    const A = { id: 'a', entries: buildCombinedEntries(S, ['r1', 'r2']).entries }
    A.entries.splice(2, 1)
    expect(routineUpdates(S, A).map(u => [u.rid, u.ex.length])).toEqual([['r1', 2]])
    // Every exercise of a routine taken out: the routine is left as it is, never emptied.
    A.entries.splice(2, 1)
    expect(routineUpdates(S, A).map(u => u.rid)).toEqual(['r1'])
    expect(routineUpdates(S, { entries: [tick(added(S, CURL, { rid: undefined }))] })).toEqual([])
    expect(routineUpdates(S, { ...start(S), editingWorkoutId: 'w', entries: [] })).toEqual([])
  })

  it('applies all at once, and Undo puts the routine back', () => {
    const S = state()
    const A = start(S)
    A.entries.splice(1, 0, tick(added(S, CURL)))
    A.entries.splice(3, 1)
    const us = routineUpdates(S, A)
    expect(summaryParts(us)).toMatchObject({ added: 1, removed: 1 })
    const s = structuredClone(S)
    const before = applyRoutineUpdates(s, us)
    expect(s.routines[0].ex.map(e => e.id)).toEqual([SQUAT, CURL, BENCH])
    undoRoutineUpdates(s, before)
    expect(s.routines[0].ex).toEqual(S.routines[0].ex)
  })
})
