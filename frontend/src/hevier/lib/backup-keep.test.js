// @vitest-environment happy-dom
// Seam S52 (D20): the fork's auto-backup keeps the newest 5 dated copies, where upstream keeps 14.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { todayISO } from '../../lib/format.js'

const files = vi.hoisted(() => new Map())
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Data: 'DATA', Documents: 'DOCUMENTS', Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: {
    writeFile: async ({ path, directory, data }) => { files.set(directory + '/' + path, data) },
    readdir: async ({ path, directory }) => {
      const prefix = directory + '/' + path + '/'
      return { files: [...files.keys()].filter(k => k.startsWith(prefix)).map(k => ({ name: k.slice(prefix.length), type: 'file' })) }
    },
    deleteFile: async ({ path, directory }) => { files.delete(directory + '/' + path) },
  },
}))

const { writeAutoBackup, AUTO_BACKUP_KEEP } = await import('../../lib/mobile.js')
const { autoBackupSubtitle } = await import('../../components/BackupFolderRow.jsx')
const { hooks } = await import('../hooks.js')

const day = n => { const d = new Date(2026, 0, 1); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const name = d => 'opengym-backup-' + d + '.json'
const inFolder = () => [...files.keys()].filter(k => k.startsWith('DOCUMENTS/openGym/')).map(k => k.slice(18)).sort()

beforeEach(() => { files.clear(); hooks.backupKeep = 5 })
afterEach(() => { hooks.backupKeep = null })

describe('hevier: auto-backup keeps the newest 5 (S52, D20)', () => {
  it('prunes to five, today\'s among them', async () => {
    for (let i = 0; i < 10; i++) files.set('DOCUMENTS/openGym/' + name(day(i)), '{}')
    files.set('DOCUMENTS/openGym/notes.txt', 'mine')
    await writeAutoBackup({})
    const dated = inFolder().filter(n => n.startsWith('opengym-backup-'))
    expect(dated).toHaveLength(5)
    expect(dated).toContain(name(todayISO()))
    expect(dated).toEqual(expect.arrayContaining([name(day(9)), name(day(8)), name(day(7)), name(day(6))]))
    expect(inFolder()).toContain('notes.txt')
  })

  it('the Settings row says five; without the hook it is upstream\'s 14', () => {
    expect(autoBackupSubtitle(null, AUTO_BACKUP_KEEP)).toContain('keeps the newest 5.')
    hooks.backupKeep = null
    expect(AUTO_BACKUP_KEEP).toBe(14)
    expect(autoBackupSubtitle(null, AUTO_BACKUP_KEEP)).toContain('keeps the newest 14.')
  })
})
