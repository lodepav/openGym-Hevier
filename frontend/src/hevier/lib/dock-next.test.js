import { describe, it, expect } from 'vitest'
import { dockNext } from './dock-next.js'

const S = entries => ({ unit: 'kg', active: { entries } })
const set = (w, r, done) => ({ w, r, done: !!done })

describe('the rest panel’s next set in two parts (D127)', () => {
  it('the same exercise: which set, and its numbers', () => {
    const s = S([{ id: 'x', n: 'Row, cable', sets: [set(55, 13, true), set(55, 13)] }])
    expect(dockNext(s, 0)).toEqual({ cap: 'Set 2 of 2', what: '55 kg × 13' })
  })
  it('counts work sets as the table does: warm-ups apart, and a warm-up next is named by its exercise', () => {
    const warm = (w, r, done) => ({ ...set(w, r, done), phase: 'warmup' })
    const sets = done => [warm(40, 5, true), warm(50, 3, done), set(60, 8), set(60, 8), set(60, 8)]
    expect(dockNext(S([{ id: 'x', n: 'Row', sets: sets(true) }]), 0)).toEqual({ cap: 'Set 1 of 3', what: '60 kg × 8' })
    expect(dockNext(S([{ id: 'x', n: 'Row', sets: sets(false) }]), 0).cap).toBe('Row')
  })
  it('another exercise: its name, and its numbers', () => {
    const s = S([{ id: 'x', n: 'Row', sets: [set(55, 13, true)] }, { id: 'y', n: 'Curl', sets: [set(10, 8)] }])
    expect(dockNext(s, 0)).toEqual({ cap: 'Curl', what: '10 kg × 8' })
  })
  it('nothing left: null', () => {
    expect(dockNext(S([{ id: 'x', n: 'Row', sets: [set(55, 13, true)] }]), 0)).toBe(null)
  })
})
