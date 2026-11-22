// @vitest-environment happy-dom
// The History tab (hevier/DECISIONS.md D126, D135, D142): this week's numbers, the chips, the feed.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation, useParams } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { hevierRoutes } from '../routes.jsx'
import { muscleOf } from '../lib/exercise-picker.js'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const EX = EXDB.find(e => /barbell/i.test(e.eq || '')).id
let root, container, path, state

function Where() { const l = useLocation(); path = l.pathname; state = l.state; return null }
function Page() { return <div id="page">{useParams().page}</div> }
function render(patch = {}) {
  useStore.setState({ S: Object.assign(clone(DEF), { weighIn: false }, patch), user: null, isGuest: () => true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={['/history-tab']}><Routes>{hevierRoutes}
    <Route path="/settings/:page" element={<Page />} /><Route path="*" element={<div id="elsewhere" />} /></Routes><Where /></MemoryRouter>))
}
const wo = (d, w) => ({ id: 'w' + d, d, name: 'Push', start: Date.parse(d + 'T10:00:00'), end: Date.parse(d + 'T11:00:00'),
  entries: [{ id: EX, sets: [{ w, r: 8, done: true }, { w, r: 8, done: true }] }] })
const chip = text => [...container.querySelectorAll('.hv-hlinks button')].find(b => b.textContent === text)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 18, 12))   // Wednesday 18 Nov
  localStorage.clear()
  useUI.setState({ sheets: [], toastMsg: '', timer: null, work: null })
})
afterEach(() => {
  if (root) act(() => root.unmount())
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('hevier: History (D135)', () => {
  it('the workouts as feed cards, without the week’s numbers Statistics opens with', () => {
    render({ weekStart: 1, workouts: [wo('2026-11-09', 50), wo('2026-11-16', 60)] })
    expect(container.querySelector('.hv-htile')).toBeNull()
    expect([...container.querySelectorAll('.hv-hmonth')].map(h => h.textContent)).toEqual(['November · 2 workouts'])
    expect(container.querySelectorAll('.hv-wcard')).toHaveLength(2)
  })

  it('one row of chips: Calendar, Monthly report and Statistics (D142)', () => {
    render()
    const rows = () => [...container.querySelectorAll('.hv-hgroup')].map(g => [...g.querySelectorAll('.hv-hlinks button')].map(b => b.textContent))
    expect(rows()).toEqual([['Calendar', 'Monthly report', 'Statistics']])
    act(() => chip('Statistics').click())
    expect(path).toBe('/stats')
  })

  it('a chip whose part is off is not drawn; Statistics always is', () => {
    render({ hvModuleParts: { 'hvStats.calendar': false, 'hvStats.report': false } })
    expect([...container.querySelectorAll('.hv-hlinks button')].map(b => b.textContent)).toEqual(['Statistics'])
  })

  it('a card names its top three muscles and +N for the rest; TalkBack hears them all (the critique, 2026-11-22)', () => {
    const set = { w: 50, r: 8, done: true }
    const by = (muscle, n) => ({ id: EXDB.find(e => muscleOf(e) === muscle).id, sets: Array(n).fill(set) })
    const entries = [by('Chest', 4), by('Triceps', 3), by('Biceps', 2), by('Glutes', 1), by('Hamstrings', 1)]
    render({ workouts: [{ ...wo('2026-11-16', 60), entries }] })
    const line = container.querySelector('.hv-wcard .hv-mline')
    expect(line.querySelector('[aria-hidden="true"]').textContent).toBe('Chest 4 · Triceps 3 · Biceps 2 · +2')
    expect(line.querySelector('.hv-sr').textContent).toBe('Chest 4, Triceps 3, Biceps 2, Glutes 1, Hamstrings 1')
  })

  it('an empty feed points to the Hevy import on Settings → Integrations', () => {
    render({ workouts: [] })
    expect(container.textContent).toContain('No workouts yet.')
    act(() => [...container.querySelectorAll('button')].find(b => b.textContent === 'Import from Hevy').click())
    expect(container.querySelector('#page').textContent).toBe('integrations')
  })
})
