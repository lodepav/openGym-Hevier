// @vitest-environment happy-dom
// D97: upstream's Modules switch the fork's screens too.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { hevierRoutes } from '../routes.jsx'
import { WIDGETS } from '../lib/home-layout.js'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
let root, container

function render(at, patch = {}) {
  useStore.setState({ S: Object.assign(clone(DEF), { weighIn: false, hvHome: { order: [...WIDGETS], hidden: [] } }, patch), user: null, isGuest: () => true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={[at]}><Routes>{hevierRoutes}<Route path="*" element={<div />} /></Routes></MemoryRouter>))
}
const text = () => container.textContent
beforeEach(() => { localStorage.clear(); useUI.setState({ sheets: [], toastMsg: '' }) })
afterEach(() => { if (root) act(() => root.unmount()); container?.remove() })

describe('hevier: Modules in the fork’s screens (D97)', () => {
  it('Home: the streak goes with Motivation, the body-weight card with Body, in Edit Home too', () => {
    render('/home')
    expect(text()).toContain('week streak')
    expect(text()).toContain('Body weight')
    act(() => root.unmount()); container.remove()
    render('/home', { modules: { motivation: false, body: false } })
    expect(text()).not.toContain('week streak')
    expect(text()).not.toContain('Body weight')
    act(() => [...container.querySelectorAll('button')].find(b => b.textContent === 'Edit Home').click())
    const rows = [...container.querySelectorAll('.hv-edithome .tt')].map(e => e.textContent)
    expect(rows).not.toContain('Week streak')
    expect(rows).not.toContain('Body weight')
    expect(rows).toContain('Today & this week')
  })
  it('Edit Home offers upstream 1.4.4’s cards as widgets, off until added; a part off takes its card away (D98, D102)', () => {
    render('/home', { hvHome: undefined })
    act(() => [...container.querySelectorAll('button')].find(b => b.textContent === 'Edit Home').click())
    const sw = name => [...container.querySelectorAll('.hv-edithome .item')].find(r => r.querySelector('.tt')?.textContent === name)?.querySelector('[role="switch"]')
    for (const name of ['Workouts left this week', 'Monthly challenges', 'Week and month recap', 'Your year in openGym', 'Recovery tips'])
      expect(sw(name).getAttribute('aria-checked')).toBe('false')
    act(() => root.unmount()); container.remove()
    render('/home', { hvHome: undefined, hvModuleParts: { 'motivation.challenges': false } })
    act(() => [...container.querySelectorAll('button')].find(b => b.textContent === 'Edit Home').click())
    expect(sw('Monthly challenges')).toBeUndefined()
    expect(sw('Week and month recap')).toBeTruthy()
  })

  it('Profile: Measures goes with Body', () => {
    render('/profile')
    expect([...container.querySelectorAll('.hv-dash button, .hv-dash .btn')].map(b => b.textContent).join('|')).toContain('Measures')
    act(() => root.unmount()); container.remove()
    render('/profile', { modules: { body: false } })
    expect([...container.querySelectorAll('.hv-dash button, .hv-dash .btn')].map(b => b.textContent).join('|')).not.toContain('Measures')
  })
})
