import { describe, expect, it } from 'vitest'
import {
  isMachine, hasLabel, gymName, workoutGym, entryBrand, setWorkoutGym, setEntryBrand, knownBrands,
  labelsAtFinish, withLabels, labelsFor, labelText, labelKey, withLabelFilter, isCable, entryCable, setEntryCable,
} from './gym-labels.js'
import { buildCompletedWorkout } from '../../lib/finish-workout.js'
import { workoutVolume } from '../../lib/history.js'
import { saveWorkoutEdit, editCompletedSession, editChangesNothing } from '../../lib/session-edit.js'
import { exerciseSummary } from './exercise-summary.js'
import { mergeStates, stampChange } from '../../lib/sync-merge.js'

const CABLE = '8878'      // cable 45 degrees reverse fly
const MACHINE = '1027'    // assisted single leg press (leverage machine)
const DB = '4067'         // dumbbell alternate arnold press

const set = (w, r, done = true) => ({ w, r, done })
const gyms = [{ id: 'g1', name: 'City Gym', equipment: [] }, { id: 'g2', name: 'Home', equipment: [] }]
const live = (entries, extra = {}) => ({ id: 'a1', d: '2026-10-17', start: 1, entries, ...extra })
const state = (extra = {}) => ({ equipProfiles: gyms, activeEquipId: 'g1', workouts: [], ...extra })

