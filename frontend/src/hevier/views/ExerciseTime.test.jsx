// @vitest-environment happy-dom
// Profile → Statistics → Exercise time (D88): each exercise's average time a session, sorted and grouped.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { setNav } from '../../lib/nav.js'
import { EXDB } from '../../lib/exercises.js'
import { todayISO } from '../../lib/format.js'
import { hevierRoutes } from '../routes.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const BENCH = EXDB.find(e => /^barbell bench press$/i.test(e.n)).id
const SQUAT = EXDB.find(e => /^barbell full squat$/i.test(e.n)).id
const MIN = 60000
const start = new Date(todayISO() + 'T08:00:00').getTime()
const set = min => ({ w: 60, r: 8, done: true, at: start + min * MIN })
// Bench 10 min, then squat 15 min at City Gym; an imported workout with no tick times.
const log = [
  { id: 'w1', d: todayISO(), start, end: start + 40 * MIN, entries: [
    { id: BENCH, hvGym: 'g1', sets: [set(5), set(10)] },
    { id: SQUAT, hvGym: 'g1', sets: [set(18), set(25)] },
  ] },
  { id: 'iw1', d: todayISO(), start, end: start + 40 * MIN, entries: [{ id: BENCH, sets: [{ w: 60, r: 8, done: true }] }] },
]

let root, container, path
function Bridge() { const n = useNavigate(); setNav(n); path = useLocation().pathname; return null }
function render(at, workouts = log) {
  const S = structuredClone(DEF)
  S.workouts = workouts
  S.equipProfiles = [{ id: 'g1', name: 'City Gym', items: [] }]
  useStore.setState({ S, user: null })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={[at]}>
    <Routes>{hevierRoutes}<Route path="*" element={<div />} /></Routes>
    <Bridge />
  </MemoryRouter>))
}
// Statistics' Exercise time card and its All link (D142).
const link = () => container.querySelector('[data-card="time"] .hv-scard-h button')
const chip = text => [...container.querySelectorAll('.hv-chip')].find(b => b.textContent === text)
const names = () => [...container.querySelectorAll('.hv-report-row b:first-child')].map(b => b.textContent)

beforeEach(() => { useUI.setState({ sheets: [], toastMsg: '' }) })
afterEach(() => { if (root) act(() => root.unmount()); container?.remove() })

describe('hevier: exercise time page', () => {
  it('Statistics offers it only once a workout has set times', () => {
    render('/stats', [log[1]])
    expect(link()).toBeNull()
    expect(container.querySelector('[data-tile="time"]')).toBeNull()
  })

  it('Statistics: a workout’s exercise time on its tile, the longest exercises on its card', () => {
    render('/stats')
    expect(container.querySelector('[data-tile="time"]').getAttribute('aria-label')).toBe('Exercise time, 25min a workout on average')
    expect(container.querySelector('[data-tile="time"] .hv-stile-s').textContent).toBe('a workout, on average')
    expect([...container.querySelectorAll('[data-card="time"] .hv-scard-row')].map(r => r.textContent)).toEqual([
      expect.stringMatching(/squat.*15min$/i), expect.stringMatching(/bench.*10min$/i)])
    act(() => container.querySelector('[data-tile="time"]').click())
    expect(path).toBe('/exercise-time')
  })

  it('lists the exercises longest first, turns round, and groups by gym or muscle', () => {
    render('/stats')
    act(() => link().click())
    expect(path).toBe('/exercise-time')
    expect(names()).toEqual(['Barbell Full Squat', 'Barbell Bench Press'].map(n => expect.stringMatching(new RegExp(n, 'i'))))
    expect(container.textContent).toContain('15min')
    expect(container.textContent).toContain('1 session · 10min total')
    act(() => chip('Longest first').click())
    expect(names()[0]).toMatch(/bench/i)
    act(() => chip('Gym').click())
    expect([...container.querySelectorAll('h2.sec')].map(h => h.textContent)).toEqual(['City Gym · 25min total'])
    act(() => chip('Muscle').click())
    expect(chip('Gym').getAttribute('aria-pressed')).toBe('false')
    expect(container.querySelectorAll('h2.sec')).toHaveLength(2)
    act(() => container.querySelector('.hv-report-row').click())
    expect(useUI.getState().sheets.length).toBe(1)
  })

  it('shows the typical time between sets against the rest set, with five gaps or more, grouped too', () => {
    // Bench: six sets 2:30 apart (five gaps) at the default rest of 1:30; squat only two sets.
    const w = { ...log[0], end: start + 60 * MIN, entries: [
      { id: BENCH, hvGym: 'g1', sets: [5, 7.5, 10, 12.5, 15, 17.5].map(set) },
      { id: SQUAT, hvGym: 'g1', sets: [set(20), set(25)] },
    ] }
    render('/exercise-time', [w])
    const row = name => [...container.querySelectorAll('.hv-report-row')].find(b => new RegExp(name, 'i').test(b.textContent))
    expect(row('bench').textContent).toContain('Between sets 2:30 · rest set to 1:30')
    expect(row('squat').textContent).not.toContain('Between sets')
    act(() => chip('Gym').click())
    expect(row('bench').textContent).toContain('Between sets 2:30')
  })
})
