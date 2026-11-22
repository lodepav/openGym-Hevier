import { describe, it, expect } from 'vitest'
import { connectedLine, backupLine } from './settings-values.js'

const tr = (s, ...a) => a.reduce((out, v, i) => out.replace('{' + i + '}', v), s)

describe('connectedLine', () => {
  it('names what is on, else nothing', () => {
    expect(connectedLine({ hevy: true, strap: true })).toBe('Hevy\u00a0· Strap')
    expect(connectedLine({ hevy: true, health: 'Health Connect', strap: true })).toBe('Hevy\u00a0· Health Connect\u00a0· Strap')
    expect(connectedLine({ hevy: false, health: null, strap: null })).toBeNull()
  })
})

describe('backupLine', () => {
  const ago = ts => '@' + ts
  it('says when the newest backup was made, and that there is none before one', () => {
    expect(backupLine({ at: 500, webdavAt: 300 }, tr, ago)).toBe('Last backup @500')
    expect(backupLine({ at: 0, webdavAt: 300 }, tr, ago)).toBe('Last backup @300')
    expect(backupLine({}, tr, ago)).toBe('Not backed up yet')
  })
  it('names the auto-backup while it is on', () => {
    expect(backupLine({ at: 500, auto: true }, tr, ago)).toBe('Auto-backup on')
  })
})
