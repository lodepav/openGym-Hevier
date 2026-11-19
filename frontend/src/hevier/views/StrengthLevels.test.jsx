// @vitest-environment happy-dom
// Lifts → Strength levels: the exercises with levels (D19), by the level reached.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { setNav } from '../../lib/nav.js'
import { EXDB } from '../../lib/exercises.js'
import { hevierRoutes } from '../routes.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const BENCH = EXDB.find(e => /^barbell bench press$/i.test(e.n)).id
const SQUAT = EXDB.find(e => /^barbell full squat$/i.test(e.n)).id
const LV = { lv: [40, 60, 80, 100, 120], u: 'kg', d: '2026-10-01' }
const log = [{ id: 'w1', d: '2026-10-10', start: 1, end: 2, entries: [{ id: BENCH, sets: [{ w: 85, r: 1, done: true }] }] }]

let root, container, path
function Bridge() { const n = useNavigate(); setNav(n); path = useLocation().pathname; return null }
function render(at, extra = {}) {
  const S = structuredClone(DEF)
  S.workouts = log
  Object.assign(S, extra)
  useStore.setState({ S, user: null })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={[at]}>
    <Routes>{hevierRoutes}<Route path="*" element={<div />} /></Routes>
    <Bridge />
  </MemoryRouter>))
}
// Lifts' end link (D140); Statistics has no row for it since D142.
const link = () => [...container.querySelectorAll('.hv-lifts-link')].find(b => b.textContent.includes('Strength levels'))

beforeEach(() => { useUI.setState({ sheets: [], toastMsg: '' }) })
afterEach(() => { if (root) act(() => root.unmount()); container?.remove() })

describe('hevier: strength levels list', () => {
  it('lists each exercise under the level it reaches, unlogged ones last', () => {
    render('/lifts', { hvStrength: { [BENCH]: LV, [SQUAT]: LV } })
    act(() => link().click())
    expect(path).toBe('/strength')
    expect(container.querySelector('.hv-pb-back').getAttribute('aria-label')).toBe('Lifts')
    const secs = [...container.querySelectorAll('h2.sec')].map(h => h.textContent)
    expect(secs).toEqual(['Intermediate · 1', 'No 1RM logged yet · 1'])
    expect(container.textContent).toContain('15 kg to Advanced')
    act(() => container.querySelector('.hv-report-row').click())
    expect(useUI.getState().sheets.length).toBe(1)
  })
  it('with no levels yet, lists the lifts trained to open and set one on', () => {
    render('/strength')
    expect(container.textContent).toContain('No strength levels yet. Open a lift and set its strength level.')
    const rows = [...container.querySelectorAll('.list.hv-flat .hv-report-row')]
    expect(rows.map(r => r.textContent.toLowerCase())).toEqual(['barbell bench press'])
    act(() => rows[0].click())
    expect(useUI.getState().sheets.length).toBe(1)
    // Opened directly, back goes up to Lifts (D142).
    act(() => container.querySelector('.hv-pb-back').click())
    expect(path).toBe('/lifts')
  })
})
