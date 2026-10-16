// @vitest-environment happy-dom
// M6: Hevy's Statistics and Measures pages, and the way back from upstream's pages under them
// (hevier/DECISIONS.md D14).
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { todayISO } from '../../lib/format.js'
import { hevierRoutes, HevyTabBar } from '../routes.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const BENCH = EXDB.find(e => /bench press/i.test(e.n) && /barbell/i.test(e.eq || '')).id
let root, container, path, search

function Where() { const l = useLocation(); path = l.pathname; search = l.search; return null }

function render(entries, patch = {}) {
  const S = Object.assign(clone(DEF), { weighIn: false }, patch)
  useStore.setState({ S, user: null, isGuest: () => true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
    <Routes>{hevierRoutes}<Route path="*" element={<div id="elsewhere" />} /></Routes><HevyTabBar /><Where />
  </MemoryRouter>))
}
const byText = (sel, text) => [...container.querySelectorAll(sel)].find(b => b.textContent.includes(text))
const workout = d => ({ id: 'w' + d, d, name: 'Push', start: 1, end: 3600001, vol: 960,
  entries: [{ id: BENCH, sets: [{ w: 60, r: 8, done: true }, { w: 60, r: 8, done: true }] }] })

beforeEach(() => { localStorage.clear(); useUI.setState({ sheets: [], toastMsg: '', timer: null, work: null }) })
afterEach(() => { if (root) act(() => root.unmount()); container?.remove() })

describe('hevier: Statistics and Measures (M6)', () => {
  it('Statistics: the last 7 days, sets per muscle by period, and upstream’s statistics behind a row', () => {
    render(['/profile', '/stats'], { workouts: [workout(todayISO())] })
    expect(container.querySelectorAll('.hv-day')).toHaveLength(7)
    expect(container.querySelector('.hv-day.today.on')).toBeTruthy()
    expect(container.querySelector('.bodymap, svg')).toBeTruthy()
    const chest = byText('.hv-mset', 'Chest')
    expect(chest.querySelector('b').textContent).not.toBe('0')
    act(() => byText('.hv-chip', 'Year').click())
    expect(byText('.hv-chip', 'Year').getAttribute('aria-pressed')).toBe('true')
    expect(byText('.hv-mset', 'Chest')).toBeTruthy()
    act(() => byText('.hv-linkrow', 'All statistics').click())
    expect(path).toBe('/stats/all')
    expect(byText('.hv-back', 'Statistics')).toBeTruthy()
  })

  it('an empty history says so instead of an empty map', () => {
    render(['/stats'])
    expect(container.textContent).toContain('No workouts in the last 7 days.')
    expect(container.textContent).toContain('No sets in this period yet.')
  })

  it('upstream’s ?focus= links land on upstream’s statistics', () => {
    render(['/stats?focus=weekly-volume'])
    expect(path).toBe('/stats/all')
    expect(search).toBe('?focus=weekly-volume')
  })

  it('Measures: body weight with upstream’s log, then measurements and photos', () => {
    render(['/profile', '/measures'], { bodyweight: [{ d: todayISO(), t: Date.now(), w: 80 }] })
    expect(container.querySelector('.big').textContent).toContain('80')
    expect(container.querySelector('[aria-current="page"], .on, .active')?.textContent).toContain('Profile')
    act(() => byText('button', 'Log').click())
    expect(useUI.getState().sheets).toHaveLength(1)
    act(() => byText('.hv-linkrow', 'Body measurements').click())
    expect(path).toBe('/measurements')
  })

  it('upstream’s own ‹ on a page under Measures goes back there, not to Home', () => {
    render(['/profile', '/measures', '/measurements'])
    act(() => container.querySelector('.hdr > .iconbtn').click())
    expect(path).toBe('/measures')
  })

  it('… and opened directly, falls back to the fork page above it', () => {
    render(['/progress-photos'])
    act(() => container.querySelector('.hdr > .iconbtn').click())
    expect(path).toBe('/measures')
  })
})
