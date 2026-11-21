// The Measures page's Body measurements and Progress photos rows say what is there (the critique, 2026-11-21).
import { describe, expect, it } from 'vitest'
import { measurementsLine, photosLine } from './measures-rows.js'

const d = '2026-11-03'
describe('hevier: Measures rows', () => {
  it('the last check-in’s first field with a value, in the profile’s length unit, and its day', () => {
    const S = { unit: 'kg', measurements: [{ d: '2026-10-01', waist: 85 }, { d, neck: null, waist: 82 }] }
    expect(measurementsLine(S)).toMatch(/^Waist 82 cm · 3 Nov/)
    expect(measurementsLine({ ...S, unit: 'lb' })).toMatch(/^Waist 32\.3 in · 3 Nov/)
  })
  it('a field switched off is skipped, and nothing logged is no line', () => {
    expect(measurementsLine({ unit: 'kg', measurementEnabled: ['chest'], measurements: [{ d, waist: 82, chest: 100 }] })).toMatch(/^Chest 100 cm/)
    expect(measurementsLine({ unit: 'kg', measurements: [] })).toBeNull()
    expect(measurementsLine({ unit: 'kg', measurements: [{ d }] })).toBeNull()
  })
  it('the photos counted, with the newest one’s day', () => {
    expect(photosLine([{ d }, { d: '2026-10-01' }])).toMatch(/^2 photos · 3 Nov/)
    expect(photosLine([{ d }])).toMatch(/^1 photo · /)
    expect(photosLine([])).toBeNull()
  })
})
