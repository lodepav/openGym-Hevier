// @vitest-environment happy-dom
// Upstream's By muscle explorer through seam S37 (DECISIONS.md D62): it filters by the gym chosen
// in the fork's picker, not by upstream's switch, body weight one of the gym's ticks.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import MuscleExplorer from '../../components/MuscleExplorer.jsx'
import { hooks } from '../hooks.js'
import { explorerFilter, rememberGym } from './gym-filter.js'
import { equipChips, muscleChips } from '../components/EquipGroups.jsx'
import { EQUIP_GROUPS } from './equip-groups.js'
import { EXDB } from '../../lib/exercises.js'

vi.setConfig({ testTimeout: 15000 })
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, host

function render(extra) {
  useStore.setState({ S: Object.assign(structuredClone(DEF), extra), user: null })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(<MuscleExplorer onDetail={() => {}} />))
}
const chestCount = () => Number([...host.querySelectorAll('.chips .chip')].find(b => b.textContent.startsWith('Chest')).querySelector('.dim').textContent)

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  hooks.equipFilter = null
  hooks.equipChips = null
  hooks.muscleChips = null
  localStorage.clear()
})

describe('hevier: muscle explorer by gym (seam S37)', () => {
  it('follows the gym chosen in the picker, whatever upstream’s switch says', () => {
    hooks.equipFilter = explorerFilter
    const equipProfiles = [{ id: 'g1', name: 'Home', equipment: ['dumbbell'], accV: 1, hvBw: 1 }]
    render({ equipProfiles, activeEquipId: 'g1', equipFilterOn: true })
    const all = chestCount()
    expect(host.textContent).not.toContain('Showing what you have')   // no gym chosen: everything
    act(() => root.unmount()); host.remove()
    rememberGym('g1')
    render({ equipProfiles, equipFilterOn: false })
    expect(host.textContent).toContain('Showing what you have in "Home"')
    const home = chestCount()
    expect(home).toBeLessThan(all)
    act(() => root.unmount()); host.remove()
    render({ equipProfiles: [{ ...equipProfiles[0], equipment: ['dumbbell', 'body weight'] }] })
    expect(chestCount()).toBeGreaterThan(home)                        // push-ups are back
  })

  it('its equipment strip is by group, a chevron opening a group’s kinds (D63, seam S38)', () => {
    hooks.equipChips = equipChips
    render({})
    act(() => [...host.querySelectorAll('.chips .chip')].find(b => b.textContent.startsWith('Chest')).click())
    const strip = () => [...host.querySelectorAll('.hv-eqg-chip')]
    const group = label => strip().find(c => c.textContent === label)
    expect(group('Free weights')).toBeTruthy()
    expect(host.querySelector('.hv-eqg-strip')).toBeNull()
    const eqs = () => new Set([...host.querySelectorAll('.list .item .tt')].map(el => EXDB.find(e => e.n === el.textContent)?.eq).filter(Boolean))
    act(() => group('Free weights').querySelector('.hv-eqg-t').click())
    const free = EQUIP_GROUPS.find(g => g.id === 'free').kinds
    expect([...eqs()].every(q => free.includes(q))).toBe(true)
    const count = () => Number(host.querySelector('.search-count').textContent.replace(/\D/g, ''))
    const all = count()
    act(() => group('Free weights').querySelector('.hv-eqg-x').click())
    const kinds = [...host.querySelectorAll('.hv-eqg-strip .chip')]
    expect(kinds.map(k => k.textContent)).toContain('dumbbell')
    act(() => kinds.find(k => k.textContent === 'dumbbell').click())
    expect([...eqs()]).toEqual(['dumbbell'])
    expect(count()).toBeLessThan(all)             // the group held more than its dumbbells
    expect(group('Free weights').className).toContain('some')
  })

  it('its muscle chips are by group, a chevron opening a group’s muscles (D64, seam S39)', () => {
    hooks.muscleChips = muscleChips
    render({})
    const chip = label => [...host.querySelectorAll('.hv-eqg-chip')].find(c => c.querySelector('.hv-eqg-t').firstChild.textContent === label)
    const n = c => Number(c.querySelector('.dim').textContent)
    expect(chip('Biceps')).toBeUndefined()
    const arms = chip('Arms')
    act(() => arms.querySelector('.hv-eqg-t').click())
    expect(host.textContent).toContain('Exercises for Arms')
    act(() => chip('Arms').querySelector('.hv-eqg-x').click())
    const biceps = [...host.querySelectorAll('.hv-eqg-strip .chip')].find(c => c.firstChild.textContent === 'Biceps')
    expect(n(biceps)).toBeLessThan(n(chip('Arms')))
    act(() => biceps.click())
    expect(host.textContent).toContain('Exercises for Biceps')
    expect(chip('Arms').className).toContain('some')
    expect(chip('Shoulders').querySelector('.hv-eqg-x')).toBeNull()      // a group of one
  })
})