describe('hevier gyms and machine labels (D28)', () => {
  it('gives machines and cables a brand line, not free weights', () => {
    expect(isMachine(CABLE)).toBe(true)
    expect(isMachine(MACHINE)).toBe(true)
    expect(isMachine(DB)).toBe(false)
    expect(isMachine('nope')).toBe(false)
  })

  it('tags a live session with the active profile until the gym is changed', () => {
    const S = state()
    S.active = live([{ id: CABLE, sets: [] }])
    expect(workoutGym(S, S.active)).toBe('g1')
    setWorkoutGym(S, 'g2')
    expect(workoutGym(S, S.active)).toBe('g2')
    expect(S.activeEquipId).toBe('g2')      // the gym you are at
    setWorkoutGym(S, null)
    expect(workoutGym(S, S.active)).toBe(null)
    expect(S.activeEquipId).toBe('g2')      // "no gym" leaves the profile alone
    expect(S.active.entries[0].hvGym).toBeUndefined()
  })

  it('has no gym without profiles, or with a stale active id', () => {
    expect(workoutGym({ activeEquipId: 'x' }, live([]))).toBe(null)
    expect(workoutGym(state({ activeEquipId: 'gone' }), live([]))).toBe(null)
  })

  it('fills a brand from what the exercise last had at that gym, and remembers a change', () => {
    const S = state({ hvMachines: { [CABLE]: { g1: 'Life Fitness', g2: 'Matrix' } } })
    S.active = live([{ id: CABLE, sets: [] }, { id: DB, sets: [] }])
    expect(entryBrand(S, S.active, 0)).toBe('Life Fitness')
    expect(entryBrand(S, S.active, 1)).toBe(null)
    setWorkoutGym(S, 'g2')
    expect(entryBrand(S, S.active, 0)).toBe('Matrix')
    setEntryBrand(S, 0, '  Technogym ')
    expect(entryBrand(S, S.active, 0)).toBe('Technogym')
    expect(S.hvMachines[CABLE]).toEqual({ g1: 'Life Fitness', g2: 'Technogym' })
    setEntryBrand(S, 0, '')
    expect(entryBrand(S, S.active, 0)).toBe(null)   // cleared on purpose, not refilled
    expect(S.hvMachines[CABLE]).toEqual({ g1: 'Life Fitness' })
  })

  it('remembers brands without a gym under its own key', () => {
    const S = state({ equipProfiles: [] })
    S.active = live([{ id: MACHINE, sets: [] }])
    setEntryBrand(S, 0, 'Hammer Strength')
    expect(S.hvMachines).toEqual({ [MACHINE]: { '': 'Hammer Strength' } })
    expect(knownBrands(S)).toEqual(['Hammer Strength'])
  })

  it('writes the labels onto the saved record, matching upstream\'s finish order', () => {
    const S = state({ hvMachines: { [CABLE]: { g1: 'Life Fitness' } } })
    S.active = live([
      { id: DB, sets: [set(20, 8)] },
      { id: MACHINE, sets: [set(50, 10, false)] },   // nothing logged: upstream's finish drops it
      { id: CABLE, sets: [set(15, 12)] },
    ])
    const labels = labelsAtFinish(S, S.active)
    expect(labels).toEqual([{ hvGym: 'g1' }, { hvGym: 'g1', hvBrand: 'Life Fitness', hvCable: '1:1' }])
    const saved = withLabels(buildCompletedWorkout(S.active, { end: 2 }), labels)
    expect(saved.entries.map(e => [e.id, e.hvGym, e.hvBrand])).toEqual([[DB, 'g1', undefined], [CABLE, 'g1', 'Life Fitness']])
    expect(withLabels(saved, [{}, {}])).toBe(saved)
  })

  it('lets the editor change a saved workout\'s gym and brand, saved by upstream\'s path', () => {
    const S = state({ hvMachines: { [CABLE]: { g1: 'Life Fitness' } } })
    S.active = live([{ id: CABLE, sets: [set(15, 12)] }])
    S.workouts = [withLabels(buildCompletedWorkout(S.active, { end: 2 }), labelsAtFinish(S, S.active))]
    S.active = null
    editCompletedSession(S, 'a1')
    expect(workoutGym(S, S.active)).toBe('g1')
    expect(entryBrand(S, S.active, 0)).toBe('Life Fitness')
    expect(editChangesNothing(S)).toBe(true)
    setWorkoutGym(S, 'g2')
    setEntryBrand(S, 0, 'Matrix')
    expect(S.activeEquipId).toBe('g1')                                 // a past workout moves no profile
    expect(S.hvMachines).toEqual({ [CABLE]: { g1: 'Life Fitness' } })   // nor any default
    expect(editChangesNothing(S)).toBe(false)
    const out = saveWorkoutEdit(S)
    expect(out.entries[0]).toMatchObject({ hvGym: 'g2', hvBrand: 'Matrix' })
  })

  it('does not fill a brand into a saved workout that had none', () => {
    const S = state({ hvMachines: { [CABLE]: { '': 'Life Fitness' } }, equipProfiles: [] })
    S.workouts = [{ id: 'w', d: '2026-10-01', start: 1, end: 2, entries: [{ id: CABLE, sets: [set(10, 10)] }] }]
    editCompletedSession(S, 'w')
    expect(entryBrand(S, S.active, 0)).toBe(null)
  })

  it('lists the labels that tell sessions apart, newest first', () => {
    const w = (id, start, g, b) => ({ id, d: '2026-10-0' + start, start, entries: [{ id: CABLE, sets: [set(10, 10)], hvGym: g, hvBrand: b }] })
    const S = state({ workouts: [w('a', 1, 'g1', 'Life Fitness'), w('b', 2, 'g2', undefined), w('c', 3, 'g1', 'Life Fitness'), w('d', 4, 'gone', 'X')] })
    const ls = labelsFor(S, CABLE)
    expect(ls.map(l => [l.key, l.n])).toEqual([['X', 1], ['Life Fitness', 2], ['', 1]])
    expect(ls.map(l => labelText(l))).toEqual(['X', 'Life Fitness', 'No brand'])
    expect(labelsFor(state({ workouts: [w('a', 1, 'g1', 'B'), w('b', 2, 'g1', 'B')] }), CABLE)).toEqual([])
    // The gym is only where: the same brand at two gyms is one label.
    expect(labelsFor(state({ workouts: [w('a', 1, 'g1', 'B'), w('b', 2, 'g2', 'B')] }), CABLE)).toEqual([])
  })

  it('narrows exercise details to one label, other exercises untouched', () => {
    const w = (id, start, kg, b) => ({ id, d: '2026-10-0' + start, start: start * 1e9, end: start * 1e9 + 1,
      entries: [{ id: CABLE, sets: [set(kg, 10)], hvGym: 'g1', hvBrand: b }, { id: DB, sets: [set(20, 8)] }] })
    const S = state({ workouts: [w('a', 1, 40, 'Life Fitness'), w('b', 2, 25, 'Matrix'), w('c', 3, 45, 'Life Fitness')] })
    const lf = withLabelFilter(S, CABLE, labelKey('Life Fitness'))
    expect(lf.workouts.map(x => x.entries.length)).toEqual([2, 1, 2])
    expect(exerciseSummary(lf, CABLE).sessions.length).toBe(2)
    expect(exerciseSummary(withLabelFilter(S, CABLE, labelKey('Matrix')), CABLE).records.best).toMatchObject({ v: 25 })
    expect(exerciseSummary(lf, DB).sessions.length).toBe(3)
    expect(withLabelFilter(S, CABLE, null)).toBe(S)
  })

  it('syncs the remembered brands as a whole, the newer copy\'s', () => {
    const base = state({ _ts: 1 })
    const edit = (prev, fn, wall) => { const next = structuredClone(prev); fn(next); next._ts = stampChange(prev, next, wall); return next }
    const phone = edit(base, s => { s.hvMachines = { [CABLE]: { g1: 'Life Fitness' } } }, 100)
    const laptop = edit(base, s => { s.unit = 'kg' }, 50)
    expect(mergeStates(phone, laptop).hvMachines).toEqual({ [CABLE]: { g1: 'Life Fitness' } })
    expect(mergeStates(laptop, phone).hvMachines).toEqual({ [CABLE]: { g1: 'Life Fitness' } })
  })

  it('keeps an exercise\'s labels through a workout sync', () => {
    const w = { id: 'w', d: '2026-10-01', start: 1, end: 2, entries: [{ id: CABLE, sets: [set(10, 10)], hvGym: 'g1', hvBrand: 'B' }] }
    const a = state({ _ts: 2, workouts: [w] }), b = state({ _ts: 1, workouts: [] })
    expect(mergeStates(a, b).workouts[0].entries[0]).toMatchObject({ hvGym: 'g1', hvBrand: 'B' })
    expect(mergeStates(b, a).workouts[0].entries[0]).toMatchObject({ hvGym: 'g1', hvBrand: 'B' })
  })
})

