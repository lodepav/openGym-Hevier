import { describe, it, expect } from 'vitest'
import { openSet, pickAt, isOpenRow } from './open-set.js'

const s = (done, at) => ({ w: 50, r: 8, done, ...(at ? { at } : {}) })
const A = () => ({ entries: [{ id: 'a', sets: [s(true, 10), s(false), s(false)] }, { id: 'b', sets: [s(false), s(false)] }] })

describe('hevier openSet (D127)', () => {
  it('is the next set to do when nothing was tapped', () => {
    expect(openSet(A(), null)).toEqual({ idx: 0, i: 1 })
  })
  it('a tap on another set opens that one', () => {
    const a = A()
    expect(openSet(a, pickAt(a, 1, 1))).toEqual({ idx: 1, i: 1 })
  })
  it('once the tapped set is ticked, the next one of its exercise opens, then the workout’s next', () => {
    const a = A()
    const pick = pickAt(a, 1, 1)
    a.entries[1].sets[1] = s(true, 20)
    expect(openSet(a, pick)).toEqual({ idx: 1, i: 0 })
    a.entries[1].sets[0] = s(true, 30)
    expect(openSet(a, pick)).toEqual({ idx: 0, i: 1 })
  })
  it('a set already ticked when tapped stays open', () => {
    const a = A()
    expect(openSet(a, pickAt(a, 0, 0))).toEqual({ idx: 0, i: 0 })
  })
  it('a ticked set tapped to be fixed gives way once another set is ticked', () => {
    const a = A()
    const pick = pickAt(a, 0, 0)
    a.entries[0].sets[1] = s(true, 20)
    expect(openSet(a, pick)).toEqual({ idx: 0, i: 2 })
  })
  it('in a superset the other exercise opens after a tick, as the rest panel says', () => {
    const a = A()
    a.entries[0].sg = a.entries[1].sg = 'g1'
    expect(openSet(a, null)).toEqual({ idx: 1, i: 0 })
    a.entries[1].sets[0] = s(true, 20)
    expect(openSet(a, null)).toEqual({ idx: 0, i: 1 })
  })
  it('a per-side set with one side ticked stays open, in a superset and after a tap', () => {
    const side = (l, at) => ({ sides: { L: { w: 10, r: 8, done: l, ...(at ? { at } : {}) }, R: { w: 10, r: 8, done: false } }, done: false })
    const a = { entries: [{ id: 'a', sg: 'g', sets: [s(true, 10), s(false)] }, { id: 'b', sg: 'g', sets: [side(true, 20), side(false)] }] }
    expect(openSet(a, null)).toEqual({ idx: 1, i: 0 })
    const b = { entries: [{ id: 'b', sets: [side(false), side(false)] }] }
    const pick = pickAt(b, 0, 1)
    b.entries[0].sets[1] = side(true, 30)
    expect(openSet(b, pick)).toEqual({ idx: 0, i: 1 })
    // An L/R pair: the R row after the L row is ticked.
    const p = { entries: [{ id: 'a', sg: 'g', sets: [s(false)] }, { id: 'c', sg: 'g', sets: [{ sec: 30, side: 'L', done: true, at: 40 }, { sec: 30, side: 'R', done: false }] }] }
    expect(openSet(p, null)).toEqual({ idx: 1, i: 1 })
  })
  it('a tapped exercise opens its first set left, or the exercise alone when it has none', () => {
    const a = A()
    expect(openSet(a, pickAt(a, 1))).toEqual({ idx: 1, i: 0 })
    a.entries[1].sets = []
    expect(openSet(a, pickAt(a, 1))).toEqual({ idx: 1, i: null })
  })
  it('a tap whose exercise moved away no longer counts', () => {
    const a = A()
    const pick = pickAt(a, 1, 0)
    a.entries.reverse()
    expect(openSet(a, pick)).toEqual({ idx: 1, i: 1 })
  })
  it('a saved workout being edited opens only what is tapped', () => {
    const a = { ...A(), editingWorkoutId: 'w1' }
    expect(openSet(a, null)).toBeNull()
    expect(openSet(a, pickAt(a, 0, 2))).toEqual({ idx: 0, i: 2 })
  })
})

describe('hevier isOpenRow', () => {
  const pair = [s(false), { sec: 30, side: 'L', mode: 'time', done: true }, { sec: 30, side: 'R', mode: 'time', done: false }]
  it('an L/R pair opens as one set, from either row', () => {
    expect([0, 1, 2].map(i => isOpenRow(pair, { idx: 0, i: 2 }, i))).toEqual([false, true, true])
    expect(isOpenRow(pair, { idx: 0, i: null }, 0)).toBe(false)
  })
})
