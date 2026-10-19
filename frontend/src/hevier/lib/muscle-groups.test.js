// Muscles in big groups (DECISIONS.md D64).
import { describe, expect, it } from 'vitest'
import { MUSCLES } from '../../lib/muscles.js'
import { EXDB, smOf } from '../../lib/exercises.js'
import { headOf } from './delt-heads.js'
import { MUSCLE_GROUPS, groupOfMuscle, groupOfName, nameGroups, muscleGroupValue, explorerShare, muscleValueLabel, muscleFilterValue } from './muscle-groups.js'
import { muscleOf, muscleOptions, muscleMatches } from './exercise-picker.js'

describe('hevier: muscle groups (D64)', () => {
  it('puts every body-map muscle and every picker muscle in one named group', () => {
    for (const m of MUSCLES) expect(groupOfMuscle(m), m).not.toBe('other')
    for (const n of muscleOptions(EXDB)) expect(groupOfName(n), n).not.toBe('other')
    const names = MUSCLE_GROUPS.flatMap(g => g.names)
    expect(new Set(names).size).toBe(names.length)
    expect(groupOfName('Something custom')).toBe('other')
  })

  it('lists a group’s muscles in the group’s order', () => {
    expect(nameGroups(['Triceps', 'Biceps', 'Shoulders'])).toEqual([
      { id: 'shoulders', label: 'Shoulders', kinds: ['Front Delts', 'Side Delts', 'Rear Delts'] },
      { id: 'arms', label: 'Arms', kinds: ['Biceps', 'Triceps'] },
    ])
  })

  it('filters the picker by a muscle or a whole group', () => {
    const curl = EXDB.find(e => muscleOf(e) === 'Biceps')
    const squat = EXDB.find(e => muscleOf(e) === 'Quadriceps')
    expect(muscleMatches(muscleGroupValue('arms'), curl)).toBe(true)
    expect(muscleMatches(muscleGroupValue('arms'), squat)).toBe(false)
    expect(muscleMatches('Biceps', curl)).toBe(true)
    expect(muscleMatches('', squat)).toBe(true)
    expect(muscleValueLabel(muscleGroupValue('legs'))).toBe('Legs')
    expect(muscleValueLabel('Biceps')).toBe('Biceps')
  })

  it('reads a group in the explorer as its most-worked muscle', () => {
    const curl = EXDB.find(e => e.tg === 'biceps')
    expect(explorerShare(muscleGroupValue('arms'), curl)).toBe(1)
    expect(explorerShare('biceps', curl)).toBe(1)
    expect(explorerShare(muscleGroupValue('legs'), curl)).toBeUndefined()
  })

  it('opens Shoulders on its three heads, sorted by name (D65)', () => {
    const by = n => EXDB.find(e => e.n === n)
    expect(headOf(by('dumbbell lateral raise'))).toBe('side')
    expect(headOf(by('cable bent over one arm lateral raise'))).toBe('rear')
    expect(headOf(by('dumbbell rear delt fly'))).toBe('rear')
    expect(headOf(by('barbell upright row'))).toBe('side')
    expect(headOf(by('dumbbell powell raise'))).toBe('rear')
    expect(headOf(by('pike push up'))).toBe('front')
    expect(headOf(by('rotator cuff stretch'))).toBeNull()
    expect(headOf(EXDB.find(e => e.tg === 'biceps'))).toBeNull()
    const ohp = EXDB.find(e => e.tg === 'delts' && /military press/.test(e.n))
    expect(muscleMatches('Front Delts', ohp)).toBe(true)
    expect(muscleMatches('Side Delts', ohp)).toBe(false)
    expect(muscleMatches(muscleGroupValue('shoulders'), by('rotator cuff stretch'))).toBe(true)
    expect(muscleFilterValue('Shoulders', by('dumbbell lateral raise'))).toBe('Side Delts')
    expect(muscleFilterValue('Shoulders', by('rotator cuff stretch'))).toBe(muscleGroupValue('shoulders'))
    expect(muscleFilterValue('Biceps', null)).toBe('Biceps')
  })

  it('counts a row’s rear delts in the explorer, not its front or side (D65)', () => {
    const row = EXDB.find(e => e.tg !== 'delts' && smOf(e).includes('rear deltoids'))
    expect(explorerShare('delts-rear', row)).toBeGreaterThan(0)
    expect(explorerShare('delts-front', row)).toBeUndefined()
    const raise = EXDB.find(e => e.n === 'dumbbell lateral raise')
    expect(explorerShare('delts-side', raise)).toBe(1)
    expect(explorerShare('delts-rear', raise)).toBeUndefined()
    expect(explorerShare(muscleGroupValue('shoulders'), raise)).toBe(1)
  })
})

