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
})
