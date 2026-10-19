// @vitest-environment happy-dom
// Workout Detail through seam S14 (reference/SCREENS.md §4): upstream's workoutDetailSheet opens
// the fork's page, which reads the saved workout back; ⋯ → All details is upstream's sheet.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { setNav } from '../../lib/nav.js'
import { workoutDetailSheet } from '../../sheets.jsx'
import { hevierRoutes } from '../routes.jsx'
import { hooks } from '../hooks.js'
import { installWorkoutDetail, DETAIL_PATH } from './WorkoutDetail.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const BENCH = EXDB.find(e => /^barbell bench press$/i.test(e.n))
const start = new Date('2026-10-10T18:00:00').getTime()
const W = {
  id: 'w1', d: '2026-10-10', start, end: start + 3600000, name: 'Push Day', note: 'Felt strong', vol: 1440,
  entries: [{ id: BENCH.id, target: { sets: 3, reps: 8 }, sets: [
    { w: 40, r: 10, done: true, phase: 'warmup' }, { w: 60, r: 8, done: true }, { w: 60, r: 8, done: true }, { w: 60, r: 8, done: false },
  ] }],
}
let root, container, path

function Bridge() { const n = useNavigate(); setNav(n); path = useLocation().pathname; return null }

function render() {
  const S = clone(DEF)
  // The week before sets the bar the workout beats (D51).
  S.workouts = [{ id: 'w0', d: '2026-10-03', start: start - 7 * 86400000, entries: [{ id: BENCH.id, sets: [{ w: 55, r: 8, done: true }] }] }, clone(W)]
  useStore.setState({ S, user: null })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={['/home']}>
    <Routes>{hevierRoutes}<Route path="*" element={<div id="elsewhere" />} /></Routes>
    <Bridge />
  </MemoryRouter>))
}

beforeEach(() => { useUI.setState({ sheets: [], toastMsg: '' }); installWorkoutDetail() })
afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  hooks.workoutDetail = null
})

describe('hevier: Workout Detail (seam S14)', () => {
  it('Edit Workout, then Save or ✕, comes back to this page, not upstream’s History', () => {
    render()
    act(() => workoutDetailSheet(W))
    act(() => container.querySelector('.hv-wd-edit').click())
    expect(path).toBe('/workout')
    act(() => container.querySelector('.hv-finish').click())
    expect(useStore.getState().S.active).toBeNull()
    expect(path).toBe(DETAIL_PATH)
    act(() => container.querySelector('.hv-wd-edit').click())
    act(() => container.querySelector('[aria-label="Close editor"]').click())
    expect(useStore.getState().S.active).toBeNull()
    expect(path).toBe(DETAIL_PATH)
  })

  it('opens the fork’s page instead of upstream’s sheet', () => {
    render()
    act(() => workoutDetailSheet(W))
    expect(path).toBe(DETAIL_PATH)
    expect(useUI.getState().sheets).toHaveLength(0)
    const page = container.querySelector('.hv-wd')
    expect(page.querySelector('.hv-wd-t').textContent).toBe('Push Day')
    expect(page.textContent).toContain('Felt strong')
    expect(page.textContent).toContain('Muscle Split')
    expect(page.querySelector('.hv-name').textContent).toBe(BENCH.n)
    expect(page.querySelector('.hv-wd-row .hv-pr')).toBeTruthy()
  })

  it('lists the ticked sets, the warm-up as W', () => {
    render()
    act(() => workoutDetailSheet(W))
    const rows = [...container.querySelectorAll('.hv-wd-row:not(.hv-wd-th)')].map(r => r.firstChild.textContent)
    expect(rows).toEqual(['W', '1', '2'])
    // Each record is on the set that made it (the first at 60), named; the session's volume on the exercise.
    const prRows = [...container.querySelectorAll('.hv-wd-row')].filter(r => r.querySelector('.hv-pr'))
    expect(prRows.map(r => r.firstChild.textContent)).toEqual(['1'])
    expect(prRows[0].querySelector('.hv-pr').textContent).toBe('Heaviest Weight · Best 1RM · Best Set Volume')
    expect(container.querySelector('.hv-exhd .hv-pr').textContent).toBe('Best Session Volume')
    expect([...container.querySelectorAll('.hv-stats div')].find(d => d.textContent.startsWith('Records')).textContent).toBe('Records4')
    const sets = [...container.querySelectorAll('.hv-stats div')].find(d => d.textContent.startsWith('Sets'))
    expect(sets.querySelector('b').textContent).toBe('2')
  })

  it('marks each work set against the same set last time (D66)', () => {
    render()
    act(() => workoutDetailSheet(W))
    const trend = n => [...container.querySelectorAll('.hv-wd-row')].find(r => r.firstChild.textContent === n)?.querySelector('.hv-trend')
    expect(trend('W')).toBeNull()                       // warm-ups are not compared
    expect(trend('1').className).toContain('up')        // 60 × 8 against 55 × 8
    expect(trend('1').getAttribute('aria-label')).toBe('Better than last time')
    expect(trend('2')).toBeNull()                       // last time had one set
  })

  it('⋯ → All details opens upstream’s sheet', () => {
    render()
    act(() => workoutDetailSheet(W))
    act(() => container.querySelector('.hv-pagebar [aria-label="More"]').click())
    const menu = useUI.getState().sheets.at(-1)
    const host = document.createElement('div')
    const r2 = createRoot(host)
    act(() => r2.render(menu.render(() => {})))
    const all = [...host.querySelectorAll('.menu-item')].find(i => i.textContent.includes('All details'))
    act(() => all.click())
    expect(useUI.getState().sheets.length).toBeGreaterThan(0)
    act(() => r2.unmount())
  })

  it('goes home when the workout is gone', () => {
    render()
    act(() => workoutDetailSheet(W))
    act(() => useStore.getState().update(s => { s.workouts = [] }))
    expect(path).toBe('/home')
  })
})
