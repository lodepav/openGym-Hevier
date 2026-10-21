import { describe, it, expect } from 'vitest'
import { maxHr, tanaka, zoneOf, zoneFloors, zoneTimes, summary } from './hr-zones.js'

const now = new Date(2026, 9, 21)

describe('maximum heart rate', () => {
  it('estimates from the birth year by Tanaka (208 − 0.7 × age)', () => {
    expect(tanaka(40)).toBe(180)
    expect(maxHr({ born: 1986 }, now)).toEqual({ bpm: 180, from: 'age' })
    // 220 − age would say 190 at 30; Tanaka 187
    expect(maxHr({ born: 1996 }, now).bpm).toBe(187)
  })
  it('takes a typed maximum over the estimate', () => {
    expect(maxHr({ max: 192, born: 1986 }, now)).toEqual({ bpm: 192, from: 'set' })
  })
  it('ignores what cannot be a maximum or a birth year', () => {
    expect(maxHr({ max: 40, born: 1800 }, now)).toBeNull()
    expect(maxHr({ born: 2024 }, now)).toBeNull()
    expect(maxHr(undefined, now)).toBeNull()
  })
})

describe('zones', () => {
  it('are 50, 60, 70, 80 and 90 % of the maximum', () => {
    expect(zoneFloors(180)).toEqual([90, 108, 126, 144, 162])
    expect(zoneOf(89, 180)).toBe(0)
    expect(zoneOf(90, 180)).toBe(1)
    expect(zoneOf(125, 180)).toBe(2)
    expect(zoneOf(126, 180)).toBe(3)
    expect(zoneOf(152, 180)).toBe(4)
    expect(zoneOf(200, 180)).toBe(5)
    expect(zoneOf(150, null)).toBe(0)
  })
  it('add up the time in each, leaving out a gap in the readings', () => {
    const s = [[0, 100], [1000, 100], [2000, 150], [3000, 150], [60000, 150], [61000, 80]]
    const t = zoneTimes(s, 180)
    expect(t).toEqual([0, 2000, 0, 0, 2000, 0])
  })
  it('summarise the readings', () => {
    expect(summary([[0, 100], [1, 150], [2, 110]])).toEqual({ avg: 120, max: 150 })
    expect(summary([])).toBeNull()
  })
})
