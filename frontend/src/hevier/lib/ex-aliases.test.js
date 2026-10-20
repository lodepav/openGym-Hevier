import { afterEach, describe, expect, it } from 'vitest'
import { addAlias, removeAlias, showAlias, aliasesOf, shownAlias, aliasHooks, cleanAlias } from './ex-aliases.js'
import { hooks } from '../hooks.js'
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
    expect(s.hvAliases).toEqual({ x: { names: ['Pec deck'], show: 'Pec deck' } })
    showAlias(s, 'x', null)
    expect(s.hvAliases).toEqual({ x: { names: ['Pec deck'] } })
    removeAlias(s, 'x', 'Pec deck')
    expect(s).toEqual({})
    expect(cleanAlias('   ')).toBeNull()
  })
})

describe('seam S41', () => {
  afterEach(() => { hooks.exName = hooks.exAliases = hooks.namesVersion = null })

  it('shows the switched-on name and finds the exercise by every name', () => {
    // A new copy of S for each change, as the store makes one.
    let S = {}
    const edit = fn => { S = structuredClone(S); fn(S) }
    Object.assign(hooks, aliasHooks(() => S))
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
