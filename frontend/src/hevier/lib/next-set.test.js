import { describe, it, expect } from 'vitest'
import { nextSet } from './next-set.js'

const s = (done, at) => ({ w: 50, r: 8, done, ...(at ? { at } : {}) })

describe('hevier nextSet', () => {
  it('is the first set of the workout before anything is ticked', () => {
    expect(nextSet({ entries: [{ sets: [s(false), s(false)] }, { sets: [s(false)] }] })).toEqual({ idx: 0, i: 0 })
  })
  it('follows the exercise last ticked in, not the screen’s order', () => {
    const A = { entries: [{ sets: [s(true, 10), s(false)] }, { sets: [s(true, 20), s(false), s(false)] }] }
    expect(nextSet(A)).toEqual({ idx: 1, i: 1 })
  })
  it('moves on to the next exercise with a set left, round the end to the first', () => {
    const A = { entries: [{ sets: [s(false)] }, { sets: [s(true, 5)] }, { sets: [s(true, 30)] }] }
    expect(nextSet(A)).toEqual({ idx: 0, i: 0 })
  })
  it('stays on a per-side set with one side ticked', () => {
    const side = { done: false, sides: { L: { done: true, at: 40 }, R: { done: false } } }
    expect(nextSet({ entries: [{ sets: [s(false)] }, { sets: [side, s(false)] }] })).toEqual({ idx: 1, i: 0 })
  })
  it('is null once every set is done', () => {
    expect(nextSet({ entries: [{ sets: [s(true, 1)] }] })).toBeNull()
    expect(nextSet(null)).toBeNull()
  })
})
