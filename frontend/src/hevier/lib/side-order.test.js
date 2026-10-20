import { describe, it, expect } from 'vitest'
import { sideOrderOf, setSideOrder } from './side-order.js'

describe('hevier side order (D72)', () => {
  it('is left first unless the exercise says right first, and going back removes the entry', () => {
    const s = {}
    expect(sideOrderOf(s, '0581')).toEqual(['L', 'R'])
    setSideOrder(s, '0581', true)
    expect(sideOrderOf(s, '0581')).toEqual(['R', 'L'])
    expect(sideOrderOf(s, '0739')).toEqual(['L', 'R'])
    setSideOrder(s, '0581', false)
    expect(s.hvSideOrder).toBeUndefined()
  })
})
