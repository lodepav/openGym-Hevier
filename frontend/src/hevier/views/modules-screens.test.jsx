// @vitest-environment happy-dom
// D97: upstream's Modules switch the fork's screens too.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { hevierRoutes } from '../routes.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
let root, container

function render(at, patch = {}) {
  useStore.setState({ S: Object.assign(clone(DEF), { weighIn: false, hvHome: { order: [], hidden: [] } }, patch), user: null, isGuest: () => true })
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
  it('Profile: Measures goes with Body', () => {
    render('/profile')
    expect([...container.querySelectorAll('.hv-dash button, .hv-dash .btn')].map(b => b.textContent).join('|')).toContain('Measures')
    act(() => root.unmount()); container.remove()
    render('/profile', { modules: { body: false } })
    expect([...container.querySelectorAll('.hv-dash button, .hv-dash .btn')].map(b => b.textContent).join('|')).not.toContain('Measures')
  })
})
