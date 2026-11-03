import { describe, expect, it } from 'vitest'
import { moduleOn, widgetOn, FORK_PARTS } from './fork-modules.js'
import { MODULE_IDS } from '../../lib/modules.js'
import { plateLineOn } from './settings.js'

describe('hevier: upstream’s Modules in the fork’s screens (D97)', () => {
  it('is upstream’s isOn: a module never set is on', () => {
    expect(moduleOn({}, 'body')).toBe(true)
    expect(moduleOn({ modules: { body: false } }, 'body')).toBe(false)
  })
  it('names only upstream’s modules', () => {
    for (const id of Object.keys(FORK_PARTS)) expect(MODULE_IDS).toContain(id)
  })
  it('hides the streak and body-weight widgets with their modules, never a core one', () => {
    const off = { modules: { motivation: false, body: false } }
    expect(widgetOn(off, 'streak')).toBe(false)
    expect(widgetOn(off, 'weight')).toBe(false)
    for (const id of ['today', 'recovery', 'weekly', 'feed']) expect(widgetOn(off, id)).toBe(true)
    expect(widgetOn({}, 'streak')).toBe(true)
  })
  it('keeps the plate line off by default, and off with Plates and warm-ups off', () => {
    expect(plateLineOn({})).toBe(false)
    expect(plateLineOn({ hvPlateLine: true })).toBe(true)
    expect(plateLineOn({ hvPlateLine: true, modules: { plates: false } })).toBe(false)
  })
})
