/* A phone updated from a release before upstream 1.4.5 keeps the name it chose to show an exercise
 * by: the fork's S.hvShownName moves into upstream's S.exShownName (D103), and upstream's
 * exerciseNameFor then shows it. */
import { afterEach, expect, it } from 'vitest'
import { moveShownNames } from '../lib/ex-aliases.js'
import { registerExerciseAliases } from '../../lib/exercise-aliases.js'
import { exerciseNameFor } from '../../lib/i18n-core.js'
import { EXIDX } from '../../lib/exercises.js'
import fixture from './fixtures/2.7.0.json'

afterEach(() => registerExerciseAliases({}, {}))

it('a 2.7.0 profile’s shown name is still shown after the move', () => {
  const S = JSON.parse(fixture.saved).S ?? JSON.parse(fixture.saved)
  const id = S.workouts[0].entries[0].id
  Object.assign(S, { exAliases: { ...S.exAliases, [id]: ['My name for it'] }, hvShownName: { [id]: 'My name for it' } })
  registerExerciseAliases(S.exAliases, S.exShownName)
  expect(exerciseNameFor(EXIDX[id])).not.toBe('My name for it')
  moveShownNames(S)
  registerExerciseAliases(S.exAliases, S.exShownName)
  expect(S.hvShownName).toBeUndefined()
  expect(exerciseNameFor(EXIDX[id])).toBe('My name for it')
})
