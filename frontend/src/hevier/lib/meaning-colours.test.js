import { describe, expect, it } from 'vitest'
import { contrast } from '../../lib/accent.js'
import { ACCENTS } from '../../lib/format.js'
import { HV_ACCENTS, MIN_APART, DEFAULT_GREEN, HEVY_BLUE } from './accents.js'
import { LABEL, MEANINGS, distance, meaningColours, oklab, tooClose } from './meaning-colours.js'

const KEYS = ['cardio', 'deload', 'drop', 'warmup', 'fail', 'superset', 'record', 'note']
const DISTINCT = ['cardio', 'deload', 'drop', 'superset', 'fail', 'warmup']

// 36 hues at a few lightness levels, as HSL at full saturation.
function hsl(h, l) {
  const c = (1 - Math.abs(2 * l - 1)), x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return '#' + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')
}
const sweep = []
for (let h = 0; h < 360; h += 10) for (const l of [0.35, 0.5, 0.6, 0.7, 0.8]) sweep.push(hsl(h, l))

describe('OKLab distance', () => {
  it('white is L 1, black L 0, a grey has no hue', () => {
    expect(oklab('#ffffff')[0]).toBeCloseTo(1, 3)
    expect(oklab('#000000')[0]).toBeCloseTo(0, 6)
    const [, a, b] = oklab('#808080')
    expect(Math.abs(a) + Math.abs(b)).toBeLessThan(1e-4)
  })
  it('matches the plan: default green to the cardio green 0.065, orange to warm-up yellow 0.038', () => {
    expect(distance(DEFAULT_GREEN, '#2fbf5b')).toBeCloseTo(0.065, 2)
    expect(distance('#ff9f0a', '#efab03')).toBeCloseTo(0.038, 2)
    expect(tooClose(DEFAULT_GREEN, '#2fbf5b')).toBe(true)
    expect(tooClose(DEFAULT_GREEN, '#40c8e0')).toBe(false)
  })
})

describe('meaningColours (D123)', () => {
  it('returns the eight meanings, never done or better', () => {
    expect(Object.keys(meaningColours(DEFAULT_GREEN)).sort()).toEqual([...KEYS].sort())
  })
  it('under the default green cardio steps aside to teal, and deload to pink, apart from the warm-up yellow', () => {
    const firsts = Object.fromEntries(KEYS.map(k => [k, MEANINGS[k][0]]))
    expect(meaningColours(DEFAULT_GREEN)).toEqual({ ...firsts, cardio: '#40c8e0', deload: '#ff7eb6' })
  })
  it('under Hevy blue cardio keeps its green and the drop set turns teal, apart from the superset violet', () => {
    const c = meaningColours(HEVY_BLUE)
    expect(c.cardio).toBe('#2fbf5b')
    expect(c.drop).toBe('#40c8e0')
    expect(c.superset).toBe('#bf5af2')
  })
  it('a kept orange turns warm-up, record and note teal and deload pink', () => {
    const c = meaningColours(ACCENTS.orange)
    expect(c.deload).toBe('#ff7eb6')
    expect(c.warmup).toBe('#40c8e0')
    expect(c.record).toBe('#40c8e0')
    expect(c.note).toBe('#40c8e0')
  })
  it('a violet accent leaves the drop set its blue and gives the superset an extra hue', () => {
    const c = meaningColours(ACCENTS.violet)
    expect(c.drop).toBe(HEVY_BLUE)
    expect(c.superset).toBe('#40c8e0')
    expect(c.deload).toBe('#ff7eb6')
  })
  it('takes an extra hue when first and backup both clash', () => {
    // #8070f0 sits between the drop set's blue and its violet backup, under 0.12 from both
    expect(meaningColours('#8070f0').drop).toBe('#40c8e0')
    expect(meaningColours('#e34b37').fail).toBe('#40c8e0')
  })
  it('no usable accent: every meaning keeps its first value but deload, apart from the warm-up', () => {
    const firsts = Object.fromEntries(KEYS.map(k => [k, MEANINGS[k][0]]))
    for (const v of [undefined, '', 'lime', '#abc']) expect(meaningColours(v)).toEqual({ ...firsts, deload: '#40c8e0' })
  })
  it('every result stands apart from the accent (or is the text colour) and reads on black', () => {
    const accents = [...HV_ACCENTS.map(a => a.hex), ...Object.values(ACCENTS), ...sweep]
    expect(accents.length).toBeGreaterThan(180)
    for (const acc of accents) {
      for (const [k, c] of Object.entries(meaningColours(acc))) {
        if (c === LABEL) continue
        expect(distance(c, acc), `${k} under ${acc}`).toBeGreaterThanOrEqual(MIN_APART)
        expect(contrast(c, '#000000'), `${k} under ${acc}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
  it('the six distinct meanings stand apart from each other too, under every accent', () => {
    const accents = [...HV_ACCENTS.map(a => a.hex), ...Object.values(ACCENTS), ...sweep]
    for (const acc of accents) {
      const c = meaningColours(acc)
      const used = DISTINCT.filter(k => c[k] !== LABEL)
      for (const k of used) {
        expect(distance(c[k], acc), `${k} under ${acc}`).toBeGreaterThanOrEqual(MIN_APART)
        expect(contrast(c[k], '#000000'), `${k} under ${acc}`).toBeGreaterThanOrEqual(4.5)
        for (const j of used) if (j !== k) expect(distance(c[k], c[j]), `${k} ${c[k]} and ${j} ${c[j]} under ${acc}`).toBeGreaterThanOrEqual(MIN_APART)
      }
      expect([c.record, c.note]).toEqual([c.warmup, c.warmup])
    }
  })
})
