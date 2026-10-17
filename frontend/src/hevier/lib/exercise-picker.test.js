import { describe, expect, it } from 'vitest'
import { EXDB } from '../../lib/exercises.js'
import { EXDB as DB, searchExercises } from '../../lib/exercises.js'
import { muscleOf, muscleOptions, recentIds, filterPicker, addedRun, brandsByExercise, brandMatches } from './exercise-picker.js'

describe('hevier: exercise picker list', () => {
  it('files the catalogue’s and a custom exercise’s spellings under one muscle', () => {
    expect(muscleOf({ tg: 'pectorals' })).toBe('Chest')
    expect(muscleOf({ tg: 'chest' })).toBe('Chest')
    expect(muscleOf({ tg: 'spine' })).toBe('Lower Back')
    expect(muscleOf({ tg: 'something new' })).toBe('something new')
    expect(muscleOf({})).toBe('')
  })

  it('names every catalogue target', () => {
    const opts = muscleOptions(EXDB)
    expect(opts).toContain('Chest')
    expect(opts).toContain('Lats')
    expect(opts.every(m => /^[A-Z]/.test(m))).toBe(true)
    expect(opts).toEqual([...opts].sort())
  })

  it('lists recent exercises newest first, each once', () => {
    const S = { workouts: [
      { entries: [{ id: 'a' }, { id: 'b' }] },
      { entries: [{ id: 'c' }, { id: 'a' }] },
    ] }
    expect(recentIds(S)).toEqual(['c', 'a', 'b'])
    expect(recentIds(S, 2)).toEqual(['c', 'a'])
    expect(recentIds({})).toEqual([])
  })

  it('filters by muscle, equipment and what the profile has', () => {
    const list = [
      { id: 1, tg: 'pectorals', eq: 'barbell' },
      { id: 2, tg: 'chest', eq: 'dumbbell' },
      { id: 3, tg: 'lats', eq: 'barbell' },
    ]
    expect(filterPicker(list, { muscle: 'Chest' }).map(e => e.id)).toEqual([1, 2])
    expect(filterPicker(list, { eq: 'barbell' }).map(e => e.id)).toEqual([1, 3])
    expect(filterPicker(list, { muscle: 'Chest', avail: e => e.eq === 'dumbbell' }).map(e => e.id)).toEqual([2])
    expect(filterPicker(list)).toEqual(list)
  })
})

describe('hevier: Add superset finds what was just added', () => {
  const items = ['a', 'b', 'c', 'd'].map(id => ({ id }))
  it('the run ending at `end`, when it holds the picks in order', () => {
    expect(addedRun(items, 3, ['c', 'd'])).toBe(2)
    expect(addedRun(items, 2, ['a', 'b', 'c'])).toBe(0)
  })
  it('nothing to link when they sit elsewhere, or for one exercise', () => {
    expect(addedRun(items, 3, ['d', 'c'])).toBe(-1)
    expect(addedRun(items, 1, ['a', 'b', 'c'])).toBe(-1)
    expect(addedRun(items, 4, ['d', 'x'])).toBe(-1)
    expect(addedRun(items, 3, ['d'])).toBe(-1)
    expect(addedRun([], -1, ['a', 'b'])).toBe(-1)
  })
})

describe('hevier: search by machine brand (D36)', () => {
  const ex = re => DB.find(e => re.test(e.n))
  const PRESS = ex(/^sled 45° leg press$/i)
  const CURL = ex(/^lever lying leg curl$/i)
  const EXT = ex(/^lever leg extension$/i)
  const S = {
    hvMachines: { [PRESS.id]: { '': 'Life Fitness' }, [EXT.id]: { g1: 'Technogym' } },
    workouts: [{ d: '2026-10-01', entries: [{ id: CURL.id, hvBrand: 'LifeFitness', sets: [] }, { id: EXT.id, sets: [] }] }],
  }
  const list = [PRESS, CURL, EXT]
  const hits = q => brandMatches(list, brandsByExercise(S), q, searchExercises).map(m => [m.ex.n, m.brand])

  it('collects the brands of the defaults and of logged sets', () => {
    expect(brandsByExercise(S)).toEqual({ [PRESS.id]: ['Life Fitness'], [EXT.id]: ['Technogym'], [CURL.id]: ['LifeFitness'] })
  })
  it('matches whatever the spacing and case', () => {
    for (const q of ['Life Fitness', 'lifefitness', 'LIFE fit', 'fitness']) {
      expect(hits(q).map(h => h[0])).toEqual([PRESS.n, CURL.n])
    }
    expect(hits('techno')).toEqual([[EXT.n, 'Technogym']])
  })
  it('narrows by the exercise name with the other words', () => {
    expect(hits('life fitness press').map(h => h[0])).toEqual([PRESS.n])
    expect(hits('technogym squat')).toEqual([])
  })
  it('nothing for a query too short or naming no brand', () => {
    expect(hits('l')).toEqual([])
    expect(hits('leg press')).toEqual([])
  })
})
