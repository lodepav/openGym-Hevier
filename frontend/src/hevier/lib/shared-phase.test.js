import { describe, expect, it } from 'vitest'
import { phaseFromRow, phasedS, phasesIn, withPhase, workoutPhase } from './shared-phase.js'

const NOW = 1_800_000_000_000
const DAY = 24 * 3600 * 1000
const row = over => ({ phase: 'cutting', rate_kg_per_week: -0.4, target_kcal: 3098, updated_at: NOW - DAY, ...over })
const w = (id, p) => ({ id, ...(p ? { hvPhase: { p } } : {}) })

describe('phaseFromRow', () => {
  it('takes the phase, the pace and the target', () => {
    expect(phaseFromRow(row(), NOW)).toEqual({ p: 'cutting', r: -0.4, k: 3098 })
  })
  it('keeps the phase when the numbers are missing', () => {
    expect(phaseFromRow(row({ rate_kg_per_week: null, target_kcal: null }), NOW)).toEqual({ p: 'cutting' })
  })
  it('has no phase for no row or an unknown phase', () => {
    expect(phaseFromRow(null, NOW)).toBeNull()
    expect(phaseFromRow(row({ phase: 'recomp' }), NOW)).toBeNull()
  })
  it('has no phase once OpenBite has not been opened for 14 days', () => {
    expect(phaseFromRow(row({ updated_at: NOW - 14 * DAY }), NOW)).not.toBeNull()
    expect(phaseFromRow(row({ updated_at: NOW - 14 * DAY - 1 }), NOW)).toBeNull()
    expect(phaseFromRow(row({ updated_at: null }), NOW)).toBeNull()
  })
})

describe('a workout\'s phase', () => {
  it('is written only when there is one', () => {
    const plain = w('a')
    expect(withPhase(plain, null)).toBe(plain)
    expect(withPhase(plain, { p: 'bulking' })).toEqual({ id: 'a', hvPhase: { p: 'bulking' } })
    expect(plain.hvPhase).toBeUndefined()
  })
  it('reads as none when missing or not known', () => {
    expect(workoutPhase(w('a'))).toBeNull()
    expect(workoutPhase(w('a', 'recomp'))).toBeNull()
    expect(workoutPhase(w('a', 'cutting'))).toBe('cutting')
  })
  it('lists the phases in the log in a fixed order', () => {
    expect(phasesIn([w('a', 'bulking'), w('b'), w('c', 'cutting'), w('d', 'bulking')])).toEqual(['cutting', 'bulking'])
    expect(phasesIn(undefined)).toEqual([])
  })
})

describe('phasedS', () => {
  const S = { unit: 'kg', workouts: [w('a', 'cutting'), w('b'), w('c', 'bulking'), w('d', 'cutting')] }
  it('is S itself under All', () => {
    expect(phasedS(S, null)).toBe(S)
  })
  it('keeps only the phase\'s workouts, leaving out those with no phase', () => {
    expect(phasedS(S, 'cutting').workouts.map(x => x.id)).toEqual(['a', 'd'])
    expect(phasedS(S, 'cutting').unit).toBe('kg')
    expect(S.workouts).toHaveLength(4)
  })
  it('hands back the same object for the same S and phase', () => {
    expect(phasedS(S, 'bulking')).toBe(phasedS(S, 'bulking'))
  })
  it('reads as All when the log has no workout in the phase', () => {
    expect(phasedS(S, 'maintaining')).toBe(S)
  })
})
