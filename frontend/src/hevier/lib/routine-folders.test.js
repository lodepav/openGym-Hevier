import { afterEach, describe, it, expect, vi } from 'vitest'
import {
  folderGroups, folderNames, reorderInGroup, reorderFolders, moveToFolder, renameFolder, removeFolder,
  cleanFolderName, stillEmpty, readEmptyFolders, writeEmptyFolders, readClosedFolders, writeClosedFolders, moveFoldersIntoS,
  FOLDERS_KEY, CLOSED_KEY,
} from './routine-folders.js'
import { mergeStates, stampChange } from '../../lib/sync-merge.js'

const R = (id, folder) => (folder ? { id, name: id, ex: [], folder } : { id, name: id, ex: [] })
const ids = list => list.map(r => r.id)

describe('hevier routine folders', () => {
  const list = [R('a'), R('p1', 'Push'), R('b'), R('l1', 'Legs'), R('p2', 'Push')]

  it('groups My Routines first, then folders in the order of their first routine', () => {
    expect(folderGroups(list)).toEqual([
      { name: null, ids: ['a', 'b'] },
      { name: 'Push', ids: ['p1', 'p2'] },
      { name: 'Legs', ids: ['l1'] },
    ])
    expect(folderNames(list, ['Arms', 'Legs'])).toEqual(['Push', 'Legs', 'Arms'])
  })

  it('reorders inside a group without moving anything else', () => {
    expect(ids(reorderInGroup(list, 'Push', 1, 0))).toEqual(['a', 'p2', 'b', 'l1', 'p1'])
    expect(ids(reorderInGroup(list, null, 0, 1))).toEqual(['b', 'p1', 'a', 'l1', 'p2'])
    expect(reorderInGroup(list, 'Push', 0, 5)).toBe(list)
  })

  it('reorders folders as blocks, My Routines first', () => {
    expect(ids(reorderFolders(list, ['Legs', 'Push']))).toEqual(['a', 'b', 'l1', 'p1', 'p2'])
  })

  it('moves a routine to the end of its new folder, and back to My Routines', () => {
    const next = moveToFolder(list, 'a', 'Push')
    expect(ids(next)).toEqual(['p1', 'b', 'l1', 'p2', 'a'])
    expect(next.find(r => r.id === 'a').folder).toBe('Push')
    expect(list[0]).not.toHaveProperty('folder')
    const back = moveToFolder(next, 'l1', null)
    expect(back.find(r => r.id === 'l1')).not.toHaveProperty('folder')
    expect(ids(back)).toEqual(['p1', 'b', 'l1', 'p2', 'a'])
    expect(ids(moveToFolder([R('x', 'F')], 'x', null))).toEqual(['x'])
    expect(ids(moveToFolder(list, 'b', 'Arms')).at(-1)).toBe('b')
  })

  it('renames and removes folders, keeping their routines', () => {
    const renamed = renameFolder(list, 'Push', '  Push  A ')
    expect(renamed.filter(r => r.folder === 'Push A').map(r => r.id)).toEqual(['p1', 'p2'])
    expect(renameFolder(list, 'Push', '   ')).toBe(list)
    const gone = removeFolder(list, 'Push')
    expect(gone.some(r => 'folder' in r && r.folder === 'Push')).toBe(false)
    expect(ids(gone)).toEqual(ids(list))
  })

  it('cleans names, and forgets an empty folder once a routine is in it', () => {
    expect(cleanFolderName('  ')).toBeNull()
    expect(cleanFolderName('x'.repeat(60))).toHaveLength(40)
    expect(stillEmpty(list, ['Push', 'Arms'])).toEqual(['Arms'])
  })

  it('a folder set on one device survives a sync with a rename made on another', () => {
    const base = { _ts: 1, routines: [R('a')] }
    const edit = (prev, fn, wall) => { const next = structuredClone(prev); fn(next); next._ts = stampChange(prev, next, wall); return next }
    const phone = edit(base, s => { s.routines = moveToFolder(s.routines, 'a', 'Push') }, 100)
    const laptop = edit(base, s => { s.routines[0].name = 'Bench day' }, 200)
    const merged = mergeStates(phone, laptop)
    expect(merged.routines[0]).toMatchObject({ id: 'a', name: 'Bench day', folder: 'Push' })
  })
})

// A Storage stand-in, so the old device-local copy can be read once and forgotten.
const fakeStorage = init => {
  const m = new Map(Object.entries(init))
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), has: k => m.has(k) }
}

describe('the stored empty and folded folders', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reads S first, else the copy this device kept before, and writing moves it into S', () => {
    const ls = fakeStorage({ [FOLDERS_KEY]: '["Arms"," "]', [CLOSED_KEY]: '["Push"]' })
    vi.stubGlobal('localStorage', ls)
    const s = {}
    expect(readEmptyFolders(s)).toEqual(['Arms'])
    expect(readClosedFolders(s)).toEqual(['Push'])
    writeEmptyFolders(s, ['Arms', 'Legs', 'Arms'])
    writeClosedFolders(s, [])
    expect(s).toEqual({ hvFolders: ['Arms', 'Legs'] })
    expect(ls.has(FOLDERS_KEY) || ls.has(CLOSED_KEY)).toBe(false)
    expect(readClosedFolders(s)).toEqual([])
  })

  it('moves the device’s folders into S once', () => {
    const ls = fakeStorage({ [CLOSED_KEY]: '["Push"]' })
    vi.stubGlobal('localStorage', ls)
    const s = {}
    expect(moveFoldersIntoS(s)).toBe(true)
    expect(s).toEqual({ hvFoldersClosed: ['Push'] })
    expect(moveFoldersIntoS(s)).toBe(false)
  })
})
