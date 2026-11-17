// @vitest-environment happy-dom
// M6: Hevy's Statistics and Measures pages, and the way back from upstream's pages under them
// (hevier/DECISIONS.md D14).
import React, { act } from 'react'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { todayISO, isoOf } from '../../lib/format.js'
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
  it('Statistics: the last 7 days, and upstream’s statistics behind a row; the sets per muscle are not here', () => {
    render(['/history-tab', '/stats'], { workouts: [workout(todayISO())] })
    expect(container.querySelectorAll('.hv-day')).toHaveLength(7)
    expect(container.querySelector('.hv-day.today.on')).toBeTruthy()
    expect(container.querySelector('.bodymap, svg')).toBeTruthy()
    expect(container.querySelector('.hv-mset, .hv-wsets')).toBeFalsy()
    act(() => byText('.hv-linkrow', 'All statistics').click())
    expect(path).toBe('/stats/all')
    expect(container.querySelector('.hv-allstats .hv-pb-back').getAttribute('aria-label')).toBe('Statistics')
    expect(container.querySelector('.hv-allstats .hv-title').textContent).toBe('All statistics')
  })

  // D135 (2026-11-17): hevier.css hides upstream's week streak card on All statistics; happy-dom
  // applies no stylesheet, so the rule's selector is run here against the page as drawn.
  it('All statistics: hevier.css hides upstream’s week streak card', () => {
    render(['/stats/all'], { workouts: [workout(todayISO())] })
    const card = container.querySelector('[data-streak-card]')
    expect(card).toBeTruthy()
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../hevier.css'), 'utf8')
    const sel = css.match(/:root\[data-ui="hevier"\] (\.hv-allstats ~ [^{]*\[data-streak-card\])\{display:none\}/)?.[1]
    expect(sel).toBeTruthy()
    expect(container.querySelector(sel)).toBe(card)
  })

  it('Sets per muscle is a page of its own, a row on Statistics: the counts by period, back to Statistics', () => {
    render(['/stats'], { workouts: [workout(todayISO())] })
    act(() => byText('.hv-linkrow', 'Sets per muscle').click())
    expect(path).toBe('/muscle-sets')
    expect(container.querySelector('.hv-title').textContent).toBe('Sets per muscle')
    expect(byText('.hv-mset', 'Chest').querySelector('b').textContent).not.toBe('0')
    act(() => byText('.hv-chip', 'Year').click())
    expect(byText('.hv-chip', 'Year').getAttribute('aria-pressed')).toBe('true')
    expect(byText('.hv-mset', 'Chest')).toBeTruthy()
    expect(container.querySelector('.hv-pb-back').getAttribute('aria-label')).toBe('Statistics')
  })

  it('Weekly sets per muscle: how many past weeks each muscle was in range', () => {
    const back = n => { const d = new Date(todayISO() + 'T12:00:00'); d.setDate(d.getDate() - 7 * n); return isoOf(d) }
    render(['/muscle-sets'], { muscleTargets: { chest: [2, 4] }, workouts: [workout(back(2)), { ...workout(back(1)), id: 'w1' }] })
    const chest = [...container.querySelectorAll('.hv-wsets .sbar-row')].find(r => r.textContent.startsWith('Chest'))
    expect(chest.querySelector('.hv-wsets-past').textContent).toBe('2/2')
    expect(chest.getAttribute('aria-label')).toContain('In range 2 of 2 weeks')
  })

  it('an empty history says so instead of an empty map', () => {
    render(['/stats'])
    expect(container.textContent).toContain('No workouts in the last 7 days.')
    act(() => byText('.hv-linkrow', 'Sets per muscle').click())
    expect(container.textContent).toContain('No sets in this period yet.')
  })

  it('upstream’s ?focus= links land on upstream’s statistics', () => {
    render(['/stats?focus=weekly-volume'])
    expect(path).toBe('/stats/all')
    expect(search).toBe('?focus=weekly-volume')
  })

  it('Measures: body weight with upstream’s log, then measurements and photos', () => {
    render(['/history-tab', '/measures'], { bodyweight: [{ d: todayISO(), t: Date.now(), w: 80 }] })
    expect(container.querySelector('.big').textContent).toContain('80')
    expect(container.querySelector('[aria-current="page"], .on, .active')?.textContent).toContain('History')
    act(() => byText('button', 'Log').click())
    expect(useUI.getState().sheets).toHaveLength(1)
    act(() => byText('.hv-linkrow', 'Body measurements').click())
    expect(path).toBe('/measurements')
  })

  it('upstream’s own ‹ on a page under Measures goes back there, not to Home', () => {
    render(['/history-tab', '/measures', '/measurements'])
    act(() => container.querySelector('.hdr > .iconbtn').click())
    expect(path).toBe('/measures')
  })

  it('… and opened directly, falls back to the fork page above it', () => {
    render(['/progress-photos'])
    act(() => container.querySelector('.hdr > .iconbtn').click())
    expect(path).toBe('/measures')
  })

  it('… and Muscle balance goes back to Statistics (review S3: these fail if upstream’s header changes)', () => {
    render(['/structural-balance'])
    act(() => container.querySelector('.hdr > .iconbtn').click())
    expect(path).toBe('/stats')
  })
})
