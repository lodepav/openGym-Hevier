// @vitest-environment happy-dom
// The routine page (hevier/DECISIONS.md D37): the Workout tab's routine name opens it; it draws the
// routine editor's table read-only, starts the routine and opens the editor.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { hevierRoutes } from '../routes.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const EX = EXDB.find(e => /barbell/i.test(e.eq || '')).id
let root, container, path

function Where() { path = useLocation().pathname; return null }

function render(ex, at = '/plan/r/r1/view', extra = {}) {
  const S = Object.assign(clone(DEF), { weighIn: false, unit: 'kg' }, extra)
  S.routines = [{ id: 'r1', name: 'Leg Day', emoji: 'dumbbell', prog: 'linear', ex }]
  useStore.setState({ S, user: null, isGuest: () => true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={['/workout', at]} initialIndex={1}>
    <Routes>
      {hevierRoutes}
      <Route path="*" element={<div id="elsewhere" />} />
    </Routes>
    <Where />
  </MemoryRouter>))
}
const byText = (sel, text) => [...container.querySelectorAll(sel)].find(b => b.textContent.includes(text))
const rows = () => [...container.querySelectorAll('.hv-rt-row:not(.hv-rt-head)')].map(r => [...r.children].map(c => c.textContent))

beforeEach(() => {
  localStorage.clear()
  useUI.setState({ sheets: [], toastMsg: '', timer: null, work: null })
})
afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  root = container = null
})

describe('Routine page (D37)', () => {
  it('opens from the routine name on the Workout tab', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 5, weight: 100 }], '/workout')
    act(() => byText('button.hv-rname', 'Leg Day').click())
    expect(path).toBe('/plan/r/r1/view')
    expect(container.querySelector('.hv-rv-name').textContent).toBe('Leg Day')
  })

  it('draws the prescription read-only: warm-ups, work sets, failure', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 5, weight: 100, warmupSets: 1, lastToFailure: true }])
    expect(container.querySelector('input')).toBeNull()
    expect(rows()).toEqual([['W', 'Auto', '–'], ['1', '100', '5'], ['2', '100', '5'], ['F', '100', '5']])
    expect(container.querySelector('.hv-sub').textContent).toContain('3 sets')
  })

  it('shows a rep range as REP RANGE', () => {
    render([{ id: EX, mode: 'reps', sets: 2, reps: 12, repsMin: 8, weight: 60, prog: 'double' }])
    expect(byText('.hv-rt-head span', 'REP RANGE')).toBeTruthy()
    expect(rows()[0]).toEqual(['1', '60', '8–12'])
  })

  it('Start Routine starts the routine; the pencil opens the editor', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 5, weight: 100 }])
    act(() => byText('button', 'Start Routine').click())
    expect(useStore.getState().S.active?.routineIds).toEqual(['r1'])
    act(() => root.unmount()); container.remove()
    render([{ id: EX, mode: 'reps', sets: 3, reps: 5, weight: 100 }])
    act(() => container.querySelector('[aria-label="Edit routine"]').click())
    expect(path).toBe('/plan/r/r1')
  })

  it('resumes a session already open instead of starting another', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 5, weight: 100 }], undefined, { active: { id: 'a1', d: '2026-10-17', start: 1, entries: [] } })
    act(() => byText('button', 'Resume').click())
    expect(useStore.getState().S.active.id).toBe('a1')
    expect(path).toBe('/workout')
  })

  it('a routine that is gone goes back to the Workout tab', () => {
    render([], '/plan/r/nope/view')
    expect(path).toBe('/workout')
  })
})
