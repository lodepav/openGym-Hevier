/* A phone updated from a release before upstream 1.4.5 keeps what it chose in the import's review
 * (D33): the fork's S.hvImportMap moves into upstream's remembered picks, the exercise's other
 * names (D103), and the next import of the same title lands on the same exercise. */
import { expect, it } from 'vitest'
import { moveImportPicks } from '../lib/ex-aliases.js'
import { aliasMatches, pickFor } from '../../lib/import-choices.js'
import fixture from './fixtures/2.7.0.json'

it('a 2.7.0 profile’s import picks are remembered after the move', () => {
  const S = JSON.parse(fixture.saved).S ?? JSON.parse(fixture.saved)
  const mine = { id: 'cMine', n: 'my lift', custom: true, eq: 'custom', tg: '' }
  Object.assign(S, {
    customEx: [...(S.customEx || []), mine],
    exAliases: { ...S.exAliases, '0025': ['Newer Pick'] },
    hvImportMap: { 'Hevy|odd lift': '0463', 'Strong|mine thing': 'cMine', 'Hevy|kept own': 'custom', 'Hevy|newer pick': '0463', 'Hevy|gone': 'cGone' },
  })
  moveImportPicks(S)
  expect(S.hvImportMap).toBeUndefined()
  const m = aliasMatches(S)
  expect(pickFor(m, 'Odd Lift', S.customEx)).toBe('0463')
  expect(pickFor(m, 'Mine Thing', S.customEx)).toBe('cMine')
  expect(pickFor(m, 'Kept Own', S.customEx)).toBeUndefined()
  expect(pickFor(m, 'Gone', S.customEx)).toBeUndefined()
  // A name upstream already remembers keeps its newer pick.
  expect(pickFor(m, 'Newer Pick', S.customEx)).toBe('0025')
})
