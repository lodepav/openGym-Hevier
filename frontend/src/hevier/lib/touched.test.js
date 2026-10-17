import { describe, expect, it } from 'vitest'
import { shiftTouched } from './touched.js'

const rows = (...r) => r.map(x => JSON.stringify(x))

describe('hevier: touched marks follow their set (D2)', () => {
  const before = rows({ r: 8 }, { r: 9 }, { r: 10 })

  it('a set removed above moves the marks below it up, and its own go', () => {
    const marks = new Set(['0:r', '1:w', '2:r'])
    expect([...shiftTouched(marks, before, rows({ r: 8 }, { r: 10 }))]).toEqual(['0:r', '1:r'])
  })

  it('a set added above (a warm-up first) moves them down', () => {
    const marks = new Set(['0:r', '2:Lw'])
    expect([...shiftTouched(marks, before, rows({ r: 5 }, { r: 8 }, { r: 9 }, { r: 10 }))]).toEqual(['1:r', '3:Lw'])
  })

  it('a set added at the end changes nothing', () => {
    const marks = new Set(['0:r', '2:r'])
    expect(shiftTouched(marks, before, rows({ r: 8 }, { r: 9 }, { r: 10 }, { r: 10 }))).toEqual(marks)
  })

  it('the same number of rows keeps the marks as they are', () => {
    const marks = new Set(['1:r'])
    expect(shiftTouched(marks, before, rows({ r: 8 }, { r: 12 }, { r: 10 }))).toBe(marks)
  })
})