describe('hevier cable setup (D43)', () => {
  it('is 1:1 until set, then remembered per exercise and gym; cables only', () => {
    const S = state()
    S.active = live([{ id: CABLE, target: {}, sets: [] }, { id: MACHINE, sets: [] }])
    expect(isCable(CABLE)).toBe(true)
    expect(isCable(MACHINE)).toBe(false)
    expect(entryCable(S, S.active, 0)).toBe('1:1')
    expect(entryCable(S, S.active, 1)).toBe(null)
    setEntryCable(S, 0, '2:1')
    expect(S.hvCables).toEqual({ [CABLE]: { g1: '2:1' } })
    S.active = live([{ id: CABLE, sets: [] }])
    expect(entryCable(S, S.active, 0)).toBe('2:1')
    setWorkoutGym(S, 'g2')
    expect(entryCable(S, S.active, 0)).toBe('1:1')    // another gym, another machine
  })

  it('two stacks are logged per stack, so upstream counts the volume twice', () => {
    const S = state()
    S.active = live([{ id: CABLE, target: { sets: 1, reps: 10 }, sets: [set(15, 10)] }])
    setEntryCable(S, 0, 'x2')
    expect(S.active.entries[0].target).toMatchObject({ dbLoad: 'each', reps: 10 })
    const w = withLabels(buildCompletedWorkout(S.active, { end: 2 }), labelsAtFinish(S, S.active))
    expect(w.entries[0].hvCable).toBe('x2')
    expect(workoutVolume(w)).toBe(2 * 15 * 10)
    setEntryCable(S, 0, '1:1')
    expect(S.active.entries[0].target.dbLoad).toBeUndefined()
    expect(workoutVolume(buildCompletedWorkout(S.active, { end: 2 }))).toBe(15 * 10)
  })

  it('tells sessions apart by setup in exercise details, a cable logged before counted as 1:1', () => {
    const w = (id, start, c) => ({ id, d: '2026-10-0' + start, start, entries: [{ id: CABLE, sets: [set(10, 10)], hvGym: 'g1', ...(c ? { hvCable: c } : {}) }] })
    const S = state({ workouts: [w('a', 1), w('b', 2, '1:1'), w('c', 3, 'x2')] })
    const ls = labelsFor(S, CABLE)
    expect(ls.map(l => [l.key, l.n])).toEqual([['|x2', 1], ['', 2]])
    expect(ls.map(l => labelText(l))).toEqual(['×2', 'No brand'])
    expect(withLabelFilter(S, CABLE, labelKey('', 'x2')).workouts.map(x => x.entries.length)).toEqual([0, 0, 1])
  })
})

describe('hevier labels on any exercise (D28)', () => {
  const calf = '1178'   // dumbbell standing single leg calf raise
  const A = (e = {}) => ({ entries: [{ id: calf, sets: [], ...e }] })
  it('a free-weight exercise has no label line until it has a label', () => {
    expect(hasLabel({ workouts: [] }, A(), 0)).toBe(false)
    expect(hasLabel({ workouts: [] }, A({ hvBrand: 'Achilles Rehab' }), 0)).toBe(true)
    expect(hasLabel({ workouts: [], hvMachines: { [calf]: { '': 'Achilles Rehab' } } }, A(), 0)).toBe(true)
  })
  it('one logged with a label before has the line, with the remembered label', () => {
    const S = { workouts: [{ d: '2026-10-01', entries: [{ id: calf, hvBrand: 'Achilles Rehab', sets: [] }] }], hvMachines: { [calf]: { '': 'Achilles Rehab' } } }
    expect(hasLabel(S, A(), 0)).toBe(true)
    expect(entryBrand(S, A(), 0)).toBe('Achilles Rehab')
    expect(hasLabel(S, A({ hvBrand: '' }), 0)).toBe(false)   // removed in this session
  })
})
