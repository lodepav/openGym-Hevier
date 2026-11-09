// @vitest-environment happy-dom
// D102: a module's page with a switch per part, and the section under Settings → Modules that opens it.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { hevierRoutes } from '../routes.jsx'
import Settings from '../../views/Settings.jsx'
import { installSettings } from './SettingsRootHevy.jsx'
import { hooks } from '../hooks.js'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, container, path
function Where() { path = useLocation().pathname; return null }
afterEach(() => { if (root) act(() => root.unmount()); container?.remove(); hooks.settings = null })

function render(at, patch = {}) {
  useStore.setState({ S: { ...JSON.parse(JSON.stringify(DEF)), ...patch }, user: null, isGuest: () => true })
  container = document.createElement('div'); document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={[at]}><Routes>{hevierRoutes}
    <Route path="/settings/:page" element={<Settings page="modules" />} /><Route path="*" element={<div />} /></Routes><Where /></MemoryRouter>))
}
const titles = () => [...container.querySelectorAll('.lrow-t')].map(e => e.textContent)

describe('hevier: a switch per part (D102)', () => {
  it('Body’s page switches a part, which Measures then leaves out', () => {
    render('/settings/modules/body')
    expect(titles()).toEqual(['Body weight', 'Body measurements', 'Progress photos'])
    const sw = [...container.querySelectorAll('[role="switch"]')]
    expect(sw.map(s => s.getAttribute('aria-checked'))).toEqual(['true', 'true', 'true'])
    act(() => sw[2].click())
    expect(useStore.getState().S.hvModuleParts).toEqual({ 'body.photos': false })
    act(() => root.unmount()); container.remove()
    render('/measures', { hvModuleParts: { 'body.photos': false } })
    expect(container.textContent).toContain('Body measurements')
    expect(container.textContent).not.toContain('Progress photos')
  })
  it('with the module off the switches are kept but cannot be changed', () => {
    render('/settings/modules/motivation', { modules: { motivation: false }, hvModuleParts: { 'motivation.share': false } })
    expect(container.textContent).toContain('is off, so all of it is hidden')
    const sw = [...container.querySelectorAll('[role="switch"]')]
    expect(sw.map(s => s.disabled)).toEqual([true, true, true, true, true, true])
    expect(sw.map(s => s.getAttribute('aria-checked'))).toEqual(['true', 'true', 'true', 'true', 'false', 'true'])
  })
  it('a module without parts has no page', () => {
    render('/settings/modules/effort')
    expect(path).toBe('/settings/modules')
  })
  it('Settings → Modules lists the modules with parts, each opening its page', () => {
    installSettings()
    render('/settings/modules', { hvModuleParts: { 'body.photos': false } })
    const sect = [...container.querySelectorAll('.sect-t')].find(h => h.textContent === 'Parts of a module')
    expect(sect).toBeTruthy()
    expect(titles()).toEqual(expect.arrayContaining(['Strength levels', 'Body', 'Health', 'Motivation']))
    expect(container.textContent).toContain('2 of 3')
    const body = [...container.querySelectorAll('.lrow')].filter(r => r.querySelector('.lrow-t')?.textContent === 'Body').at(-1)
    act(() => body.click())
    expect(path).toBe('/settings/modules/body')
  })
})
