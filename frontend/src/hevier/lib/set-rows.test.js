import { describe, expect, it } from 'vitest'
import { dropsOf, clustersOf, isFailureSet, makeSideSet, WEIGHT_ORIGIN_MANUAL } from '../../lib/workout-model.js'
import { withDrop, withoutDrop, withDropField, withBurst, withoutBurst, withBurstReps, withFailure, withSideField } from './set-rows.js'

describe('hevier: the Hevy block’s row edits', () => {
  it('adds a drop lighter than the set, then lighter than the last drop, and edits and removes it', () => {
    const one = withDrop({ w: 100, r: 8 }, { pct: 20 })
    expect(dropsOf(one)).toHaveLength(1)
    expect(dropsOf(one)[0].w).toBeLessThan(100)
    expect(dropsOf(one)[0].r).toBe(8)
    const two = withDrop(one, { pct: 20 })
    expect(dropsOf(two)[1].w).toBeLessThan(dropsOf(two)[0].w)
    expect(dropsOf(withDropField(two, 1, 'r', 5))[1].r).toBe(5)
    expect(dropsOf(withoutDrop(two, 0))).toEqual([dropsOf(two)[1]])
  })

  it('keeps a rest-pause row’s reps the total of its bursts', () => {
    const one = withBurst({ w: 60, r: 10 }, 15)
    const added = clustersOf(one)[0].r
    expect(clustersOf(one)[0].restSec).toBe(15)
    expect(one.r).toBe(10 + added)
    expect(withBurstReps(one, 0, added + 2).r).toBe(10 + added + 2)
    expect(withoutBurst(one, 0)).toMatchObject({ r: 10 })
    expect(clustersOf(withoutBurst(one, 0))).toEqual([])
  })

  it('gives a per-side row its drops and bursts on both sides', () => {
    const row = makeSideSet({ w: 20, r: 10 })
    expect(dropsOf(withDrop(row).sides.L)).toHaveLength(1)
    expect(dropsOf(withDrop(row).sides.R)).toHaveLength(1)
    expect(clustersOf(withBurst(row, 15).sides.R)).toHaveLength(1)
    expect(dropsOf(withDropField(withDrop(row), 0, 'r', 3, 'L').sides.L)[0].r).toBe(3)
  })

  it('marks failure on the set, and leaves the input as it was', () => {
    const sets = [{ w: 50, r: 5 }, { w: 50, r: 5 }]
    const out = withFailure(sets, 1, true)
    expect(out.map(isFailureSet)).toEqual([false, true])
    expect(isFailureSet(sets[1])).toBe(false)
    expect(withFailure(out, 1, false).map(isFailureSet)).toEqual([false, false])
  })

  it('a side’s weight is marked as typed and carried down; its reps change that side only', () => {
    const sets = [makeSideSet({ w: 20, r: 10 }), makeSideSet({ w: 20, r: 10 })]
    const out = withSideField(sets, 0, 'L', 'w', 25)
    expect(out[0].sides.L).toMatchObject({ w: 25, weightOrigin: WEIGHT_ORIGIN_MANUAL })
    expect(out[1].sides.L.w).toBe(25)
    expect(out[0].sides.R.w).toBe(20)
    expect(sets[0].sides.L.w).toBe(20)
    const reps = withSideField(sets, 0, 'R', 'r', 7)
    expect(reps[0].sides.R.r).toBe(7)
    expect(reps[1]).toBe(sets[1])
  })
})
