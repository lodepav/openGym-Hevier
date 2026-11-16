import { describe, expect, it } from 'vitest'
import { EXDB } from '../../lib/exercises.js'
import { buildCombinedEntries } from '../../lib/session-merge.js'
import { buildPlannedEntry } from '../../lib/session-start.js'
import { finishFacts, changedText } from './finish-facts.js'

const id = re => EXDB.find(e => re.test(e.n)).id
const BENCH = id(/^barbell bench press$/i)
const ROW = id(/^barbell bent over row$/i)
const CURL = id(/^lever lying leg curl$/i)

const routine = () => ({ id: 'r1', name: 'Upper A', ex: [{ id: BENCH, sets: 2, reps: 5, weight: 60 }, { id: ROW, sets: 2, reps: 8, weight: 50 }] })
const before = { id: 'w0', d: '2026-10-01', start: Date.parse('2026-10-01T10:00:00'), entries: [{ id: BENCH, sets: [{ w: 50, r: 5, done: true }] }] }
const state = () => ({ unit: 'kg', routines: [routine()], workouts: [before] })
const start = S => ({ id: 'a1', d: '2026-10-05', start: Date.parse('2026-10-05T10:00:00'), entries: buildCombinedEntries(S, ['r1']).entries, routineIds: ['r1'] })

describe('hevier finishFacts (D132)', () => {
  it('counts ticked work sets, the sets with a new best, and what is left unticked', () => {
    const S = state()
    const A = start(S)
    Object.assign(A.entries[0].sets[0], { w: 60, r: 5, done: true })
    Object.assign(A.entries[0].sets[1], { w: 55, r: 5, done: true })
    A.entries[1].sets[0].done = true
    S.active = A
    const f = finishFacts(S)
    expect(f.sets).toBe(3)
    expect(f.best).toBe(1)
    expect(f.unticked).toBe(1)
    expect(f.none).toBe(false)
    expect(f.updates).toEqual([])
    expect(f.changed).toBeNull()
  })

  it('a per-side set counts once, and each side left is unticked', () => {
    const S = state()
    const A = start(S)
    A.entries[0].sets = [{ w: 20, r: 16, done: false, sides: { L: { w: 20, r: 8, done: true }, R: { w: 20, r: 8, done: false } } }]
    A.entries[1].sets = []
    const f = finishFacts(S, A)
    expect(f.sets).toBe(1)
    expect(f.unticked).toBe(1)
  })

  it('nothing ticked says so', () => {
    const S = state()
    const f = finishFacts(S, start(S))
    expect(f.none).toBe(true)
    expect(f.sets).toBe(0)
  })

  it('says what the workout changed in its routine', () => {
    const S = state()
    const A = start(S)
    A.entries.push({ id: CURL, ...buildPlannedEntry(S, { id: CURL, sets: 3, reps: 10, weight: 30 }, S.routines[0]), rid: 'r1' })
    A.entries.forEach(e => e.sets.forEach(s => { s.done = true }))
    const f = finishFacts(S, A)
    expect(f.updates).toHaveLength(1)
    expect(f.changed).toMatchObject({ added: 1, removed: 0, swapped: 0 })
    expect(changedText(f.changed)).toBe('1 added')
    expect(changedText({ added: 0, removed: 1, swapped: 2, changed: 0, moved: true })).toBe('1 removed · 2 swapped · new order')
    expect(changedText(null)).toBe('')
  })

  it('a saved workout being edited never offers a routine update', () => {
    const S = state()
    const A = { ...start(S), editingWorkoutId: 'w0' }
    A.entries.pop()
    expect(finishFacts(S, A).updates).toEqual([])
  })
})
