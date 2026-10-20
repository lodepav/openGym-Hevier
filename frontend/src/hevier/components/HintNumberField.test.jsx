import { describe, it, expect } from 'vitest'
import { typedOver } from './HintNumberField.jsx'

// D2 (2026-10-20): a firm value is not selected on focus (no copy menu); the first key replaces it.
describe('hevier typedOver', () => {
  it('keeps only the key typed after the value', () => {
    expect(typedOver('52.5', '52.57')).toBe('7')
    expect(typedOver('55', '555')).toBe('5')
  })
  it('keeps only the key typed wherever the caret was', () => {
    expect(typedOver('50', '150')).toBe('1')
    expect(typedOver('12', '172')).toBe('7')
  })
  it('lets a backspace edit the value', () => {
    expect(typedOver('52.5', '52.')).toBe('52.')
    expect(typedOver('8', '')).toBe('')
  })
})
