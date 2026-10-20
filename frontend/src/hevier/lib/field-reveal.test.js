import { describe, it, expect } from 'vitest'
import { clearDelta } from './field-reveal.js'

// A phone's numbers: the workout header ends at 300, the keyboard starts at 1200.
describe('hevier clearDelta', () => {
  it('leaves a field already in sight alone', () => {
    expect(clearDelta({ top: 600, bottom: 650 }, 300, 1200)).toBe(0)
  })
  it('scrolls a set under the keyboard up above it', () => {
    expect(clearDelta({ top: 1300, bottom: 1350 }, 300, 1200)).toBe(162)
  })
  it('scrolls a set under the sticky header down below it', () => {
    expect(clearDelta({ top: 250, bottom: 300 }, 300, 1200)).toBe(-62)
  })
  it('stops above the rest timer standing on the keyboard', () => {
    expect(clearDelta({ top: 1000, bottom: 1050 }, 300, 1000)).toBe(62)
  })
  it('keeps the top of a field taller than the gap in sight', () => {
    expect(clearDelta({ top: 500, bottom: 1500 }, 300, 1200)).toBe(188)
  })
})
