import { describe, it, expect } from 'vitest'
import { insertIndex, insertAfter, toEnd } from './add-at-end.js'

describe('Add Exercise: insert after the current one, or add to the end (D78)', () => {
  it('names the exercise a pick would follow while that is not the end', () => {
    const A = { cur: 0, entries: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }
    expect(insertIndex(A)).toBe(1)
    expect(insertAfter(A).id).toBe('a')
  })
  it('a superset in the middle is inserted after as a whole', () => {
    const A = { cur: 1, entries: [{ id: 'a', sg: 'x' }, { id: 'b', sg: 'x' }, { id: 'c' }] }
    expect(insertIndex(A)).toBe(2)
    expect(insertAfter(A).id).toBe('b')
  })
  it('offers nothing to choose when the current one is last, or the workout is empty', () => {
    expect(insertAfter({ cur: 2, entries: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] })).toBeNull()
    expect(insertAfter({ cur: 1, entries: [{ id: 'a' }, { id: 'b', sg: 'x' }, { id: 'c', sg: 'x' }] })).toBeNull()
    expect(insertAfter({ cur: 0, entries: [] })).toBeNull()
  })
  it('Add to end makes the last one current, so upstream’s add goes to the end', () => {
    const A = { cur: 0, entries: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }
    toEnd(A)
    expect(insertIndex(A)).toBe(3)
    const E = { cur: 0, entries: [] }
    toEnd(E)
    expect(E.cur).toBe(0)
  })
})
