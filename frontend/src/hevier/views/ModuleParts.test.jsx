// @vitest-environment happy-dom
// D102: a module's parts unfold under its row on Settings → Modules (S54), each with its switch.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { hevierRoutes } from '../routes.jsx'
import Settings from '../../views/Settings.jsx'
import { installSettings } from './SettingsRootHevy.jsx'
import { hooks } from '../hooks.js'
import { moduleRow } from './ModuleParts.jsx'
import { HIDDEN_MODULES, FORK_MODULES, forkModuleCopy, setAnyModule } from '../lib/fork-modules.js'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, container, path
function Where() { path = useLocation().pathname; return null }
afterEach(() => {
  if (root) act(() => root.unmount()); container?.remove()
  hooks.settings = hooks.hiddenModules = hooks.forkModules = hooks.forkModuleCopy = hooks.setModule = hooks.moduleRow = null
})

function render(at, patch = {}) {
  Object.assign(hooks, { hiddenModules: HIDDEN_MODULES, forkModules: FORK_MODULES, forkModuleCopy, setModule: setAnyModule, moduleRow })
  useStore.setState({ S: { ...JSON.parse(JSON.stringify(DEF)), ...patch }, user: null, isGuest: () => true })
  container = document.createElement('div'); document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={[at]}><Routes>{hevierRoutes}
    <Route path="/settings/:page" element={<Settings page="modules" />} /><Route path="*" element={<div />} /></Routes><Where /></MemoryRouter>))
}
const row = name => [...container.querySelectorAll('.module-row')].find(r => r.querySelector('.lrow-t').textContent === name)
const partsOf = name => document.getElementById(row(name).querySelector('.hv-modrow-open').getAttribute('aria-controls'))
const titles = el => [...el.querySelectorAll('.lrow-t')].map(e => e.textContent)

describe('hevier: a module’s parts under its row (D102)', () => {
  it('a module with parts is folded, and unfolds its parts’ switches under it', () => {
    render('/settings/modules', { hvModuleParts: { 'body.photos': false } })
    const open = row('Body').querySelector('.hv-modrow-open')
    expect(open.tagName).toBe('BUTTON')
    expect(open.getAttribute('aria-expanded')).toBe('false')
    expect(row('Body').querySelector('.lrow-v').textContent).toBe('2 of 3')
    expect(partsOf('Body').hidden).toBe(true)
    expect(partsOf('Body').querySelectorAll('[role="switch"]')).toHaveLength(0)
    act(() => open.click())
    expect(open.getAttribute('aria-expanded')).toBe('true')
    expect(partsOf('Body').hidden).toBe(false)
    expect(titles(partsOf('Body'))).toEqual(['Body weight', 'Body measurements', 'Progress photos'])
    expect(row('Body').querySelector('.lrow-v')).toBeNull()
    act(() => open.click())
    expect(open.getAttribute('aria-expanded')).toBe('false')
    expect(partsOf('Body').hidden).toBe(true)
  })
  it('a part’s switch writes S.hvModuleParts, and Measures then leaves the part out', () => {
    render('/settings/modules')
    act(() => row('Body').querySelector('.hv-modrow-open').click())
    const sw = [...partsOf('Body').querySelectorAll('[role="switch"]')]
    expect(sw.map(s => s.getAttribute('aria-label'))).toEqual(['Body weight', 'Body measurements', 'Progress photos'])
    act(() => sw[2].click())
    expect(useStore.getState().S.hvModuleParts).toEqual({ 'body.photos': false })
    act(() => root.unmount()); container.remove()
    render('/measures', { hvModuleParts: { 'body.photos': false } })
    expect(container.textContent).toContain('Body measurements')
    expect(container.textContent).not.toContain('Progress photos')
  })
  it('the module’s switch flips the module and does not unfold it', () => {
    render('/settings/modules')
    act(() => row('Strength levels').querySelector('[role="switch"]').click())
    expect(useStore.getState().S.modules.strength).toBe(false)
    expect(row('Strength levels').querySelector('.hv-modrow-open').getAttribute('aria-expanded')).toBe('false')
    expect(row('Strength levels').querySelector('.lrow-v').textContent).toBe('Off')
  })
  it('a module without parts has no disclosure', () => {
    render('/settings/modules')
    expect(row('Effort').querySelector('.hv-modrow-open')).toBeNull()
    expect(row('Effort').querySelector('.lrow-c')).toBeNull()
  })
  it('with the module off its parts are kept but cannot be changed', () => {
    render('/settings/modules', { modules: { motivation: false }, hvModuleParts: { 'motivation.share': false } })
    act(() => row('Motivation').querySelector('.hv-modrow-open').click())
    const sw = [...partsOf('Motivation').querySelectorAll('[role="switch"]')]
    expect(sw.map(s => s.disabled)).toEqual([true, true, true, true, true, true])
    expect(sw.map(s => s.getAttribute('aria-checked'))).toEqual(['true', 'true', 'true', 'true', 'false', 'true'])
    expect(partsOf('Motivation').textContent).toContain('Motivation is off, so all of it is hidden.')
  })
  it('the old "Parts of a module" section is gone, and a module’s old page leads back to Modules', () => {
    installSettings()
    render('/settings/modules')
    expect([...container.querySelectorAll('.sect-t')].map(h => h.textContent)).not.toContain('Parts of a module')
    act(() => root.unmount()); container.remove()
    render('/settings/modules/body')
    expect(path).toBe('/settings/modules')
  })
})
