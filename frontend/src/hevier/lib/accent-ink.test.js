import { describe, expect, it } from 'vitest'
import { contrast } from '../../lib/accent.js'
import { accentInk, INK_MIN } from './accent-ink.js'
import { HV_ACCENTS } from './accents.js'

const SURFACES = ['#1f1d19', '#16140f', '#000000']
const hue = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b)
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}

describe('the accent as text (accentInk)', () => {
  it('keeps every offered accent as it is', () => {
    for (const a of HV_ACCENTS) expect(accentInk(a.hex)).toBe(a.hex)
  })

  it('lifts a dark pick to 4.5:1 on every surface, at its own hue', () => {
    for (const pick of ['#007aff', '#ff0000', '#5500aa']) {
      const ink = accentInk(pick)
      expect(ink).not.toBe(pick)
      for (const s of SURFACES) expect(contrast(ink, s)).toBeGreaterThanOrEqual(INK_MIN)
      expect(Math.abs(hue(ink) - hue(pick))).toBeLessThan(2)
    }
  })

  it('stops just past the bar, not at white', () => {
    expect(contrast(accentInk('#007aff'), '#1f1d19')).toBeLessThan(5)
  })

  it('keeps a very light colour', () => {
    expect(accentInk('#ffffff')).toBe('#ffffff')
    expect(accentInk('#FFF3B0')).toBe('#fff3b0')
  })

  it('gives null for anything but a six-digit hex', () => {
    for (const v of [undefined, null, '', 'red', '#abc', 'url(x)', 42]) expect(accentInk(v)).toBeNull()
  })
})
