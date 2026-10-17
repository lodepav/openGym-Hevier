import { describe, expect, it } from 'vitest'
import { cleanBackups, withBackups, MAX_BACKUPS, keepBackups, swapBackups } from './routine-backups.js'
import { replaceSlotExercise } from '../../lib/routines.js'

/* Upstream 1.4.2's tests (lib/routine-backups.test.js), word for word where the code is its. */
describe('cleanBackups', () => {
  it('unique string ids, never the exercise itself, only known ones, at most five', () => {
    expect(cleanBackups(['a', 'b', 'a', 'self', 3, '', null, 'c'], 'self')).toEqual(['a', 'b', 'c'])
    expect(cleanBackups(['a', 'gone'], 'x', id => id !== 'gone')).toEqual(['a'])
    expect(cleanBackups(['1', '2', '3', '4', '5', '6', '7'], 'x')).toHaveLength(MAX_BACKUPS)
    expect(cleanBackups('a', 'x')).toEqual([])
  })
  it('no list, no field', () => {
    expect(withBackups([], 'x')).toEqual({})
    expect(withBackups(undefined, 'x')).toEqual({})
    expect(withBackups(['a'], 'x')).toEqual({ subs: ['a'] })
  })
})

describe('a replaced exercise (D45, upstream 1.4.2\'s rule through keepBackups)', () => {
  it('keeps the slot\'s backups, less the one now in the slot', () => {
    const slot = { id: '0025', sets: 3, reps: 8, weight: 60, subs: ['0047', '0289'] }
    expect(keepBackups(slot, replaceSlotExercise(slot, '0047', { workouts: [] }, 'r')).subs).toEqual(['0289'])
    expect('subs' in keepBackups({ ...slot, subs: ['0047'] }, replaceSlotExercise({ ...slot, subs: ['0047'] }, '0047', { workouts: [] }, 'r'))).toBe(false)
  })
  it('a sheet save keeps them; a slot without any gets none', () => {
    expect(keepBackups({ id: 'a', subs: ['b'] }, { id: 'a', sets: 4 })).toEqual({ id: 'a', sets: 4, subs: ['b'] })
    expect(keepBackups({ id: 'a' }, { id: 'a', sets: 4 })).toEqual({ id: 'a', sets: 4 })
  })
})

describe('a swap in the running workout', () => {
  it('offers the slot\'s backups of that exercise', () => {
    const S = { active: { entries: [{ id: 'x', target: {} }, { id: 'a', target: { subs: ['b', 'a', 'c'] } }] } }
    expect(swapBackups(S, 'a')).toEqual(['b', 'c'])
    expect(swapBackups(S, 'x')).toEqual([])
    expect(swapBackups({}, 'a')).toEqual([])
  })
})
