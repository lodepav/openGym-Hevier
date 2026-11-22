// @vitest-environment happy-dom
// D102: a module's parts unfold under its row on Settings → Modules (S54), each with its switch.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { isOn } from '../../lib/modules.js'
import { partSwitch } from '../lib/module-parts.js'
import { hevierRoutes } from '../routes.jsx'
import Settings from '../../views/Settings.jsx'
import { installSettings } from './SettingsRootHevy.jsx'
import { hooks } from '../hooks.js'
import { moduleRow, goToModule } from './ModuleParts.jsx'
import { HIDDEN_MODULES, FORK_MODULES, forkModuleCopy, setAnyModule } from '../lib/fork-modules.js'

vi.mock('../flag.js', () => ({ HEVIER: true }))
const hevyExport = vi.hoisted(() => ({ on: true }))
vi.mock('../lib/hevy-export-sync.js', async orig => ({ ...(await orig()), loadExport: () => Promise.resolve({ ...hevyExport }) }))
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
    // The count starts the line, no column of its own (the tenth critique, 2026-11-22).
    expect(row('Body').querySelector('.lrow-s .hv-modcount').textContent).toBe('2 of 3\u00a0·')
    expect(row('Body').querySelector('.lrow-v')).toBeNull()
    expect(open.getAttribute('aria-label')).toBe('Parts of Body, 2 of 3')   // the sixth audit, 2026-11-21
    // The name once, with the button; its line as the button's description (the ninth audit, 2026-11-22).
    expect(row('Body').querySelector('.lrow-m .lrow-t > [aria-hidden="true"]')).not.toBeNull()
    // The count is said once, in the button's name, not again in its description.
    expect(document.getElementById(open.getAttribute('aria-describedby')).textContent).toBe(row('Body').querySelector('.lrow-s').textContent.replace('2 of 3\u00a0· ', ''))
    expect(row('Integrations').querySelector('.lrow-s [id]').textContent).toBe('Send your workouts to Hevy, OpenBite, Home Assistant and AI assistants.')
    expect(partsOf('Body').hidden).toBe(true)
    expect(partsOf('Body').querySelectorAll('[role="switch"]')).toHaveLength(0)
    act(() => open.click())
    expect(open.getAttribute('aria-expanded')).toBe('true')
    expect(partsOf('Body').hidden).toBe(false)
    expect(titles(partsOf('Body'))).toEqual(['Body weight', 'Body measurements', 'Progress photos'])
    expect(row('Body').querySelector('.hv-modcount')).toBeNull()
    expect(open.getAttribute('aria-label')).toBe('Parts of Body')
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
    act(() => row('Motivation').querySelector('[role="switch"]').click())
    expect(useStore.getState().S.modules.motivation).toBe(false)
    expect(row('Motivation').querySelector('.hv-modrow-open').getAttribute('aria-expanded')).toBe('false')
    expect(row('Motivation').querySelector('.hv-modcount').textContent).toBe('Off\u00a0·')
    act(() => row('Motivation').querySelector('[role="switch"]').click())
    expect(row('Motivation').querySelector('.hv-modcount').textContent).toBe('All on\u00a0·')   // the seventh critique, 2026-11-22
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

