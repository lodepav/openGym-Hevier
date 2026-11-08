import { describe, expect, it } from 'vitest'
import { PARTS, hasParts, partOn, partSwitch, anyPartOn, setPart } from './module-parts.js'
import { MODULE_IDS, applyPreset } from '../../lib/modules.js'
import { mergeStates } from '../../lib/sync-merge.js'

describe('hevier: a switch per part inside a module (D102)', () => {
  it('names only upstream modules, each with two parts or more', () => {
    for (const [mod, parts] of Object.entries(PARTS)) {
      expect(MODULE_IDS).toContain(mod)
      expect(parts.length).toBeGreaterThan(1)
      expect(new Set(parts.map(p => p.id)).size).toBe(parts.length)
    }
    expect(hasParts('body')).toBe(true)
    expect(hasParts('effort')).toBe(false)
  })
  it('a part never set is on; its switch hides it; the module off hides every part and keeps the switches', () => {
    const s = {}
    expect(partOn(s, 'body', 'photos')).toBe(true)
    setPart(s, 'body', 'photos', false)
    expect(partOn(s, 'body', 'photos')).toBe(false)
    expect(partOn(s, 'body', 'measurements')).toBe(true)
    s.modules = { body: false }
    expect(partOn(s, 'body', 'measurements')).toBe(false)
    expect(anyPartOn(s, 'body')).toBe(false)
    s.modules = { body: true }
    expect(partSwitch(s, 'body', 'photos')).toBe(false)
    expect(partOn(s, 'body', 'measurements')).toBe(true)
  })
  it('a preset sets the modules, never the parts', () => {
    const s = { hvModuleParts: { 'motivation.share': false } }
    applyPreset(s, 'all')
    expect(s.hvModuleParts).toEqual({ 'motivation.share': false })
    expect(partOn(s, 'motivation', 'share')).toBe(false)
    expect(partOn(s, 'motivation', 'streak')).toBe(true)
  })
  it('anyPartOn is false only when every part is off', () => {
    const s = {}
    setPart(s, 'body', 'weight', false); setPart(s, 'body', 'measurements', false)
    expect(anyPartOn(s, 'body')).toBe(true)
    setPart(s, 'body', 'photos', false)
    expect(anyPartOn(s, 'body')).toBe(false)
  })
  it('ignores a part it does not know', () => {
    const s = {}
    setPart(s, 'body', 'nope', false)
    expect(s.hvModuleParts).toBeUndefined()
  })
  it('the choices survive sync-merge as one field, the newer copy winning', () => {
    const a = { _ts: 100, edited: { hvModuleParts: 100 }, hvModuleParts: { 'body.photos': false } }
    const b = { _ts: 200, edited: { hvModuleParts: 200 }, hvModuleParts: { 'motivation.share': false } }
    expect(mergeStates(a, b).hvModuleParts).toEqual({ 'motivation.share': false })
    expect(mergeStates(b, a).hvModuleParts).toEqual({ 'motivation.share': false })
  })
})
