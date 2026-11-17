import { describe, it, expect } from 'vitest'
import { sep, fmtDate } from './dates.js'

describe('short months', () => {
  it('writes September as Sep, as every other month has three letters', () => {
    expect(sep('8 Sept')).toBe('8 Sep')
    expect(sep('Mon, 8 Sept 2025')).toBe('Mon, 8 Sep 2025')
    expect(sep('8 Oct')).toBe('8 Oct')
    expect(sep('September')).toBe('September')
    expect(sep('8 sept.')).toBe('8 sept.')
  })
  it('over upstream’s date', () => {
    expect(fmtDate('2026-09-08')).not.toMatch(/Sept\b/)
  })
})
