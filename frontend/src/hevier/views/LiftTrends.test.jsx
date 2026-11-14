// @vitest-environment happy-dom
// Profile → Statistics → Lift trends: each recent exercise, Falling, Holding or Rising (D95's read).
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { setNav } from '../../lib/nav.js'
import { EXDB } from '../../lib/exercises.js'
import { todayISO, isoOf } from '../../lib/format.js'
import { hevierRoutes } from '../routes.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const BENCH = EXDB.find(e => /^barbell bench press$/i.test(e.n)).id
const SQUAT = EXDB.find(e => /^barbell full squat$/i.test(e.n)).id
const ago = n => { const d = new Date(todayISO() + 'T12:00:00'); d.setDate(d.getDate() - n); return isoOf(d) }
let k = 0
// Imported-style workouts: no tick times, which the trends do not need.
const day = (n, lifts) => ({ id: 'w' + ++k, d: ago(n), start: 1000 * k, end: 1000 * k + 1,
  entries: Object.entries(lifts).map(([id, w]) => ({ id, sets: [{ w, r: 8, done: true }] })) })
// Bench rises 60 → 66 (+10%, a record 1 day ago); squat falls 100 → 90 (−10%, no record in 15 days).
const log = [day(15, { [BENCH]: 60, [SQUAT]: 100 }), day(8, { [BENCH]: 63, [SQUAT]: 95 }), day(1, { [BENCH]: 66, [SQUAT]: 90 })]

let root, container, path
function Bridge() { const n = useNavigate(); setNav(n); path = useLocation().pathname; return null }
function render(at, workouts = log, extra = {}) {
  const S = structuredClone(DEF)
  S.workouts = workouts
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
const link = () => [...container.querySelectorAll('.hv-linkrow')].find(b => b.textContent.includes('Lift trends'))
const rows = () => [...container.querySelectorAll('.hv-report-row')]

beforeEach(() => { useUI.setState({ sheets: [], toastMsg: '' }) })
afterEach(() => { if (root) act(() => root.unmount()); container?.remove() })

describe('hevier: lift trends page', () => {
  it('Statistics offers it once there is a workout, and not with the part off', () => {
    render('/stats', [])
    expect(link()).toBeUndefined()
    act(() => root.unmount()); container.remove()
    render('/stats', log, { hvModuleParts: { 'hvStats.trends': false } })
    expect(link()).toBeUndefined()
  })

  it('lists Falling first with the 1RM change and the last record, and opens details', () => {
    render('/stats')
    act(() => link().click())
    expect(path).toBe('/lift-trends')
    expect(container.querySelector('.hv-title').textContent).toBe('Lift trends')
    const [squat, bench] = rows()
    expect(squat.textContent).toMatch(/squat/i)
    expect(squat.textContent).toContain('−10% est. 1RM · no record in 15 days')
    expect(squat.querySelector('.hv-lift-state').textContent).toBe('↓Falling')
    expect(squat.querySelector('.hv-trend').getAttribute('aria-hidden')).toBe('true')
    expect(bench.textContent).toContain('+10% est. 1RM · record 1 day ago')
    expect(bench.querySelector('.hv-lift-state').textContent).toBe('↑Rising')
    act(() => squat.click())
    expect(useUI.getState().sheets.length).toBe(1)
  })

  it('leaves the record out with record marks off', () => {
    render('/lift-trends', log, { hvModuleParts: { 'motivation.records': false } })
    expect(rows()[0].querySelector('.small').textContent).toBe('−10% est. 1RM')
  })

  it('says how much history it needs when nothing qualifies', () => {
    render('/lift-trends', log.slice(1))
    expect(rows()).toHaveLength(0)
    expect(container.textContent).toContain('An exercise shows here once you have done it in two workouts of the last 3 weeks')
  })

  it('goes back to Statistics with the part off', () => {
    render('/lift-trends', log, { hvModuleParts: { 'hvStats.trends': false } })
    expect(path).toBe('/stats')
  })
})
