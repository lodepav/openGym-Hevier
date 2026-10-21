import { describe, it, expect } from 'vitest'
import { hereIdx, insertIndex, insertAfter, placeAt } from './add-at-end.js'

const set = (done, at) => (done ? { done: true, at } : {})
const ex = (id, ...sets) => ({ id, sets })

describe('Add Exercise: insert after the current one, or add to the end (D78)', () => {
  it('the exercise you are on is the one holding the next set, not upstream’s stale cur', () => {
    const A = { cur: 2, entries: [ex('a', set(1, 10), set(0)), ex('b', set(0)), ex('c', set(0))] }
    expect(hereIdx(A)).toBe(0)
    expect(insertAfter(A).id).toBe('a')
  })
  it('names the exercise a pick would follow while that is not the end', () => {
    const A = { cur: 0, entries: [ex('a', set(1, 10)), ex('b', set(1, 20), set(0)), ex('c', set(0))] }
    expect(insertAfter(A).id).toBe('b')
  })
  it('a superset in the middle is inserted after as a whole', () => {
    const A = { cur: 0, entries: [{ id: 'a', sg: 'x', sets: [set(0)] }, { id: 'b', sg: 'x', sets: [set(0)] }, ex('c', set(0))] }
    expect(insertIndex(A, hereIdx(A))).toBe(2)
    expect(insertAfter(A).id).toBe('b')
  })
  it('offers nothing to choose when the one you are on is last, or the workout is empty', () => {
    expect(insertAfter({ cur: 0, entries: [ex('a', set(1, 10)), ex('b', set(1, 20)), ex('c', set(1, 30), set(0))] })).toBeNull()
    expect(insertAfter({ cur: 0, entries: [] })).toBeNull()
  })
  it('every set done: upstream’s cur', () => {
    expect(hereIdx({ cur: 1, entries: [ex('a', set(1, 10)), ex('b', set(1, 20))] })).toBe(1)
  })
  it('placeAt makes the end, or the one you are on, the current one', () => {
    const A = { cur: 2, entries: [ex('a', set(0)), ex('b', set(0)), ex('c', set(0))] }
    placeAt(A, false)
    expect(A.cur).toBe(0)
    placeAt(A, true)
    expect(insertIndex(A)).toBe(3)
    const E = { cur: 0, entries: [] }
    placeAt(E, true)
    expect(E.cur).toBe(0)
  })
})
