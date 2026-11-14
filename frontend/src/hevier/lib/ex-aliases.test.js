import { afterEach, describe, expect, it } from 'vitest'
import { addAlias, removeAlias, showAlias, aliasesOf, shownAlias, cleanAlias, moveAliases, moveShownNames } from './ex-aliases.js'
import { registerExerciseAliases } from '../../lib/exercise-aliases.js'
import { exerciseNameFor, exerciseNameClass } from '../../lib/i18n-core.js'
import { searchExercises, EXIDX, CATALOGUE } from '../../lib/exercises.js'

const PEC = Object.values(EXIDX).find(e => /^lever seated fly$/i.test(e.n)) || CATALOGUE.find(e => /fly/.test(e.n))

describe('exercise aliases', () => {
  it('adds names once, in any case, and keeps the shown one only while it exists', () => {
    const s = {}
    expect(addAlias(s, 'x', '  Pec   deck ')).toBe('Pec deck')
    expect(addAlias(s, 'x', 'PEC DECK')).toBe('Pec deck')
    addAlias(s, 'x', 'Butterfly', { show: true })
    expect(aliasesOf(s, 'x')).toEqual(['Pec deck', 'Butterfly'])
    expect(shownAlias(s, 'x')).toBe('Butterfly')
    removeAlias(s, 'x', 'Butterfly')
    expect(shownAlias(s, 'x')).toBeNull()
    showAlias(s, 'x', 'Pec deck')
    expect(s).toEqual({ exAliases: { x: ['Pec deck'] }, exShownName: { x: 'Pec deck' } })
    showAlias(s, 'x', null)
    expect(s).toEqual({ exAliases: { x: ['Pec deck'] }, exShownName: { x: null } })
    removeAlias(s, 'x', 'Pec deck')
    expect(s).toEqual({ exAliases: { x: [] }, exShownName: { x: null } })
    expect(cleanAlias('   ')).toBeNull()
  })

  it('keeps a custom exercise’s names on the exercise, as upstream’s editor does', () => {
    const s = { customEx: [{ id: 'c1', n: 'My row', aliases: ['Seal row'] }] }
    addAlias(s, 'c1', 'Chest row', { show: true })
    expect(s.customEx[0].aliases).toEqual(['Seal row', 'Chest row'])
    expect(s.exAliases).toBeUndefined()
    expect(shownAlias(s, 'c1')).toBe('Chest row')
  })

  it('moves the fork’s old names into upstream’s once, the shown one still shown', () => {
    const s = { exAliases: { x: ['Butterfly'] }, hvAliases: { x: { names: ['Pec deck', 'butterfly'], show: 'Pec deck' }, y: { names: ['Ab wheel'] } } }
    moveAliases(s)
    expect(s).toEqual({ exAliases: { x: ['Butterfly', 'Pec deck'], y: ['Ab wheel'] }, exShownName: { x: 'Pec deck' } })
  })

  it('moves the fork’s shown name into upstream’s field once, a pick made there kept (D103)', () => {
    const s = { exAliases: { x: ['Pec deck'], y: ['A', 'B'] }, hvShownName: { x: 'Pec deck', y: 'A' }, exShownName: { y: 'B' } }
    moveShownNames(s)
    expect(s).toEqual({ exAliases: { x: ['Pec deck'], y: ['A', 'B'] }, exShownName: { x: 'Pec deck', y: 'B' } })
    expect(shownAlias(s, 'x')).toBe('Pec deck')
  })
})

describe('the shown name, upstream’s since 1.4.5', () => {
  afterEach(() => { registerExerciseAliases({}) })

  it('shows the switched-on name and finds the exercise by every name', () => {
    // A new copy of S for each change, as the store makes one.
    let S = {}
    const edit = fn => { S = structuredClone(S); fn(S); registerExerciseAliases(S.exAliases, S.exShownName) }
    const own = exerciseNameFor(PEC)
    edit(s => addAlias(s, PEC.id, 'Pec deck'))
    expect(exerciseNameFor(PEC)).toBe(own)
    expect(searchExercises(CATALOGUE, 'pec deck').map(e => e.id)).toContain(PEC.id)
    expect(searchExercises(CATALOGUE, own).map(e => e.id)).toContain(PEC.id)
    edit(s => showAlias(s, PEC.id, 'Pec deck'))
    expect(exerciseNameFor(PEC)).toBe('Pec deck')
    expect(exerciseNameClass(PEC)).toBe('')
    edit(s => removeAlias(s, PEC.id, 'Pec deck'))
    expect(searchExercises(CATALOGUE, 'pec deck').map(e => e.id)).not.toContain(PEC.id)
  })
})
