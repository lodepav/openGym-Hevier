import { describe, expect, it } from 'vitest'
import { moduleOn, widgetOn, FORK_PARTS, FORK_MODULES, setAnyModule } from './fork-modules.js'
import { MODULE_IDS } from '../../lib/modules.js'
import { plateLineOn } from './settings.js'

describe('hevier: upstream’s Modules in the fork’s screens (D97)', () => {
  it('is upstream’s isOn: a module never set is on', () => {
    expect(moduleOn({}, 'body')).toBe(true)
    expect(moduleOn({ modules: { body: false } }, 'body')).toBe(false)
  })
  it('names only upstream’s modules and the fork’s own', () => {
    for (const id of Object.keys(FORK_PARTS)) expect([...MODULE_IDS, ...FORK_MODULES.map(m => m.id)]).toContain(id)
  })
  it('D114: the fork’s modules have an hv id, start on, and are set like upstream’s', () => {
    for (const m of FORK_MODULES) { expect(m.id).toMatch(/^hv[A-Z]/); expect(MODULE_IDS).not.toContain(m.id); expect(moduleOn({}, m.id)).toBe(true) }
    const s = {}
    setAnyModule(s, 'hvGyms', false)
    setAnyModule(s, 'body', false)
    setAnyModule(s, 'hvNope', false)
    expect(s.modules).toEqual({ hvGyms: false, body: false })
    expect(widgetOn({ modules: { strength: false } }, 'wsets')).toBe(false)
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
