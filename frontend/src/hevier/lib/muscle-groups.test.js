// Muscles in big groups (DECISIONS.md D64).
import { describe, expect, it } from 'vitest'
import { EXDB } from '../../lib/exercises.js'
import { headOf } from './delt-heads.js'
import { MUSCLE_GROUPS, groupOfName, nameGroups, muscleGroupValue, muscleValueLabel, muscleFilterValue } from './muscle-groups.js'
import { muscleOf, muscleOptions, muscleMatches } from './exercise-picker.js'

describe('hevier: muscle groups (D64)', () => {
  it('puts every body-map muscle and every picker muscle in one named group', () => {
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

  it('opens Shoulders on its three heads, as the catalogue names them (D65, upstream’s #638)', () => {
    const by = n => EXDB.find(e => e.n === n)
    expect(headOf(by('dumbbell lateral raise'))).toBe('side')
    expect(headOf(by('dumbbell rear delt fly'))).toBe('rear')
    expect(headOf(by('barbell upright row'))).toBe('side')
    expect(headOf(by('pike push up'))).toBe('front')
    expect(headOf(EXDB.find(e => e.tg === 'biceps'))).toBeNull()
    // A custom exercise's plain shoulder has no head: it is under Shoulders as a whole.
    const own = { id: 'c1', n: 'My shoulder thing', custom: true, tg: 'deltoids', primaries: ['deltoids'] }
    expect(headOf(own)).toBeNull()
    const ohp = EXDB.find(e => e.tg === 'front delts' && /military press/.test(e.n))
    expect(muscleMatches('Front Delts', ohp)).toBe(true)
    expect(muscleMatches('Side Delts', ohp)).toBe(false)
    expect(muscleMatches(muscleGroupValue('shoulders'), own)).toBe(true)
    expect(muscleMatches(muscleGroupValue('shoulders'), by('dumbbell lateral raise'))).toBe(true)
    expect(muscleFilterValue('Shoulders', own)).toBe(muscleGroupValue('shoulders'))
    expect(muscleFilterValue('Biceps', null)).toBe('Biceps')
  })

})
