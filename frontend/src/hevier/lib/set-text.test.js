import { describe, it, expect } from 'vitest'
import { hevySetText, hevySetLabel, previousText } from './set-text.js'

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
    expect(hevySetLabel('x', { min: 918 / 60, speed: 0 }, cardio, 'kmh')).toBe('15:18')
    expect(hevySetLabel('x', { min: 10, incline: 5 }, cardio, 'kmh')).toMatch(/^10:00 · /)
    expect(hevySetLabel('x', { sec: 75 }, { mode: 'time' })).toBe('1:15')
  })
})

describe('previousText', () => {
  const opts = { mode: 'reps', unit: 'kg' }
  it('writes last time’s weight and reps, body weight with its added load', () => {
    expect(previousText({ w: 60, r: 8 }, opts)).toBe('60kg × 8')
    expect(previousText({ w: 10, r: 12 }, { ...opts, bw: true })).toBe('+10kg × 12')
    expect(previousText({ w: 0, r: 12 }, { ...opts, bw: true })).toBe('× 12')
    expect(previousText(null, opts)).toBe('–')
  })
  it('in the exercise’s own unit', () => {
    expect(previousText({ w: 20.41165665, r: 8 }, { ...opts, unit: 'lb', show: w => Math.round(w / 0.45359237) })).toBe('45lb × 8')
  })
  it('one side of a per-side set, or none when last time had no sides', () => {
    const p = { w: 20, r: 20, sides: { L: { w: 20, r: 10 }, R: { w: 22, r: 9 } } }
    expect(previousText(p, { ...opts, side: 'R' })).toBe('22kg × 9')
    expect(previousText({ w: 20, r: 10 }, { ...opts, side: 'L' })).toBe('–')
  })
})
