import { describe, expect, it } from 'vitest'
import { contrast } from '../../lib/accent.js'
import { HV_ACCENTS, MIN_APART, DEFAULT_GREEN, HEVY_BLUE, accentFields, wornHex, hvAccentId } from './accents.js'
import { MEANINGS, distance } from './meaning-colours.js'

const firsts = [...new Set(Object.values(MEANINGS).map(([first]) => first))]
const extras = HV_ACCENTS.slice(2)

describe('the offered accents (D123)', () => {
  it('starts with the default green, then Hevy blue, then 2 to 6 more', () => {
    expect(HV_ACCENTS[0]).toMatchObject({ id: 'green', hex: DEFAULT_GREEN })
    expect(HV_ACCENTS[1]).toMatchObject({ id: 'blue', hex: HEVY_BLUE })
    expect(extras.length).toBeGreaterThanOrEqual(2)
    expect(extras.length).toBeLessThanOrEqual(6)
  })
  it('each has a unique id, a label and a lowercase hex', () => {
    expect(new Set(HV_ACCENTS.map(a => a.id)).size).toBe(HV_ACCENTS.length)
    for (const a of HV_ACCENTS) {
      expect(a.label).toBeTruthy()
      expect(a.hex).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
  it('each extra sits at least MIN_APART from every meaning colour', () => {
    for (const a of extras) for (const m of firsts) expect(distance(a.hex, m), `${a.id} ${m}`).toBeGreaterThanOrEqual(MIN_APART)
  })
  it('every offered accent sits at least MIN_APART from every other', () => {
    for (const a of HV_ACCENTS) for (const b of HV_ACCENTS) if (a !== b) expect(distance(a.hex, b.hex), `${a.id} ${b.id}`).toBeGreaterThanOrEqual(MIN_APART)
  })
  it('each reads as text on black and on the well, and black ink reads on it', () => {
    for (const a of HV_ACCENTS) {
      expect(contrast(a.hex, '#000000'), a.id).toBeGreaterThanOrEqual(4.5)
      expect(contrast(a.hex, '#16140f'), a.id).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('the worn accent', () => {
  it('a pick writes upstream fields; the worn hex and id read it back', () => {
    const S = accentFields('#40C8E0')
    expect(S).toEqual({ accent: 'custom', accentCustom: '#40c8e0' })
    expect(wornHex(S)).toBe('#40c8e0')
    expect(hvAccentId(S)).toBe('teal')
  })
  it('a kept upstream preset is its hex, with no offered id', () => {
    expect(wornHex({ accent: 'orange' })).toBe('#ff9f0a')
    expect(hvAccentId({ accent: 'orange' })).toBeNull()
  })
})
