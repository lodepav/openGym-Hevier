// Muscles in big groups (DECISIONS.md D64).
import { describe, expect, it } from 'vitest'
import { MUSCLES } from '../../lib/muscles.js'
import { EXDB } from '../../lib/exercises.js'
import { MUSCLE_GROUPS, groupOfMuscle, groupOfName, nameGroups, muscleGroupValue, explorerShare, muscleValueLabel } from './muscle-groups.js'
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
      { id: 'shoulders', label: 'Shoulders', kinds: ['Shoulders'] },
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
})