describe('hevier: a part that also needs another module', () => {
  const partRow = (mod, title) => [...partsOf(mod).querySelectorAll('.lrow')].find(r => r.querySelector('.lrow-t').textContent === title)
  it('is disabled and says what it needs while that module is off, its choice kept', () => {
    render('/settings/modules', { modules: { plates: false, strength: false }, hvModuleParts: { 'hvExercise.plates': true } })
    act(() => row('Exercise settings').querySelector('.hv-modrow-open').click())
    act(() => row('Statistics extras').querySelector('.hv-modrow-open').click())
    const plates = partRow('Exercise settings', 'Plate loading')
    expect(plates.querySelector('.lrow-s').textContent).toBe('Needs Plates and warm-ups')
    expect(plates.querySelector('[role="switch"]').disabled).toBe(true)
    expect(plates.querySelector('[role="switch"]').getAttribute('aria-checked')).toBe('true')
    const levels = partRow('Statistics extras', 'Strength levels list')
    expect(levels.querySelector('.lrow-s').textContent).toBe('Needs Strength levels')
    expect(levels.querySelector('[role="switch"]').disabled).toBe(true)
    expect(partRow('Exercise settings', 'Progression').querySelector('[role="switch"]').disabled).toBe(false)
    // "Needs Strength levels" goes to that module's switch (the eighth critique, 2026-11-22).
    act(() => levels.querySelector('.lrow-s button').click())
    expect(document.activeElement).toBe(container.querySelector('[data-tour="module-strength"] [role="switch"]'))
  })
  it('unfolded, a module drops its line; a part goes to a module and unfolds it (the eighth round, 2026-11-22)', () => {
    render('/settings/modules')
    const open = row('Body').querySelector('.hv-modrow-open')
    expect(row('Body').querySelector('.lrow-m > .lrow-s')).not.toBeNull()
    act(() => open.click())
    expect(row('Body').querySelector('.lrow-m > .lrow-s')).toBeNull()
    act(() => open.click())
    act(() => { expect(goToModule('body')).toBe(true) })
    expect(open.getAttribute('aria-expanded')).toBe('true')
    expect(goToModule('nothing')).toBe(false)
  })
  it('works as before once that module is on', () => {
    render('/settings/modules')
    act(() => row('Exercise settings').querySelector('.hv-modrow-open').click())
    const plates = partRow('Exercise settings', 'Plate loading')
    expect(plates.querySelector('.lrow-s').textContent).toContain('The bar, plates and weight stack')
    act(() => plates.querySelector('[role="switch"]').click())
    expect(useStore.getState().S.hvModuleParts['hvExercise.plates']).toBe(false)
  })
})

// The tenth critique, 2026-11-22: switching off what sends workouts to Hevy says so, with Undo.
describe('hevier: switching off the export to Hevy', () => {
  const flush = () => act(() => new Promise(r => setTimeout(r, 0)))
  const hevy = () => [...partsOf('Integrations').querySelectorAll('.lrow')].find(r => r.querySelector('.lrow-t').textContent === 'Send to Hevy')
  it('the Hevy part off toasts, and Undo turns it back on', async () => {
    useUI.setState({ toastMsg: '', toastAction: null })
    render('/settings/modules')
    act(() => row('Integrations').querySelector('.hv-modrow-open').click())
    act(() => hevy().querySelector('[role="switch"]').click())
    await flush()
    expect(useUI.getState().toastMsg).toBe('New workouts won’t go to Hevy')
    expect(useUI.getState().toastAction.label).toBe('Undo')
    act(() => useUI.getState().runToastAction())
    expect(partSwitch(useStore.getState().S, 'integrations', 'hevy')).toBe(true)
  })
  it('the module’s switch off toasts too, and Undo turns it back on; nothing is said without an export set up', async () => {
    useUI.setState({ toastMsg: '', toastAction: null })
    render('/settings/modules')
    act(() => row('Integrations').querySelector('[role="switch"]').click())
    await flush()
    expect(isOn(useStore.getState().S, 'integrations')).toBe(false)
    expect(useUI.getState().toastMsg).toBe('New workouts won’t go to Hevy')
    act(() => useUI.getState().runToastAction())
    expect(isOn(useStore.getState().S, 'integrations')).toBe(true)
    useUI.setState({ toastMsg: '', toastAction: null })
    hevyExport.on = false
    try {
      act(() => row('Integrations').querySelector('[role="switch"]').click())
      await flush()
      expect(useUI.getState().toastMsg).toBe('')
    } finally { hevyExport.on = true }
  })
  // The review of round 10, 2026-11-22: a sync or a restore that turns it off is not the user's doing.
  it('a change from the store with no tap on the page says nothing', async () => {
    useUI.setState({ toastMsg: '', toastAction: null })
    render('/settings/modules')
    act(() => useStore.getState().update(s => { setAnyModule(s, 'integrations', false) }))
    await flush()
    expect(isOn(useStore.getState().S, 'integrations')).toBe(false)
    expect(useUI.getState().toastMsg).toBe('')
  })
})
