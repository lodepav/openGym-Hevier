import { describe, expect, it } from 'vitest'
import { EXDB } from '../../lib/exercises.js'
import { volumeMode, muscleMode, workSets, muscleSets } from './volume.js'
import { loadOf, MUSCLE_NAME } from '../../lib/muscles.js'
import { muscleOf } from './exercise-picker.js'

const byMuscle = m => EXDB.filter(e => muscleOf(e) === m)
const [BENCH, FLY] = byMuscle('Chest')
const [PUSHDOWN] = byMuscle('Triceps')
const done = (extra = {}) => ({ w: 50, r: 8, done: true, ...extra })

describe('hevier: volume as sets per muscle (D18)', () => {
  it('defaults to sets; weight only when chosen', () => {
    expect(volumeMode({})).toBe('sets')
    expect(volumeMode(undefined)).toBe('sets')
    expect(volumeMode({ hvVolume: 'weight' })).toBe('weight')
    expect(volumeMode({ hvVolume: 'sets' })).toBe('sets')
  })

  it('counts each ticked work set once, for the main muscle, most first', () => {
    const entries = [
      { id: BENCH.id, sets: [done({ phase: 'warmup' }), done(), done(), { w: 50, r: 8, done: false }] },
      { id: PUSHDOWN.id, sets: [done(), done(), done()] },
      { id: FLY.id, sets: [done({ drops: [{ w: 30, r: 8 }] })] },
    ]
    expect(muscleSets(entries)).toEqual([{ muscle: 'Chest', sets: 3 }, { muscle: 'Triceps', sets: 3 }])
    expect(workSets(entries)).toBe(6)
  })

  it('a per-side set is one set, done when either side is', () => {
    const side = { sides: { L: { w: 10, r: 8, done: true }, R: { w: 10, r: 8, done: false } } }
    expect(muscleSets([{ id: BENCH.id, sets: [side] }])).toEqual([{ muscle: 'Chest', sets: 1 }])
  })

  it('leaves out exercises it cannot place and empty sessions', () => {
    expect(muscleSets([{ id: 'nope', sets: [done()] }])).toEqual([])
    expect(muscleSets(undefined)).toEqual([])
    expect(muscleSets([{ id: '10729', sets: [done()] }])).toEqual([]) // cardio is no muscle (review T4)
    expect(workSets([])).toBe(0)
  })
})

describe('hevier: secondary muscles in part (D42)', () => {
  it('defaults to the main muscle only', () => {
    expect(muscleMode({})).toBe('main')
    expect(muscleMode({ hvMuscleSets: 'share' })).toBe('share')
  })

  it('share mode counts upstream’s load, a secondary muscle in part, by upstream’s names', () => {
    const entries = [{ id: BENCH.id, sets: [done(), done(), done({ phase: 'warmup' })] }]
    const load = loadOf([{ id: BENCH.id, sets: 2 }])
    const list = muscleSets(entries, 'share')
    expect(list[0]).toEqual({ muscle: MUSCLE_NAME.chest, sets: Math.round(load.chest * 10) / 10 })
    expect(list.length).toBe(Object.values(load).filter(v => v > 0).length)
    expect(list.slice(1).every(r => r.sets < 2)).toBe(true)
  })
})
