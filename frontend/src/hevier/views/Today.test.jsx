// @vitest-environment happy-dom
// The Today tab (hevier/DECISIONS.md D126, D134).
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { hevierRoutes } from '../routes.jsx'
import { hooks } from '../hooks.js'
import { pinOn } from '../lib/plan-pins.js'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const EXS = EXDB.filter(e => /barbell/i.test(e.eq || '')).slice(0, 7).map(e => e.id)
const R1 = { id: 'r1', name: 'Upper A', emoji: '', ex: EXS.map(id => ({ id, sets: 3, reps: 8, weight: 60 })) }
let root, container, path

function Where() { path = useLocation().pathname; return null }
function render(patch = {}) {
  useStore.setState({ S: Object.assign(clone(DEF), { weighIn: false, routines: [R1] }, patch), user: null, isGuest: () => true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={['/home']}><Routes>{hevierRoutes}<Route path="*" element={<div id="elsewhere" />} /></Routes><Where /></MemoryRouter>))
}
const btn = text => [...container.querySelectorAll('button')].find(b => b.textContent.includes(text))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 16, 12))   // Monday 16 Nov
  hooks.pinOn = pinOn
  localStorage.clear()
  useUI.setState({ sheets: [], toastMsg: '', timer: null, work: null })
})
afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  hooks.pinOn = hooks.workoutDetail = null
  vi.useRealTimers()
})

describe('hevier: Today (D134)', () => {
  it('shows the next session with its first five exercises, the rest behind the plan link', () => {
    render({ dayPlan: { '2026-11-17': 'r1' } })
    const card = container.querySelector('.hv-next')
    expect(card.querySelector('.hv-cap').textContent).toMatch(/^Next · tomorrow, /)
    expect(card.querySelector('.hv-next-n').textContent).toBe('Upper A')
    expect(card.querySelectorAll('.hv-next-ex')).toHaveLength(5)
    expect(card.querySelector('.hv-next-sets').textContent).toBe('3 sets · 60 kg × 8')
    act(() => btn('2 more · open the plan').click())
    expect(path).toBe('/plan/r/r1/view')
  })

  it('on a short screen shows three, so Start stays on it', () => {
    vi.stubGlobal('matchMedia', q => ({ matches: q === '(max-height: 600px)' }))
    try {
      render({ dayPlan: { '2026-11-17': 'r1' } })
      expect(container.querySelectorAll('.hv-next .hv-next-ex')).toHaveLength(3)
      expect(btn('4 more · open the plan')).toBeTruthy()
    } finally { vi.unstubAllGlobals() }
  })

  it('Start opens the next routine', () => {
    render({ dayPlan: { '2026-11-17': 'r1' } })
    act(() => btn('Start Upper A').click())
    expect(useStore.getState().S.active.entries.map(e => e.id)).toEqual(EXS)
  })

  it('the week is seven days, the next planned one marked', () => {
    render({ dayPlan: { '2026-11-17': 'r1' } })
    const days = container.querySelectorAll('.hv-tday')
    expect(days).toHaveLength(7)
    expect(container.querySelector('.hv-tday.next').getAttribute('aria-label')).toContain('Upper A')
    expect(container.querySelector('.hv-tday.today').getAttribute('aria-current')).toBe('date')
    expect(container.querySelectorAll('.hv-tday[aria-current]')).toHaveLength(1)
  })

  it('with nothing planned says so; the links and the last workout still show', () => {
    const w = { id: 'w1', d: '2026-11-14', name: 'Leg Day', start: Date.parse('2026-11-14T10:00:00'), end: Date.parse('2026-11-14T11:00:00'),
      entries: [{ id: EXS[0], sets: [{ w: 60, r: 8, done: true }] }] }
    render({ workouts: [w] })
    expect(container.querySelector('.hv-next-none').textContent).toContain('Nothing planned')
    expect(btn('Start Upper A')).toBeUndefined()
    const last = container.querySelector('.hv-tlast')
    expect(last.textContent).toContain('Leg Day')
    hooks.workoutDetail = vi.fn()
    act(() => last.click())
    expect(hooks.workoutDetail).toHaveBeenCalledWith(expect.objectContaining({ id: 'w1' }))
    expect(btn('Empty workout').closest('.hv-tlinks')).toBeNull()   // a link under Start, not a third button
    act(() => btn('Empty workout').click())
    expect(useStore.getState().S.active.entries).toEqual([])
  })

  it('Routines and the gear lead on', () => {
    render()
    act(() => btn('Routines').click())
    expect(path).toBe('/routines')
    act(() => root.unmount()); container.remove()
    render()
    act(() => container.querySelector('.hv-pagebar [aria-label="Settings"]').click())
    expect(path).toBe('/settings')
  })
})
