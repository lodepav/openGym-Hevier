// @vitest-environment happy-dom
// The fork's tabs and screens through seam S2 (hevier/DECISIONS.md D11–D14, D126).
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { hevierRoutes, HevyTabBar } from '../routes.jsx'

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
  it('has three tabs, no Coach, and the fork’s Today wins over upstream’s Home route (D126)', () => {
    render('/home')
    expect(container.querySelector('#upstream-home')).toBeNull()
    expect(container.querySelector('.hv-today-page')).toBeTruthy()
    const tabs = [...container.querySelectorAll('#tabbar > button:not(.hv-resumebar)')].map(b => b.textContent)
    expect(tabs).toEqual(['Today', 'Lifts', 'History'])
    act(() => byText('#tabbar > button', 'Lifts').click())
    expect(path).toBe('/lifts')
    act(() => byText('#tabbar > button', 'History').click())
    expect(path).toBe('/history-tab')
    expect(byText('#tabbar > button', 'History').getAttribute('aria-current')).toBe('page')
    act(() => root.unmount()); container.remove()
    render('/library')
    expect(byText('#tabbar > button', 'Lifts').getAttribute('aria-current')).toBe('page')
  })

  it('Profile goes to History; /workout without a session goes to Today; Routines goes back to Today (D126)', () => {
    render('/profile')
    expect(path).toBe('/history-tab')
    act(() => root.unmount()); container.remove()
    render('/workout')
    expect(path).toBe('/home')
    act(() => root.unmount()); container.remove()
    render('/routines')
    act(() => container.querySelector('.hv-pagebar [aria-label="Today"]').click())
    expect(path).toBe('/home')
  })

  it('a session ended on /workout without going anywhere (another device) lands on Today a tick later', () => {
    vi.useFakeTimers()
    onTestFinished(() => vi.useRealTimers())
    render('/workout', { active: { id: 'a', d: '2026-10-16', start: Date.now(), name: 'Push', cur: 0, entries: [] } })
    act(() => useStore.getState().update(s => { s.active = null }))
    expect(path).toBe('/workout')
    act(() => vi.runAllTimers())
    expect(path).toBe('/home')
  })

  it('Routines: Start Empty Workout opens a session through upstream’s startFlow', () => {
    render('/routines')
    act(() => byText('button', 'Start Empty Workout').click())
    const A = useStore.getState().S.active
    expect(A).toBeTruthy()
    expect(A.entries).toEqual([])
  })

  it('Routines: a routine card starts that routine', () => {
    render('/routines', { routines: [{ id: 'r1', name: 'Push', emoji: '', ex: [{ id: EX, sets: 3, reps: 8 }] }] })
    expect(container.querySelector('.hv-rpreview').textContent).not.toBe('')
    act(() => byText('button', 'Start Routine').click())
    expect(useStore.getState().S.active.entries.map(e => e.id)).toEqual([EX])
  })

  it('a session away from its screen rides above the tabs and resumes', () => {
    render('/history-tab', { active: { id: 'a', d: '2026-10-16', start: Date.now(), name: 'Push', cur: 0, entries: [] } })
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

  it('Exercises is the fork’s list, with a way back to Lifts', () => {
    render('/library')
    expect(container.querySelector('.hv-pk')).toBeTruthy()
    expect(container.querySelector('.hv-pk-check')).toBeNull()
    act(() => container.querySelector('.hv-pagebar [aria-label="Back"]').click())
    expect(path).toBe('/lifts')
  })

  it('the By muscle explorer goes back where it came from, else to Exercises without a new page', () => {
    render('/muscles')
    expect(container.textContent).toContain('Explore muscles')
    act(() => container.querySelector('.hdr .iconbtn').click())
    expect(path).toBe('/library')
  })

  it('a feed card’s ⋯ deletes the workout after upstream’s confirm', () => {
    render('/history-tab', { workouts: [workout('2026-10-14')] })
    act(() => container.querySelector('.hv-wcard .iconbtn[aria-label^="More, "]').click())
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

  it('History: the workouts as feed cards; the weekly chart is on Statistics (D135)', () => {
    // The chart's weeks count back from today: pinned to the week after the workouts.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 21, 12))
    onTestFinished(() => vi.useRealTimers())
    // Records are worked out from the log (D51): the week before sets the bar, this one beats it.
    const before = workout('2026-10-07', { start: 0.5, entries: [{ id: EX, sets: [{ w: 50, r: 8, done: true }] }] })
    const workouts = [before, workout('2026-10-14')]
    render('/history-tab', { workouts })
    expect(container.querySelectorAll('.hv-barcol')).toHaveLength(0)
    const card = container.querySelector('.hv-wcard')
    expect(card.textContent).toContain('Leg Day')
    expect(card.textContent).toContain('2 sets')
    expect(card.querySelector('.hv-wcard-stats .hv-pr').textContent).toBe('4')
    expect(card.querySelector('.hv-wcard-ex .hv-pr').textContent).toBe('4')
    act(() => byText('.hv-hlinks .hv-chip', 'Statistics').click())
    expect(path).toBe('/stats')
    act(() => root.unmount()); container.remove()
    render('/stats', { workouts })
    expect(container.querySelectorAll('.hv-barcol')).toHaveLength(12)
    act(() => byText('.hv-chip', 'Reps').click())
    expect(byText('.hv-chip', 'Reps').getAttribute('aria-pressed')).toBe('true')
    // a tap on a week puts its value in the headline, a second one puts this week back
    const week = [...container.querySelectorAll('button.hv-barcol')].at(-2)
    act(() => week.click())
    expect(container.querySelector('.hv-chart-h b').textContent).toMatch(/^Week of .+: 16 reps$/)
    act(() => week.click())
    expect(container.querySelector('.hv-chart-h b').textContent).toMatch(/this week$/)
  })

  it('the tab you are on, tapped again, scrolls its page to the top (D11, upstream 1.4.4)', () => {
    render('/history-tab')
    const to = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    Object.defineProperty(window, 'scrollY', { value: 900, configurable: true })
    onTestFinished(() => { to.mockRestore(); Object.defineProperty(window, 'scrollY', { value: 0, configurable: true }) })
    act(() => [...container.querySelectorAll('nav button, .tabbar button, button')].find(b => b.textContent === 'History').click())
    expect(path).toBe('/history-tab')
    expect(to).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
  })

  it('a link into one part of upstream’s Stats opens All statistics on it; /stats alone is the fork’s (1.4.4)', () => {
    render('/stats?section=lifts')
    expect(path).toBe('/stats/all')
    act(() => root.unmount()); container.remove()
    render('/stats')
    expect(path).toBe('/stats')
  })
})
