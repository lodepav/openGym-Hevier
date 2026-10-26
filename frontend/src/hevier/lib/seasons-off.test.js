import { describe, it, expect } from 'vitest'
import { activeSeason, THEME_IDS } from '../../lib/seasonal.js'
import { seasonsOn, seasonsOff, initSeasonsOff } from './seasons-off.js'

const HALLOWEEN = new Date('2026-10-30T12:00:00')

describe('hevier seasonal themes off (D17)', () => {
  it('turns every theme off, keeping the theme\'s other settings', () => {
    const s = { seasonal: { halloween: 'auto', halloweenColors: true } }
    expect(activeSeason(s, HALLOWEEN)).toBe('halloween')   // upstream's Auto, in season
    expect(seasonsOn(s)).toBe(true)
    seasonsOff(s)
    expect(s.seasonal).toEqual({ ...Object.fromEntries(THEME_IDS.map(id => [id, 'off'])), halloweenColors: true })
    expect(seasonsOn(s)).toBe(false)
    expect(activeSeason(s, HALLOWEEN)).toBe(null)
    const fresh = {}
    seasonsOff(fresh)
    expect(activeSeason(fresh, HALLOWEEN)).toBe(null)
  })

  it('runs on install and again when a sync brings another choice, and only then', () => {
    let S = { seasonal: { halloween: 'on' } }, watcher = null, updates = 0
    const store = {
      get: () => S,
      update: fn => { const s = structuredClone(S); fn(s); S = s; updates++ },
      watch: () => cb => { watcher = cb },
    }
    initSeasonsOff(store)
    expect(S.seasonal.halloween).toBe('off')
    watcher()
    expect(updates).toBe(1)
    S = { seasonal: { halloween: 'auto' } }
    watcher()
    expect(S.seasonal.halloween).toBe('off')
    expect(updates).toBe(2)
  })
})
