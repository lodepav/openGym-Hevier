import { describe, expect, it } from 'vitest'
import { usualLength } from './routine-length.js'

const MIN = 60000
const w = (min, extra = {}) => ({ d: '2026-11-01', start: 1000, end: 1000 + min * MIN, ...extra })

describe('hevier: a routine’s usual length', () => {
  it('has none without two timed workouts of it', () => {
    expect(usualLength({ workouts: [] }, { id: 'r1', name: 'Legs' })).toBeNull()
    expect(usualLength({ workouts: [w(50, { routineIds: ['r1'] })] }, { id: 'r1' })).toBeNull()
    // no clock: an import without times
    expect(usualLength({ workouts: [w(0, { routineId: 'r1' }), w(0, { routineId: 'r1' })] }, { id: 'r1' })).toBeNull()
  })

  it('takes the median of the last five by the routine id, by hand', () => {
    const S = { workouts: [
      w(90, { routineIds: ['r1'] }),           // sixth from the end: left out
      w(40, { routineIds: ['r1'] }), w(70, { routineIds: ['r1'] }),
      w(30, { routineIds: ['r2'] }),           // another routine
      w(120, { routineIds: ['r1', 'r2'] }),    // both at once
      w(50, { routineIds: ['r1'], name: 'Legs' }), w(45, { routineId: 'r1' }), w(60, { routineIds: ['r1'] }),
      w(10, { name: 'Legs' }),                 // an import of the same name: the ids are enough
    ] }
    // 40, 70, 50, 45, 60 → 40 45 50 60 70
    expect(usualLength(S, { id: 'r1', name: 'Legs' })).toBe(50 * MIN)
  })

  it('reads imports by the routine’s name, an even count by the middle two', () => {
    const S = { workouts: [w(40, { name: 'Legs', routineId: null }), w(55, { name: 'Legs', routineId: null }), w(20, { name: 'Arms' })] }
    expect(usualLength(S, { id: 'new', name: 'Legs' })).toBe(47.5 * MIN)
  })
})
