import { describe, expect, it } from 'vitest'
import { nextAfterRest } from './next-after-rest.js'

const ex = (done, extra = {}) => ({ id: 'x', ...extra, sets: done.map(d => ({ w: 60, r: 8, done: d })) })

describe('nextAfterRest (D107)', () => {
  it('after a middle set stays put', () => {
    expect(nextAfterRest([ex([true, false]), ex([false])], 0, true)).toBe(null)
  })
  it('after the last set goes to the next exercise with a set left', () => {
    expect(nextAfterRest([ex([true, true]), ex([true]), ex([false])], 0, true)).toBe(2)
  })
  it('after the last exercise, everything done, goes nowhere', () => {
    expect(nextAfterRest([ex([true]), ex([true, true])], 1, true)).toBe(null)
  })
  it('goes round to an exercise skipped earlier, as upstream does', () => {
    expect(nextAfterRest([ex([false]), ex([true]), ex([true])], 2, true)).toBe(0)
  })
  it('a superset moves on only after its last round, to the next unit’s first exercise', () => {
    const E = [ex([true, true], { sg: 'a' }), ex([true, false], { sg: 'a' }), ex([false], { sg: 'b' }), ex([false], { sg: 'b' })]
    expect(nextAfterRest(E, 0, true)).toBe(null)
    E[1].sets[1].done = true
    expect(nextAfterRest(E, 1, true)).toBe(2)
  })
  it('does nothing with the setting off or no exercise to go from', () => {
    expect(nextAfterRest([ex([true]), ex([false])], 0, false)).toBe(null)
    expect(nextAfterRest([ex([true]), ex([false])], undefined, true)).toBe(null)
  })
})
