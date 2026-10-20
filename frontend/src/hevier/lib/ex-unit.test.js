import { describe, expect, it } from 'vitest'
import { exUnitOf, exUnitChoice, convert, shown, setExUnit, defaultStep } from './ex-unit.js'
import { snapWeight } from '../../lib/progression.js'
import { convertStateUnit } from '../../lib/units.js'
import { EXDB } from '../../lib/exercises.js'

const EX = EXDB.find(e => /barbell/i.test(e.eq || '')).id
const state = () => ({
  unit: 'kg',
  active: { entries: [{ id: EX, target: { sets: 3, reps: 8 } }, { id: 'other', target: {} }] },
  routines: [{ id: 'r1', ex: [{ id: EX, sets: 3, reps: 8, weight: 20 }, { id: EX, inc: 1, sets: 1 }] }],
})

describe('hevier weight unit per exercise (D41)', () => {
  it('converts unrounded and shows to the hundredth, on a half when that close', () => {
    const kg = convert(45, 'lb', 'kg')
    expect(kg).toBeCloseTo(20.41165665, 8)
    expect(shown(kg, 'kg', 'lb')).toBe(45)
    expect(shown(20.4, 'kg', 'lb')).toBe(45)          // a progression's tenth
    expect(shown(20, 'kg', 'lb')).toBe(44.09)
    expect(shown(20, 'kg', 'kg')).toBe(20)
    expect(shown(null, 'kg', 'lb')).toBe(null)
  })

  it('switches an exercise to lb with its step in upstream\'s inc, and back', () => {
    const s = state()
    setExUnit(s, EX, 'lb', 5)
    expect(exUnitOf(s, EX)).toBe('lb')
    expect(exUnitOf(s, 'other')).toBe('kg')
    const inc = convert(5, 'lb', 'kg')
    expect(s.active.entries[0].target.inc).toBeCloseTo(inc, 9)
    expect(s.active.entries[1].target.inc).toBeUndefined()
    expect(s.routines[0].ex[0].inc).toBeCloseTo(inc, 9)
    expect(s.routines[0].ex[1].inc).toBe(1)             // the user's own step is kept
    setExUnit(s, EX, 'lb', 10)
    expect(s.routines[0].ex[0].inc).toBeCloseTo(convert(10, 'lb', 'kg'), 9)
    setExUnit(s, EX, 'kg')
    expect(exUnitChoice(s, EX)).toBe(null)
    expect(s.routines[0].ex[0].inc).toBeUndefined()
    expect(s.routines[0].ex[1].inc).toBe(1)
  })

  it('still knows its own step after the profile changes unit', () => {
    const s0 = state()
    setExUnit(s0, EX, 'lb', 5)
    const s = convertStateUnit(s0, 'lb')
    expect(exUnitChoice(s, EX)).toBe(null)              // lb is the profile's now
    const own = s.routines[0].ex[1].inc
    setExUnit(s, EX, 'kg', 2.5)
    expect(s.routines[0].ex[0].inc).toBeCloseTo(convert(2.5, 'kg', 'lb'), 9)
    expect(s.routines[0].ex[1].inc).toBe(own)
    setExUnit(s, EX, 'lb')
    expect(s.routines[0].ex[0].inc).toBeUndefined()
    expect(s.routines[0].ex[1].inc).toBe(own)
  })

  it('steps a lb exercise 45 → 50 → 55 lb through upstream\'s snapping', () => {
    const inc = convert(5, 'lb', 'kg')
    let w = convert(45, 'lb', 'kg')
    const seen = []
    for (let i = 0; i < 3; i++) { w = snapWeight(w + inc, inc); seen.push(shown(w, 'kg', 'lb')) }
    expect(seen).toEqual([50, 55, 60])
  })

  it('offers 5 lb for a big lift, 2.5 lb for a small one', () => {
    expect([2.5, 5]).toContain(defaultStep(EX, 'lb'))
    expect([1.25, 2.5]).toContain(defaultStep(EX, 'kg'))
  })
})
