// @vitest-environment happy-dom
// Seam S54 (D97): Settings → Modules lists only the modules whose features the fork shows.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import Settings from '../../views/Settings.jsx'
import { hooks } from '../hooks.js'
import { HIDDEN_MODULES, FORK_MODULES, forkModuleCopy, setAnyModule } from '../lib/fork-modules.js'

vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, container
afterEach(() => { if (root) act(() => root.unmount()); container?.remove(); hooks.hiddenModules = null; hooks.forkModules = hooks.forkModuleCopy = hooks.setModule = null })

function render(patch = {}) {
  useStore.setState({ S: { ...JSON.parse(JSON.stringify(DEF)), ...patch }, user: null, isGuest: () => true })
  container = document.createElement('div'); document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter><Settings page="modules" /></MemoryRouter>))
}
const rows = () => [...container.querySelectorAll('.module-row .lrow-t')].map(e => e.textContent)

describe('hevier: Settings → Modules (S54)', () => {
  it('leaves out Form videos, Watch, Gym check-in, AI Coach and Seasonal themes', () => {
    hooks.hiddenModules = HIDDEN_MODULES
    render()
    expect(rows()).toEqual(['Effort', 'Plates and warm-ups', 'Strength levels', 'Body', 'Health', 'Motivation', 'Integrations'])
  })
  it('counts the modules it lists', () => {
    hooks.hiddenModules = HIDDEN_MODULES
    render({ modules: { body: false, videos: false } })
    expect(container.textContent).toContain('6 of 7 modules on.')
  })
  it('D114: lists the fork’s modules in their groups, and their switches write S.modules', () => {
    Object.assign(hooks, { hiddenModules: HIDDEN_MODULES, forkModules: FORK_MODULES, forkModuleCopy, setModule: setAnyModule })
    render()
    expect(rows()).toEqual(['Effort', 'Plates and warm-ups', 'Strength levels', 'Exercise settings', 'Gyms', 'Body', 'Health', 'Motivation', 'Integrations', 'Statistics extras'])
    const sw = [...container.querySelectorAll('.module-row')].find(r => r.textContent.includes('Gyms')).querySelector('[role="switch"]')
    act(() => sw.click())
    expect(useStore.getState().S.modules.hvGyms).toBe(false)
  })
  it('without the hook it is upstream’s page', () => {
    render()
    expect(rows()).toHaveLength(12)
  })
})
