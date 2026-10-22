import { describe, it, expect } from 'vitest'
import { labelChanges, applyRefills } from './label-refill-run.js'

const W = (w, r) => ({ w, r, done: true })
const press = { id: 'press', sets: 1, reps: 10, weight: 100, mode: 'reps', warmupSets: 0 }
const legs = { id: 'r-legs', name: 'Legs', ex: [press] }
const S0 = (gym, sets) => ({
  unit: 'kg', exWeights: {}, routines: [legs],
  workouts: [
    { d: '2026-10-01', routineId: legs.id, entries: [{ id: 'press', hvBrand: 'Life Fitness', sets: [W(140, 10)] }] },
    { d: '2026-10-08', routineId: legs.id, entries: [{ id: 'press', hvBrand: 'Technogym', sets: [W(180, 8)] }] },
  ],
  equipProfiles: [{ id: 'city' }, { id: 'home' }], activeEquipId: gym,
  hvMachines: { press: { city: 'Life Fitness', home: 'Technogym' } },
  active: { start: 1, entries: [{ id: 'press', rid: legs.id, target: press, sets }] },
})

describe('hevier label refill (D82)', () => {
  it('finds an exercise whose brand changed with the gym, and refills its untouched set', () => {
    const before = S0('city', [{ w: 140, r: 10, done: false, weightOrigin: 'manual', hvLast: 1 }])
    const after = { ...before, activeEquipId: 'home', active: { ...before.active, hvGym: 'home' } }
    const changes = labelChanges(after, before)
    expect(changes).toEqual([{ idx: 0, id: 'press', was: 'Life Fitness', label: 'Technogym' }])
    applyRefills(after, changes)
    expect(after.active.entries[0].sets[0]).toMatchObject({ w: 180, r: 8, done: false })
  })

  it('sees nothing for a typed set, a session just started, or an edited workout', () => {
    const before = S0('city', [{ w: 140, r: 10 }])
    expect(labelChanges({ ...before, active: { ...before.active, entries: [{ ...before.active.entries[0], sets: [{ w: 150, r: 10 }] }] } }, before)).toEqual([])
    expect(labelChanges(before, { ...before, active: null })).toEqual([])
    const editing = { ...before, active: { ...before.active, editingWorkoutId: 'w1' } }
    expect(labelChanges({ ...editing, active: { ...editing.active, hvGym: 'home' } }, editing)).toEqual([])
  })
})
