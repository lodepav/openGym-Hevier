import { describe, it, expect } from 'vitest'
import { effortInk } from './effort-ink.js'

// The audit, 2026-11-21: RIR 0 (purple) and 0.5 (red) read at 3.5–4.1:1 on their tinted pill.
describe('hevier: effort pill ink', () => {
  it('lightens the two hardest bands, keeps the others and a missing colour', () => {
    expect(effortInk('var(--purple)')).toBe('color-mix(in srgb, var(--purple) 75%, #fff)')
    expect(effortInk('var(--red)')).toBe('color-mix(in srgb, var(--red) 75%, #fff)')
    expect(effortInk('var(--orange)')).toBe('var(--orange)')
    expect(effortInk(undefined)).toBeUndefined()
  })
})
