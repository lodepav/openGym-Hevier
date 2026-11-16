// @vitest-environment happy-dom
// History → Calendar and Lifts → All exercises (reference/SCREENS.md §8, §11).
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { setNav } from '../../lib/nav.js'
import { todayISO } from '../../lib/format.js'
import { hevierRoutes } from '../routes.jsx'
import { hooks } from '../hooks.js'
import { installWorkoutDetail, DETAIL_PATH } from './WorkoutDetail.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const today = todayISO()
const start = new Date(today + 'T10:00:00').getTime()
let root, container, path

function Bridge() { const n = useNavigate(); setNav(n); path = useLocation().pathname; return null }

function render(at, workouts = []) {
  const S = structuredClone(DEF)
  S.workouts = workouts
  useStore.setState({ S, user: null })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={[at]}>
    <Routes>{hevierRoutes}<Route path="*" element={<div id="elsewhere" />} /></Routes>
    <Bridge />
  </MemoryRouter>))
}
const click = el => act(() => el.click())
const byText = (sel, text) => [...container.querySelectorAll(sel)].find(b => b.textContent === text)

beforeEach(() => { useUI.setState({ sheets: [], toastMsg: '' }); installWorkoutDetail() })
afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  hooks.workoutDetail = null
})

describe('hevier: Calendar', () => {
  const w = { id: 'w1', d: today, start, end: start + 3600000, name: 'Leg Day', entries: [] }

  it('the month counts workouts, two on one day as two', () => {
    render('/calendar', [w, { ...w, id: 'w2', start: start + 7200000, end: start + 9000000 }])
    expect([...container.querySelectorAll('.hv-cal-mt span')].some(x => x.textContent === '2 workouts')).toBe(true)
  })

  it('fills today when trained and shows the streak', () => {
    render('/calendar', [w])
    const day = container.querySelector('.hv-cal-d.done')
    expect(day.textContent).toBe(String(Number(today.slice(8))))
    expect(day.classList.contains('today')).toBe(true)
    expect(container.querySelector('.hv-cal-streak').textContent).toContain('1 week streak')
    expect(container.querySelector('.hv-cal-streak').textContent).toContain('0 rest days')
  })

  it('a trained day opens its workout, another day upstream’s day sheet', () => {
    render('/calendar', [w])
    click(container.querySelector('.hv-cal-d.done'))
    expect(path).toBe(DETAIL_PATH)
    render('/calendar', [w])
    click(container.querySelector('.hv-cal-d:not(.done)'))
    expect(useUI.getState().sheets).toHaveLength(1)
  })

  it('Year shows twelve months; a month opens the month view', () => {
    render('/calendar', [w])
    click(byText('.seg button', 'Year'))
    expect(container.querySelectorAll('.hv-cal-m.small')).toHaveLength(12)
    click(container.querySelectorAll('.hv-cal-mt')[0])
    expect([...container.querySelectorAll('.hv-cal-m:not(.small) .hv-cal-mt b')].at(-1).textContent).toMatch(/^January /)
  })

  it('lists the months oldest first, this one last, with earlier months above', () => {
    render('/calendar', [w])
    const titles = () => [...container.querySelectorAll('.hv-cal-m .hv-cal-mt b')].map(b => b.textContent)
    const now = new Date()
    expect(titles()).toHaveLength(6)
    expect(titles().at(-1)).toMatch(new RegExp(' ' + now.getFullYear() + '$'))
    const first = titles()[0]
    click(container.querySelector('.hv-cal-more'))
    expect(titles()).toHaveLength(12)
    expect(titles()[6]).toBe(first)
  })

  it('a planned day from today on has its dot, a past one none; Show next month adds months below (D68)', () => {
    const S = structuredClone(DEF)
    S.routines = [{ id: 'r', name: 'Push', ex: [] }]
    S.week = { 0: ['r'], 1: ['r'], 2: ['r'], 3: ['r'], 4: ['r'], 5: ['r'], 6: ['r'] }
    render('/calendar')
    act(() => useStore.setState({ S: { ...useStore.getState().S, routines: S.routines, week: S.week } }))
    const planned = [...container.querySelectorAll('.hv-cal-m:not(.small) .hv-cal-d.planned')]
    expect(planned.length).toBeGreaterThan(0)
    expect(planned[0].classList.contains('pk-strength')).toBe(true)
    expect(planned[0].parentElement.querySelector('.hv-cal-tl.pk-strength').textContent).toBe('Push')
    expect(container.querySelector('.hv-cal-d.today').classList.contains('planned')).toBe(true)
    const titles = () => [...container.querySelectorAll('.hv-cal-m .hv-cal-mt b')].map(b => b.textContent)
    const now = new Date()
    click(byText('button', 'Show next month'))
    expect(titles()).toHaveLength(7)
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    expect(titles().at(-1)).toMatch(new RegExp(next.getFullYear() + '$'))
    expect(container.querySelectorAll('.hv-cal-m').item(6).querySelectorAll('.hv-cal-d.planned').length).toBe(new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate())
  })

  it('History’s Calendar chip opens it', () => {
    render('/history-tab')
    click([...container.querySelectorAll('.hv-hlinks button')].find(b => b.textContent.includes('Calendar')))
    expect(path).toBe('/calendar')
  })
})

describe('hevier: Exercises', () => {
  it('a tap opens exercise details, not a pick', () => {
    render('/library')
    click(container.querySelector('.hv-pk-row .tap-main'))
    expect(useUI.getState().sheets).toHaveLength(1)
    expect(container.querySelector('.hv-pk-add')).toBeNull()
  })
})

describe('hevier: the Calendar behind Statistics extras (D117)', () => {
  const offs = [{ hvModuleParts: { 'hvStats.calendar': false } }, { modules: { hvStats: false } }]
  const tileShown = () => [...container.querySelectorAll('.hv-hlinks button, .hv-tlinks button')].some(b => b.textContent.includes('Calendar'))
  const again = (at, patch) => {
    act(() => root.unmount()); container.remove()
    render(at)
    act(() => useStore.getState().update(s => { Object.assign(s, patch) }))
  }

  it('History’s chip and Today’s link go with the part', () => {
    for (const at of ['/history-tab', '/home']) {
      render(at)
      expect(tileShown()).toBe(true)
      for (const off of offs) { again(at, off); expect(tileShown()).toBe(false) }
      act(() => root.unmount()); container.remove()
    }
    render('/home')
  })

  it('/calendar, as the month widget’s tap opens it, lands on History with the part off', () => {
    render('/calendar')
    expect(path).toBe('/calendar')
    expect(container.querySelector('.hv-cal')).toBeTruthy()
    for (const off of offs) {
      again('/calendar', off)
      expect(path).toBe('/history-tab')
      expect(container.querySelector('.hv-cal')).toBeNull()
      expect(container.querySelector('.hv-history')).toBeTruthy()
    }
  })
})
