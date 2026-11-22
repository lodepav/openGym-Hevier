import { describe, it, expect } from 'vitest'
import { signed } from './delta.js'
import { durationWords } from './elapsed.js'

describe('signed', () => {
  it('writes a plus or a true minus, and nothing for none', () => {
    expect(signed(3)).toEqual({ up: true, text: '+3' })
    expect(signed(-2)).toEqual({ up: false, text: '−2' })
    expect(signed(0)).toBeNull()
    expect(signed(-90 * 60000, durationWords)).toEqual({ up: false, text: '−1 h 30 min' })
  })
})

describe('durationWords', () => {
  it('writes a total to the minute, spaced as the Finish sheet writes it', () => {
    expect(durationWords(45 * 60000 + 20000)).toBe('45 min')
    expect(durationWords((24 * 60 + 17) * 60000)).toBe('24 h 17 min')
    expect(durationWords(3 * 3600000)).toBe('3 h')
    expect(durationWords(40000)).toBe('40 s')
  })
})
