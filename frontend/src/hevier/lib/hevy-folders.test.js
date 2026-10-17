import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fetchHevyFolders, importHevyFolders, applyHevyFolders } from './hevy-folders.js'
import { hooks } from '../hooks.js'
import { parseHevyRoutines, mergeHevyRoutines } from '../../lib/import-hevy.js'
import { folderGroups } from './routine-folders.js'

const T = [{ id: 't1', title: 'Squat (Barbell)', type: 'weight_reps', primary_muscle_group: 'quadriceps' }]
const routine = (id, title, folder_id) => ({
  id, title, folder_id,
  exercises: [{ exercise_template_id: 't1', title: 'Squat (Barbell)', sets: [{ type: 'normal', weight_kg: 100, reps: 5 }] }],
})
const FOLDERS = [{ id: 7, title: 'Push Pull Legs', index: 1 }, { id: 3, title: '  Rehab  ', index: 0 }]
const pages = async (path, key, { resultKey }) => {
  expect(path).toBe('/v1/routine_folders')
  expect(key).toBe('k')
  expect(resultKey).toBe('routine_folders')
  return FOLDERS
}

// What the import sheet does: parse, fetch the folders, merge, apply (seam S20).
async function importRoutines(S, raw, folders = pages) {
  const data = { routines: parseHevyRoutines(raw, T, { unit: 'kg' }) }
  await importHevyFolders('k', data, folders)
  const res = mergeHevyRoutines(S, data.routines)
  applyHevyFolders(S, data.routines, res)
  return S
}
const byHevy = (S, id) => S.routines.find(r => r.hevyId === id)

describe('hevier Hevy routine folders (D30)', () => {
  beforeEach(() => { hooks.hevyFolders = { fetch: importHevyFolders, merged: applyHevyFolders } })
  afterEach(() => { hooks.hevyFolders = null })

  it('fetches the folders through upstream\'s pager', async () => {
    expect(await fetchHevyFolders('k', pages)).toBe(FOLDERS)
  })

  it('puts new routines into their Hevy folders, grouped in Hevy\'s folder order', async () => {
    const S = { routines: [{ id: 'mine', name: 'Mine', ex: [] }], customEx: [] }
    await importRoutines(S, [routine('a', 'Push', 7), routine('b', 'Calf', 3), routine('c', 'Loose', null), routine('d', 'Pull', 7)])
    expect(byHevy(S, 'a')).toMatchObject({ folder: 'Push Pull Legs', hvHevyFolder: 'Push Pull Legs' })
    expect(byHevy(S, 'b').folder).toBe('Rehab')
    expect(byHevy(S, 'c').folder).toBeUndefined()
    expect(byHevy(S, 'c').hvHevyFolder).toBe('')
    expect(S.routines.map(r => r.name)).toEqual(['Mine', 'Loose', 'Calf', 'Push', 'Pull'])
    expect(folderGroups(S.routines).map(g => g.name)).toEqual([null, 'Rehab', 'Push Pull Legs'])
  })

  it('on a re-import follows Hevy only where the folder was not changed in openGym', async () => {
    const S = { routines: [], customEx: [] }
    await importRoutines(S, [routine('a', 'Push', 7), routine('b', 'Calf', 3), routine('c', 'Legs', 7)])
    byHevy(S, 'b').folder = 'My rehab'          // moved in openGym
    delete byHevy(S, 'c').folder                 // put back into My Routines
    await importRoutines(S, [routine('a', 'Push', 3), routine('b', 'Calf', 7), routine('c', 'Legs', 3)])
    expect(S.routines).toHaveLength(3)           // replaced in place, not doubled
    expect(byHevy(S, 'a')).toMatchObject({ folder: 'Rehab', hvHevyFolder: 'Rehab' })
    expect(byHevy(S, 'b').folder).toBe('My rehab')
    expect(byHevy(S, 'c').folder).toBeUndefined()
  })

  it('treats a routine imported before folders as given none', async () => {
    const S = { routines: [
      { id: 'x', name: 'Old', hevyId: 'a', ex: [] },
      { id: 'y', name: 'Filed', hevyId: 'b', folder: 'Mine', ex: [] },
    ], customEx: [] }
    await importRoutines(S, [routine('a', 'Old', 7), routine('b', 'Filed', 3)])
    expect(byHevy(S, 'a').folder).toBe('Push Pull Legs')
    expect(byHevy(S, 'b').folder).toBe('Mine')
  })

  it('imports the routines without folders when the folders can\'t be read', async () => {
    const S = { routines: [], customEx: [] }
    await importRoutines(S, [routine('a', 'Push', 7)], async () => { throw new Error('http 500') })
    expect(byHevy(S, 'a').folder).toBeUndefined()
    expect(S.routines).toHaveLength(1)
  })

  it('leaves upstream\'s parse as it is with the hook empty', () => {
    hooks.hevyFolders = null
    const p = parseHevyRoutines([routine('a', 'Push', 7)], T, { unit: 'kg' })
    expect(p.routines[0].hvFolderId).toBeUndefined()
  })
})
