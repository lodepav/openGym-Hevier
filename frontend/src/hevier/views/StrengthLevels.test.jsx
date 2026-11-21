// @vitest-environment happy-dom
// Lifts → Strength levels: the exercises with levels (D19), by the level reached.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { setNav } from '../../lib/nav.js'
import { EXDB } from '../../lib/exercises.js'
import { hevierRoutes } from '../routes.jsx'
import { hooks } from '../hooks.js'
import { installExerciseDetails } from './ExerciseDetails.jsx'
import { exerciseNameText } from '../../lib/format.js'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const BENCH = EXDB.find(e => /^barbell bench press$/i.test(e.n)).id
const SQUAT = EXDB.find(e => /^barbell full squat$/i.test(e.n)).id
const LV = { lv: [40, 60, 80, 100, 120], u: 'kg', d: '2026-10-01' }
const log = [{ id: 'w1', d: '2026-10-10', start: 1, end: 2, entries: [{ id: BENCH, sets: [{ w: 85, r: 1, done: true }] }] }]

let root, container, path
function Bridge() { const n = useNavigate(); setNav(n); path = useLocation().pathname; return null }
function render(at, extra = {}) {
  const S = structuredClone(DEF)
  S.workouts = log
  Object.assign(S, extra)
  useStore.setState({ S, user: null })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={[at]}>
    <Routes>{hevierRoutes}<Route path="*" element={<div />} /></Routes>
    <Bridge />
  </MemoryRouter>))
}
// Lifts' end link (D140); Statistics has no row for it since D142.
const link = () => [...container.querySelectorAll('.hv-lifts-link')].find(b => b.textContent.includes('Strength levels'))

beforeEach(() => { useUI.setState({ sheets: [], toastMsg: '' }) })
let subs = []
// Renders the sheet on top, as the app's sheet host would; unmounted after each test.
function top() {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const r = createRoot(host)
  act(() => r.render(useUI.getState().sheets.at(-1).render(() => {})))
  subs.push([r, host])
  return host
}
afterEach(() => {
  for (const [r, host] of subs) { act(() => r.unmount()); host.remove() }
  subs = []
  if (root) act(() => root.unmount()); container?.remove()
  hooks.exerciseDetail = null
})

describe('hevier: strength levels list', () => {
  // The owner's choice after the sixth critique (2026-11-21): one button, the picker, the lift's page with its fields open.
  it('Set a level picks a lift and opens its page at Compare strength, its fields open', () => {
    installExerciseDetails()
    const SQ = EXDB.find(e => e.id === SQUAT)
    render('/strength', { hvStrength: { [BENCH]: LV } })
    act(() => [...container.querySelectorAll('button')].find(b => b.textContent === 'Set a level').click())
    const picker = top()
    const q = picker.querySelector('input')
    act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(q, exerciseNameText(SQ)); q.dispatchEvent(new Event('input', { bubbles: true })) })
    const row = [...picker.querySelectorAll('.hv-pk-row .tap-main')].find(b => b.getAttribute('aria-label').startsWith(exerciseNameText(SQ)))
    act(() => row.click())
    const page = top()
    expect(page.querySelector('.hv-xd')).toBeTruthy()
    // No 1RM logged for it: the section is there anyway, with its fields open.
    expect(page.querySelector('.hv-sl-form')).toBeTruthy()
  })

  it('lists each exercise under the level it reaches, unlogged ones last', () => {
    render('/lifts', { hvStrength: { [BENCH]: LV, [SQUAT]: LV } })
    act(() => link().click())
    expect(path).toBe('/strength')
    expect(container.querySelector('.hv-pb-back').getAttribute('aria-label')).toBe('Lifts')
    const secs = [...container.querySelectorAll('h2.sec')].map(h => h.textContent)
    expect(secs).toEqual(['Intermediate · 1', 'No 1RM logged yet · 1'])
    expect(container.textContent).toContain('15 kg to Advanced')
    act(() => container.querySelector('.hv-report-row').click())
    expect(useUI.getState().sheets.length).toBe(1)
  })
  it('with no levels yet, says how to add one and lists nothing (the critique, 2026-11-21)', () => {
    render('/strength')
    expect(container.querySelector('.hv-ms-empty').textContent).toBe('No strength levels yet.')
    expect(container.querySelector('.hv-report-row')).toBeNull()
    // Opened directly, back goes up to Lifts (D142).
    act(() => container.querySelector('.hv-pb-back').click())
    expect(path).toBe('/lifts')
  })
})
