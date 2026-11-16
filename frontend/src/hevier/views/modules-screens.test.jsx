// @vitest-environment happy-dom
// D97: upstream's Modules switch the fork's screens too.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { hevierRoutes } from '../routes.jsx'
import { todayISO } from '../../lib/format.js'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
let root, container

function render(at, patch = {}) {
  useStore.setState({ S: Object.assign(clone(DEF), { weighIn: false }, patch), user: null, isGuest: () => true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={[at]}><Routes>{hevierRoutes}<Route path="*" element={<div />} /></Routes></MemoryRouter>))
}
const text = () => container.textContent
beforeEach(() => { localStorage.clear(); useUI.setState({ sheets: [], toastMsg: '' }) })
afterEach(() => { if (root) act(() => root.unmount()); container?.remove() })

describe('hevier: Modules in the fork’s screens (D97)', () => {
  it('Today: the streak goes with Motivation (D134)', () => {
    const today = todayISO()
    const workouts = [{ id: 'w1', d: today, start: Date.now() - 3600000, end: Date.now(), entries: [{ id: 'barbell-bench-press', sets: [{ w: 60, r: 8, done: true }] }] }]
    render('/home', { workouts })
    expect(text()).toContain('week streak')
    act(() => root.unmount()); container.remove()
    render('/home', { workouts, modules: { motivation: false } })
    expect(text()).not.toContain('week streak')
  })

  it('History: Body weight goes with Body (D135)', () => {
    const chips = () => [...container.querySelectorAll('.hv-hlinks button')].map(b => b.textContent)
    render('/history-tab')
    expect(chips()).toContain('Body weight')
    act(() => root.unmount()); container.remove()
    render('/history-tab', { modules: { body: false } })
    expect(chips()).not.toContain('Body weight')
    expect(chips()).toContain('Statistics')
  })
})
