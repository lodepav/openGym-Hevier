import { describe, it, expect } from 'vitest'
import { restDue, restFor } from './rest-extra.js'
import { makeSideSet } from '../../lib/workout-model.js'

const set = (done = false, extra = {}) => ({ w: 50, r: 8, done, ...extra })
const warm = (done = false) => set(done, { phase: 'warmup' })
const A = entries => ({ start: 1, entries })
const clone = x => structuredClone(x)

// TBJP Upper B's order: the fly ends, the next exercise opens with a warm-up.
describe('hevier restDue', () => {
  it('owes a rest after an exercise’s last set (upstream skips it before a warm-up)', () => {
    const before = A([{ id: 'fly', target: { restSec: 75 }, sets: [set(true), set(false)] }, { id: 'curl', sets: [warm(), set()] }])
    const after = clone(before); after.entries[0].sets[1].done = true
    expect(restDue(before, after)).toEqual({ idx: 0, i: 1, kind: 'unit' })
    expect(restFor(after, 0, 1, 90)).toBe(75)
  })

  it('owes a rest after the workout’s last set', () => {
    const before = A([{ id: 'curl', sets: [set(true), set(false)] }])
    const after = clone(before); after.entries[0].sets[1].done = true
    expect(restDue(before, after)?.kind).toBe('unit')
  })

  it('leaves a set in the middle of an exercise to upstream', () => {
    const before = A([{ id: 'curl', sets: [set(false), set(false)] }])
    const after = clone(before); after.entries[0].sets[0].done = true
    expect(restDue(before, after)).toBeNull()
  })

  it('owes a rest after the first side of a per-side set (the user’s Iso-Lateral High Row)', () => {
    const before = A([{ id: 'row', sets: [makeSideSet({ w: 50, r: 8 }), makeSideSet({ w: 50, r: 8 })] }])
    const after = clone(before); after.entries[0].sets[0].sides.L.done = true
    expect(restDue(before, after)).toEqual({ idx: 0, i: 0, kind: 'side' })
  })

  it('owes nothing in a workout logged into the past, an edit, or a new session', () => {
    const before = A([{ id: 'curl', sets: [set(false)] }])
    const after = clone(before); after.entries[0].sets[0].done = true
    expect(restDue({ ...before, backfill: true }, { ...after, backfill: true })).toBeNull()
    expect(restDue({ ...before, editingWorkoutId: 'w' }, { ...after, editingWorkoutId: 'w' })).toBeNull()
    expect(restDue(before, { ...after, start: 2 })).toBeNull()
    expect(restDue(null, after)).toBeNull()
  })
})
