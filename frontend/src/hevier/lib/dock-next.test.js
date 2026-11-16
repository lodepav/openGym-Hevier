import { describe, it, expect } from 'vitest'
import { dockNext } from './dock-next.js'

const S = entries => ({ unit: 'kg', active: { entries } })
const set = (w, r, done) => ({ w, r, done: !!done })

describe('the rest panel’s next set in two parts (D127)', () => {
  it('the same exercise: which set, and its numbers', () => {
    const s = S([{ id: 'x', n: 'Row, cable', sets: [set(55, 13, true), set(55, 13)] }])
    expect(dockNext(s, 0)).toEqual({ cap: 'Set 2 of 2', what: '55 kg × 13' })
  })
  it('another exercise: its name, and its numbers', () => {
    const s = S([{ id: 'x', n: 'Row', sets: [set(55, 13, true)] }, { id: 'y', n: 'Curl', sets: [set(10, 8)] }])
    expect(dockNext(s, 0)).toEqual({ cap: 'Curl', what: '10 kg × 8' })
  })
  it('nothing left: null', () => {
    expect(dockNext(S([{ id: 'x', n: 'Row', sets: [set(55, 13, true)] }]), 0)).toBe(null)
  })
})
