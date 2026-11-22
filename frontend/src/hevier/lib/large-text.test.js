import { describe, expect, it } from 'vitest'
import { isLargeText } from './large-text.js'

describe('hevier isLargeText', () => {
  it('is large from 150 % up, and not when unmeasured', () => {
    expect(isLargeText(16)).toBe(false)
    expect(isLargeText(22.4)).toBe(false)   // 140 %
    expect(isLargeText(24)).toBe(true)
    expect(isLargeText(32)).toBe(true)
    expect(isLargeText(21, 14)).toBe(true)
    expect(isLargeText(NaN)).toBe(false)
    expect(isLargeText(0)).toBe(false)
  })
})
