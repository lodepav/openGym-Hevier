// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { DEF } from '../../store/useStore.js'
import { EXDB } from '../../lib/exercises.js'
import { learnSwap, learnedBackup, plannedSwaps, applyGymSwaps, undoGymSwaps, missingAt, setMissing, gymPick } from './gym-backups.js'

const clone = v => JSON.parse(JSON.stringify(v))
const PRESS = EXDB.find(e => /^lever seated leg press$/i.test(e.n) || /leg press/i.test(e.n)).id
const HACK = EXDB.find(e => e.id !== PRESS && /hack squat/i.test(e.n)).id
const SQUAT = EXDB.find(e => /^barbell (full )?squat$/i.test(e.n)).id

function state({ swaps = {}, sets = [{ w: 100, r: 10 }], gym = 'g1' } = {}) {
  const S = clone(DEF)
  S.equipProfiles = [{ id: 'g1', name: 'City Gym' }, { id: 'g2', name: 'Home' }]
  S.activeEquipId = gym
  S.routines = [{ id: 'r', name: 'Legs', ex: [{ id: PRESS, mode: 'reps', sets: 3, reps: 10, weight: 100, subs: [HACK, SQUAT] }] }]
  S.hvGymSwaps = swaps
  S.active = { start: 1, routineIds: ['r'], entries: [{ id: PRESS, rid: 'r', target: { id: PRESS }, sets }] }
  return S
}

describe('a gym’s backups (D46)', () => {
  it('a swap to one of the slot’s backups is learned for the gym; another backup replaces it; back forgets it', () => {
    const S = state()
    expect(learnSwap(S, { rid: 'r', from: PRESS, to: HACK, gymId: 'g1' })).toBe(true)
    expect(learnedBackup(S, PRESS, 'g1')).toBe(HACK)
    expect(learnedBackup(S, PRESS, 'g2')).toBe(null)
    expect(learnSwap(S, { rid: 'r', from: HACK, to: SQUAT, gymId: 'g1' })).toBe(true)
    expect(learnedBackup(S, PRESS, 'g1')).toBe(SQUAT)
    expect(learnSwap(S, { rid: 'r', from: SQUAT, to: PRESS, gymId: 'g1' })).toBe(true)
    expect(S.hvGymSwaps).toEqual({})
  })

  it('nothing is learned without a gym, or for an exercise that is not a backup', () => {
    const S = state()
    expect(learnSwap(S, { rid: 'r', from: PRESS, to: HACK, gymId: null })).toBe(false)
    expect(learnSwap(S, { rid: 'r', from: PRESS, to: 'nope', gymId: 'g1' })).toBe(false)
    expect(S.hvGymSwaps).toEqual({})
  })

  it('a routine started at the gym swaps the backup in, built as the routine builds it; Undo puts it back and forgets', () => {
    const S = state({ swaps: { [PRESS]: { g1: HACK } } })
    Object.assign(S.routines[0].ex[0], { sets: 5, reps: 6, weight: 140, restSec: 180 })
    expect(plannedSwaps(S)).toEqual([{ index: 0, from: PRESS, to: HACK }])
    const done = applyGymSwaps(S)
    expect(done).toHaveLength(1)
    expect(S.active.entries[0].id).toBe(HACK)
    expect(S.active.entries[0].rid).toBe('r')
    expect(S.active.entries[0].sets.length).toBeGreaterThan(0)
    undoGymSwaps(S, done)
    expect(S.active.entries[0].id).toBe(PRESS)
    expect(S.active.entries[0].target).toMatchObject({ sets: 5, reps: 6, weight: 140, restSec: 180, subs: [HACK, SQUAT] })
    expect(S.active.entries[0].sets).toHaveLength(5)
    expect(learnedBackup(S, PRESS, 'g1')).toBe(null)
  })

  it('not at another gym, not once a set is ticked, not for a backup the slot no longer has', () => {
    expect(plannedSwaps(state({ swaps: { [PRESS]: { g1: HACK } }, gym: 'g2' }))).toEqual([])
    expect(plannedSwaps(state({ swaps: { [PRESS]: { g1: HACK } }, sets: [{ w: 100, r: 10, done: true }] }))).toEqual([])
    const S = state({ swaps: { [PRESS]: { g1: HACK } } })
    S.routines[0].ex[0].subs = [SQUAT]
    expect(plannedSwaps(S)).toEqual([])
  })

  it('not in a workout logged into the past or an edited one', () => {
    const S = state({ swaps: { [PRESS]: { g1: HACK } } })
    S.active.backfill = { d: '2026-09-01' }
    expect(plannedSwaps(S)).toEqual([])
    S.active.backfill = null
    S.active.editingWorkoutId = 'w1'
    expect(plannedSwaps(S)).toEqual([])
  })
})

describe('missing at a gym (D86)', () => {
  const missing = map => { const S = state(); S.hvGymMissing = map; return S }

  it('marks and unmarks, one list of gyms per exercise, removed when empty', () => {
    const S = state()
    expect(setMissing(S, PRESS, 'g1', true)).toBe(true)
    expect(setMissing(S, PRESS, 'g1', true)).toBe(false)
    expect(setMissing(S, PRESS, 'g2', true)).toBe(true)
    expect(S.hvGymMissing).toEqual({ [PRESS]: ['g1', 'g2'] })
    expect(missingAt(S, PRESS, 'g1')).toBe(true)
    expect(missingAt(S, PRESS, null)).toBe(false)
    setMissing(S, PRESS, 'g1', false); setMissing(S, PRESS, 'g2', false)
    expect(S.hvGymMissing).toEqual({})
  })

  it('a routine started where its exercise is missing swaps in the first backup the gym has, in the slot’s order', () => {
    expect(plannedSwaps(missing({ [PRESS]: ['g1'] }))).toEqual([{ index: 0, from: PRESS, to: HACK }])
    expect(plannedSwaps(missing({ [PRESS]: ['g1'], [HACK]: ['g1'] }))).toEqual([{ index: 0, from: PRESS, to: SQUAT }])
    expect(plannedSwaps(missing({ [PRESS]: ['g1'], [HACK]: ['g1'], [SQUAT]: ['g1'] }))).toEqual([])
    expect(plannedSwaps(missing({ [PRESS]: ['g2'] }))).toEqual([])
    expect(plannedSwaps(missing({ [HACK]: ['g1'] }))).toEqual([])
  })

  it('a backup learned at the gym comes first, unless the gym lacks it', () => {
    const S = missing({ [PRESS]: ['g1'] })
    S.hvGymSwaps = { [PRESS]: { g1: SQUAT } }
    expect(gymPick(S, S.routines[0].ex[0], 'g1')).toBe(SQUAT)
    S.hvGymMissing[SQUAT] = ['g1']
    expect(gymPick(S, S.routines[0].ex[0], 'g1')).toBe(HACK)
  })

  it('swapping back to the routine’s exercise at the gym unmarks it there', () => {
    const S = missing({ [PRESS]: ['g1', 'g2'] })
    expect(learnSwap(S, { rid: 'r', from: HACK, to: PRESS, gymId: 'g1' })).toBe(true)
    expect(S.hvGymMissing).toEqual({ [PRESS]: ['g2'] })
  })
})
