import { describe, expect, it } from 'vitest'
import { unitMoveSteps } from './reorder-units.js'
import { moveActiveWorkoutEntry } from '../../lib/active-workout-order.js'

// a, then the superset b+c, then d, then the superset e+f+g
const session = () => ({ cur: 0, entries: [
  { id: 'a' }, { id: 'b', sg: 's1' }, { id: 'c', sg: 's1' }, { id: 'd' }, { id: 'e', sg: 's2' }, { id: 'f', sg: 's2' }, { id: 'g', sg: 's2' },
] })
// Plays the steps through upstream's own move, as the workout screen does.
const play = (from, to) => {
  const A = session()
  for (const { at, dir } of unitMoveSteps(A.entries, from, to)) expect(moveActiveWorkoutEntry(A, at, dir)).toBeTruthy()
  return A.entries.map(e => e.id).join('')
}

describe('hevier: unitMoveSteps (Reorder exercises)', () => {
  it('moves a lone exercise past whole supersets, down and up', () => {
    expect(play(0, 3)).toBe('bcdefga')
    expect(play(2, 0)).toBe('dabcefg')
  })

  it('moves a superset as one block, members in their order', () => {
    expect(play(1, 3)).toBe('adefgbc')
    expect(play(3, 0)).toBe('efgabcd')
    expect(play(1, 2)).toBe('adbcefg')
  })

  it('steps take the edge member, so upstream never swaps inside a superset', () => {
    expect(unitMoveSteps(session().entries, 1, 2)).toEqual([{ at: 2, dir: 1 }])
    expect(unitMoveSteps(session().entries, 3, 1)).toEqual([{ at: 4, dir: -1 }, { at: 3, dir: -1 }])
  })

  it('no move, or a place out of range, is no steps', () => {
    expect(unitMoveSteps(session().entries, 2, 2)).toEqual([])
    expect(unitMoveSteps(session().entries, 0, 4)).toEqual([])
    expect(unitMoveSteps([], 0, 1)).toEqual([])
  })
})
