// @vitest-environment happy-dom
// Profile → Calendar and Profile → Exercises (reference/SCREENS.md §8, §11).
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
    expect(container.querySelector('.hv-cal-m:not(.small) .hv-cal-mt b').textContent).toMatch(/^January /)
  })

  it('Profile’s Calendar tile opens it', () => {
    render('/profile')
    click([...container.querySelectorAll('button')].find(b => b.textContent.includes('Calendar')))
    expect(path).toBe('/calendar')
  })
})

describe('hevier: Exercises', () => {
  it('a tap opens exercise details, not a pick', () => {
    render('/library')
    click(container.querySelector('.hv-pk-row'))
    expect(useUI.getState().sheets).toHaveLength(1)
    expect(container.querySelector('.hv-pk-add')).toBeNull()
  })
})
