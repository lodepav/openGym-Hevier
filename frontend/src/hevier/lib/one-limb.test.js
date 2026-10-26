import { describe, it, expect, afterEach } from 'vitest'
import { EXIDX } from '../../lib/exercises.js'
import { defaultConfig, pickedExerciseConfig, isPerSide } from '../../lib/history.js'
import { hooks } from '../hooks.js'
import { sideDefault, withSide, sideRoutines } from './one-limb.js'
import { matchTitle, readKey } from './hevy-import.js'

const S0 = (workouts = []) => ({ unit: 'kg', workouts, routines: [] })
const side = (w, r) => ({ w, r, done: true, sides: { L: { w, r, done: true }, R: { w, r, done: true } } })

describe('hevier one-limb exercises start per side (D75)', () => {
  afterEach(() => { hooks.defaultSide = null })

  it('a custom or other exercise last logged per side starts per side too', () => {
    expect(sideDefault(S0(), '0085')).toBe(false)
    const S = S0([{ d: '2026-10-01', entries: [{ id: '0085', sets: [side(60, 8)] }] }])
    expect(sideDefault(S, '0085')).toBe(true)
  })

  it('upstream’s pickedExerciseConfig takes it through the seam, and only then', () => {
    const S = S0([{ d: '2026-10-01', entries: [{ id: '0085', sets: [side(60, 8)] }] }])
    expect(pickedExerciseConfig('0085').side).toBeUndefined()
    hooks.defaultSide = id => sideDefault(S, id)
    expect(pickedExerciseConfig('0085')).toMatchObject({ mode: 'reps', side: true, reps: 20 })
    expect(pickedExerciseConfig('0085', 'time')).toMatchObject({ mode: 'time', side: true, sec: 45 })
    expect(pickedExerciseConfig('0025').side).toBeUndefined()
    // defaultConfig, spread under saved targets, never adds it: per side switched off stays off.
    expect(isPerSide({ ...defaultConfig('0085'), sets: 3, reps: 12, mode: 'reps' })).toBe(false)
  })

  it('a slot switched off per side before 1.4.3 (`side: false`) stays off', () => {
    const saved = { sets: 3, reps: 12, weight: 20, mode: 'reps', side: false }
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
})
