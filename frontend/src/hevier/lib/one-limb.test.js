import { describe, it, expect, afterEach } from 'vitest'
import { EXIDX } from '../../lib/exercises.js'
import { defaultConfig, isPerSide } from '../../lib/history.js'
import { hooks } from '../hooks.js'
import { isOneLimb, sideDefault, withSide, sideConfig, sideOff, sideRoutines } from './one-limb.js'
import { matchTitle, readKey } from './hevy-import.js'

const S0 = (workouts = []) => ({ unit: 'kg', workouts, routines: [] })
const side = (w, r) => ({ w, r, done: true, sides: { L: { w, r, done: true }, R: { w, r, done: true } } })

describe('hevier one-limb exercises start per side (D75)', () => {
  afterEach(() => { hooks.defaultSide = null })

  it('reads the catalogue name: single leg, one arm, unilateral; not stretches or a single-leg push-up', () => {
    expect(isOneLimb(EXIDX['1178'])).toBe(true)   // dumbbell standing single leg calf raise
    expect(isOneLimb(EXIDX['4838'])).toBe(true)   // cable unilateral curl
    expect(isOneLimb(EXIDX['0085'])).toBe(false)  // barbell romanian deadlift
    const named = re => Object.values(EXIDX).find(e => re.test(e.n))
    expect(isOneLimb(named(/^single leg calf stretch$/))).toBe(false)
    expect(isOneLimb(named(/^raise single leg push up$/))).toBe(false)
    expect(isOneLimb({ id: 'c1', n: 'Single leg thing', custom: true })).toBe(false)
  })

  it('a custom or other exercise last logged per side starts per side too', () => {
    expect(sideDefault(S0(), '0085')).toBe(false)
    const S = S0([{ d: '2026-10-01', entries: [{ id: '0085', sets: [side(60, 8)] }] }])
    expect(sideDefault(S, '0085')).toBe(true)
  })

  it('upstream’s defaultConfig takes it through the seam, and only then', () => {
    expect(defaultConfig('1178').side).toBeUndefined()
    hooks.defaultSide = id => sideConfig(S0(), id)
    expect(defaultConfig('1178')).toMatchObject({ mode: 'reps', side: true })
    expect(defaultConfig('0085').side).toBeUndefined()
  })

  it('per side switched off is saved as off, so the defaults spread under it keep it off', () => {
    expect(sideOff(S0(), '1178')).toEqual({ side: false })
    expect(sideOff(S0(), '0085')).toBeNull()
    hooks.defaultSide = id => sideConfig(S0(), id)
    // Save as routine and the mode switch spread defaultConfig under the saved target.
    const saved = { sets: 3, reps: 12, weight: 20, mode: 'reps', ...sideOff(S0(), '1178') }
    expect(isPerSide({ ...defaultConfig('1178'), ...saved })).toBe(false)
    hooks.defaultSide = null
    // Neither the one-time routine pass nor a replace turns it back on.
    const s = { routines: [{ id: 'r', ex: [{ id: '1178', ...saved }] }] }
    sideRoutines(s)
    expect(s.routines[0].ex[0]).toMatchObject({ side: false, reps: 12 })
    expect(withSide({ id: '1178', ...saved }, S0()).side).toBe(false)
  })

  it('a replaced routine slot gets per side back for a one-limb exercise', () => {
    expect(withSide({ id: '1178', sets: 2, reps: 10 }, S0())).toMatchObject({ side: true, reps: 20 })
    expect(withSide({ id: '0085', sets: 2 }, S0()).side).toBeUndefined()
  })

  it('a Hevy title matched to a one-limb free-weight exercise imports per side', () => {
    const k = readKey(matchTitle('Single Leg Standing Calf Raise (Dumbbell)', 'Hevy'))
    expect(k).toMatchObject({ side: true })
    expect(EXIDX[k.id].n).toMatch(/single leg calf raise/)
  })
})

describe('hevier routines made before D75', () => {
  it('turn their one-limb slots per side once, the reps read as one side’s', () => {
    const s = { routines: [{ id: 'r', ex: [
      { id: '1178', sets: 2, reps: 10, repsMin: 8, mode: 'reps' },
      { id: '0085', sets: 2, reps: 6 },
      { id: '4838', sets: 2, reps: 12, side: true },
    ] }] }
    expect(sideRoutines(s)).toBe(1)
    expect(s.routines[0].ex[0]).toMatchObject({ side: true, reps: 20, repsMin: 16 })
    expect(s.routines[0].ex[1].side).toBeUndefined()
    expect(s.routines[0].ex[2].reps).toBe(12)
    expect(sideRoutines(s)).toBe(0)
  })
  it('a fresh one-limb exercise is ten a side', () => {
    hooks.defaultSide = id => sideConfig(S0(), id)
    expect(defaultConfig('1178')).toMatchObject({ side: true, reps: 20 })
    expect(defaultConfig('1178', 'time')).toMatchObject({ side: true, sec: 45 })
    hooks.defaultSide = null
  })
})
