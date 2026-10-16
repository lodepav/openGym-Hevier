// @vitest-environment happy-dom
// The fork's tabs and screens through seam S2 (hevier/DECISIONS.md D11–D14).
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { hevierRoutes, HevyTabBar } from '../routes.jsx'
import { HOME_KEY } from '../lib/home-layout.js'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const EX = EXDB.find(e => /barbell/i.test(e.eq || '')).id
let root, container, path

function Where() { path = useLocation().pathname; return null }

function render(at, patch = {}) {
  const S = Object.assign(clone(DEF), { weighIn: false }, patch)
  useStore.setState({ S, user: null, isGuest: () => true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={[at]}>
    <Routes>
      {hevierRoutes}
      <Route path="/home" element={<div id="upstream-home" />} />
      <Route path="*" element={<div id="elsewhere" />} />
    </Routes>
    <HevyTabBar /><Where />
  </MemoryRouter>))
}
const byText = (sel, text) => [...container.querySelectorAll(sel)].find(b => b.textContent.includes(text))
const workout = (d, extra = {}) => ({ id: 'w' + d, d, name: 'Leg Day', start: 1, end: 1 + 3600000, vol: 1200,
  entries: [{ id: EX, sets: [{ w: 60, r: 8, done: true }, { w: 60, r: 8, done: true }] }], ...extra })

beforeEach(() => {
  localStorage.clear()
  useUI.setState({ sheets: [], toastMsg: '', timer: null, work: null })
})
afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
})

describe('hevier: navigation (seam S2)', () => {
  it('has three tabs, no Coach, and the fork’s Home wins over upstream’s route', () => {
    render('/home')
    expect(container.querySelector('#upstream-home')).toBeNull()
    expect(container.querySelector('.hv-home')).toBeTruthy()
    const tabs = [...container.querySelectorAll('#tabbar > button:not(.hv-resumebar)')].map(b => b.textContent)
    expect(tabs).toEqual(['Home', 'Workout', 'Profile'])
  })

  it('Workout tab: Start Empty Workout opens a session through upstream’s startFlow', () => {
    render('/workout')
    act(() => byText('button', 'Start Empty Workout').click())
    const A = useStore.getState().S.active
    expect(A).toBeTruthy()
    expect(A.entries).toEqual([])
  })

  it('Workout tab: a routine card starts that routine', () => {
    render('/workout', { routines: [{ id: 'r1', name: 'Push', emoji: '', ex: [{ id: EX, sets: 3, reps: 8 }] }] })
    expect(container.querySelector('.hv-rpreview').textContent).not.toBe('')
    act(() => byText('button', 'Start Routine').click())
    expect(useStore.getState().S.active.entries.map(e => e.id)).toEqual([EX])
  })

  it('a session away from its screen rides above the tabs and resumes', () => {
    render('/profile', { active: { id: 'a', d: '2026-10-16', start: Date.now(), name: 'Push', cur: 0, entries: [] } })
    const bar = container.querySelector('.hv-resumebar')
    expect(bar.textContent).toContain('Workout in progress')
    expect(document.body.classList.contains('hv-resume')).toBe(true)
    act(() => bar.querySelector('.hv-resume-go').click())
    expect(path).toBe('/workout')
  })

  it('the resume bar discards through upstream’s confirm', () => {
    render('/home', { active: { id: 'a', d: '2026-10-16', start: Date.now(), name: 'Push', cur: 0, entries: [] } })
    act(() => container.querySelector('.hv-resume-x').click())
    const sheet = useUI.getState().sheets.at(-1)
    expect(sheet).toBeTruthy()
    expect(useStore.getState().S.active).toBeTruthy()
    // the confirm's own button, rendered from the sheet
    const host = document.createElement('div')
    const r2 = createRoot(host)
    act(() => r2.render(sheet.render(() => {})))
    act(() => [...host.querySelectorAll('button')].find(b => b.textContent === 'Discard').click())
    act(() => r2.unmount())
    expect(useStore.getState().S.active).toBeNull()
  })

  it('Exercises is the fork’s list, with a way back to Profile', () => {
    render('/library')
    expect(container.querySelector('.hv-pk')).toBeTruthy()
    expect(container.querySelector('.hv-pk-check')).toBeNull()
    act(() => container.querySelector('.hv-pagebar [aria-label="Back"]').click())
    expect(path).toBe('/profile')
  })

  it('a feed card’s ⋯ deletes the workout after upstream’s confirm', () => {
    render('/profile', { workouts: [workout('2026-10-14')] })
    act(() => container.querySelector('.hv-wcard .iconbtn').click())
    const menu = useUI.getState().sheets.at(-1)
    const host = document.createElement('div')
    const r2 = createRoot(host)
    act(() => r2.render(menu.render(() => {})))
    const rows = [...host.querySelectorAll('.menu-item')]
    expect(rows.map(b => b.textContent)).toEqual(['Save as routine', 'Repeat today', 'Edit workout', 'Delete workout'])
    act(() => rows[3].click())
    act(() => r2.unmount())
    const confirm = useUI.getState().sheets.at(-1)
    const r3 = createRoot(host)
    act(() => r3.render(confirm.render(() => {})))
    act(() => [...host.querySelectorAll('button')].find(b => b.textContent === 'Delete').click())
    act(() => r3.unmount())
    expect(useStore.getState().S.workouts).toEqual([])
  })

  it('Profile: dashboard, weekly chart and the workouts as feed cards', () => {
    render('/profile', { workouts: [workout('2026-10-14', { prs: [EX] })] })
    expect(container.querySelectorAll('.hv-dash .btn')).toHaveLength(4)
    expect(container.querySelectorAll('.hv-barcol')).toHaveLength(12)
    const card = container.querySelector('.hv-wcard')
    expect(card.textContent).toContain('Leg Day')
    expect(card.textContent).toContain('2 sets')
    expect(card.querySelector('.hv-pr').textContent).toBe('1')
    act(() => byText('.hv-chip', 'Reps').click())
    expect(byText('.hv-chip', 'Reps').getAttribute('aria-pressed')).toBe('true')
    act(() => byText('.hv-dash .btn', 'Statistics').click())
    expect(path).toBe('/stats')
  })

  it('Edit Home switches widgets on and off, device-locally or through upstream’s switch', () => {
    render('/home')
    expect(container.textContent).not.toContain('week streak')
    act(() => byText('button', 'Edit Home').click())
    const row = name => [...container.querySelectorAll('.hv-edithome .item')].find(r => r.textContent.includes(name))
    // both in one tick: the second must not undo the first
    act(() => {
      row('Week streak').querySelector('[role="switch"]').click()
      row('Body weight').querySelector('[role="switch"]').click()
    })
    expect(row('Workouts').querySelector('[role="switch"]')).toBeNull()
    act(() => byText('button', 'Done').click())
    expect(container.textContent).toContain('week streak')
    expect(useStore.getState().S.showWeightCard).toBe(false)
    expect(JSON.parse(localStorage.getItem(HOME_KEY)).hidden).not.toContain('streak')
  })
})
