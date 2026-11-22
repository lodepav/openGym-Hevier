import { describe, expect, it } from 'vitest'
import { tappedIndex } from './chart-tap.js'

describe('chart tap: the point a readout names', () => {
  it('matches the readout line to the drawn point, rounded to a tenth', () => {
    expect(tappedIndex(34, '34.0,20.0 181.0,40.0 328.0,10.0')).toBe(0)
    expect(tappedIndex(180.96, '34.0,20.0 181.0,40.0 328.0,10.0')).toBe(1)
    expect(tappedIndex(328, '34.0,20.0 181.0,40.0 328.0,10.0')).toBe(2)
  })
  it('a single point, drawn twice, is the first', () => {
    expect(tappedIndex(181, '181.0,20.0 181.0,20.0')).toBe(0)
  })
  it('nothing when the line matches no point or the markup is not what it was', () => {
    expect(tappedIndex(100, '34.0,20.0 181.0,40.0')).toBe(null)
    expect(tappedIndex(NaN, '34.0,20.0')).toBe(null)
    expect(tappedIndex(34, '')).toBe(null)
    expect(tappedIndex(34, 'M34 20 L181 40')).toBe(null)
  })
})
