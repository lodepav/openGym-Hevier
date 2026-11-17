import { describe, expect, it } from 'vitest'
import { nearestIndex } from './nearest-bar.js'

const C = [10, 20, 30, 40]

describe('the week a tap on the chart picks (nearestIndex)', () => {
  it('takes the nearest bar centre', () => {
    expect(nearestIndex(21, C)).toBe(1)
    expect(nearestIndex(28, C)).toBe(2)
  })
  it('keeps to the ends outside the bars', () => {
    expect(nearestIndex(-50, C)).toBe(0)
    expect(nearestIndex(500, C)).toBe(3)
  })
  it('takes the earlier bar exactly between two', () => {
    expect(nearestIndex(25, C)).toBe(1)
  })
  it('has one answer for one bar and none for no bars or no x', () => {
    expect(nearestIndex(99, [5])).toBe(0)
    expect(nearestIndex(5, [])).toBe(-1)
    expect(nearestIndex(NaN, C)).toBe(-1)
    expect(nearestIndex(undefined, C)).toBe(-1)
  })
})
