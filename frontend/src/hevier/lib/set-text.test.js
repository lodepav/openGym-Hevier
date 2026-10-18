import { describe, it, expect } from 'vitest'
import { hevySetText, hevySetLabel } from './set-text.js'

describe('hevySetText', () => {
  it('writes the plain weight × reps out in full', () => {
    expect(hevySetText('60×8', 'kg')).toBe('60kg × 8 reps')
    expect(hevySetText('22.5×10', 'lb')).toBe('22.5lb × 10 reps')
    expect(hevySetText('60×8 F', 'kg')).toBe('60kg × 8 reps F')
  })
  it('leaves upstream’s other forms alone', () => {
    expect(hevySetText('+10 × 12', 'kg')).toBe('+10 × 12')
    expect(hevySetText('20 each × 8', 'kg')).toBe('20 each × 8')
    expect(hevySetText('60×10+4+2', 'kg')).toBe('60×10+4+2')
    expect(hevySetText('30 min @ 10 km/h', 'kg')).toBe('30 min @ 10 km/h')
  })
})

describe('hevier cardio time as a clock (D53)', () => {
  it('writes a cardio set’s minutes as h:mm:ss, every other set as upstream does', () => {
    const cardio = { mode: 'cardio' }
    expect(hevySetLabel('x', { min: 754 / 60, speed: 8 }, cardio, 'kmh')).toMatch(/^12:34 @ 8/)
    expect(hevySetLabel('x', { min: 90, speed: 8 }, cardio, 'kmh')).toMatch(/^1:30:00 @ /)
    expect(hevySetLabel('x', { sec: 75 }, { mode: 'time' })).toBe('1:15')
  })
})
