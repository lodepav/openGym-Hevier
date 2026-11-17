// @vitest-environment happy-dom
// The Lifts tab (hevier/DECISIONS.md D126, D135).
import { withExUnit } from '../../lib/ex-unit.js'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { exerciseNameFor } from '../../lib/i18n.js'
import { hevierRoutes } from '../routes.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const [A, B] = EXDB.filter(e => /barbell/i.test(e.eq || '')).slice(0, 2)
let root, container, path

function Where() { path = useLocation().pathname; return null }
function render(patch = {}) {
  useStore.setState({ S: Object.assign(clone(DEF), { weighIn: false }, patch), user: null, isGuest: () => true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={['/lifts']}><Routes>{hevierRoutes}<Route path="*" element={<div id="elsewhere" />} /></Routes><Where /></MemoryRouter>))
}
const wo = (d, id, w) => ({ id: 'w' + d + id, d, name: 'W', start: Date.parse(d + 'T10:00:00'), end: Date.parse(d + 'T11:00:00'),
  entries: [{ id, sets: [{ w, r: 8, done: true }] }] })
// A trained once and then lighter (best under the last); B beaten in its last session (a record).
const log = [wo('2026-11-02', A.id, 80), wo('2026-11-09', A.id, 70), wo('2026-11-03', B.id, 40), wo('2026-11-12', B.id, 50)]
const names = () => [...container.querySelectorAll('.hv-lift .tt')].map(e => e.textContent)
const input = () => container.querySelector('.hv-lifts input')
const type = v => act(() => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input(), v)
  input().dispatchEvent(new Event('input', { bubbles: true }))
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 16, 12))
  localStorage.clear()
  useUI.setState({ sheets: [], toastMsg: '', timer: null, work: null })
})
afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  vi.useRealTimers()
})

describe('hevier: Lifts (D135)', () => {
  it('lists the trained exercises, the latest first, with the last set and the best or a new best', () => {
    render({ workouts: log })
    expect(names()).toEqual([exerciseNameFor(B), exerciseNameFor(A)])
    const [b, a] = container.querySelectorAll('.hv-lift')
    expect(b.querySelector('.hv-lift-r b').textContent).toBe('50 × 8')
    expect(b.querySelector('.hv-pr').textContent).toBe('New best')
    expect(a.querySelector('.hv-lift-r b').textContent).toBe('70 × 8')
    expect(a.querySelector('.hv-lift-r small').textContent).toBe('best 80 × 8')
    act(() => a.click())
    expect(useUI.getState().sheets).toHaveLength(1)
  })

  it('an exercise pinned to lb reads in lb, a per-side set too (D41)', () => {
    const side = { w: 20.4117, r: 8, done: true }
    const w = wo('2026-11-02', A.id, 80)
    w.entries[0].sets = [{ sides: { L: side, R: side }, done: true }]
    render({ workouts: [w], exUnit: withExUnit({}, A.id, 'lb') })
    expect(container.querySelector('.hv-lift-r b').textContent).toBe('L 45 × 8\nR 45 × 8')
  })

  it('the search finds an exercise by the brand it was done on', () => {
    const w = wo('2026-11-02', A.id, 80)
    w.entries[0].hvBrand = 'Hammer'
    render({ workouts: [w, wo('2026-11-03', B.id, 40)] })
    type('hammer')
    expect(names()).toEqual([exerciseNameFor(A)])
  })

  it('the search narrows the list; By muscle is kept in S', () => {
    render({ workouts: log })
    type(exerciseNameFor(A))
    expect(names()).toEqual([exerciseNameFor(A)])
    type('')
    act(() => [...container.querySelectorAll('.hv-lifts-by button')].find(b => b.textContent === 'By muscle').click())
    expect(useStore.getState().S.hvLiftsBy).toBe('muscle')
    expect(container.querySelector('h2.sec').textContent).not.toBe('Recently trained')
  })

  it('an empty log says so; the chips and All exercises lead on', () => {
    render()
    expect(container.querySelector('.empty')).toBeTruthy()
    expect([...container.querySelectorAll('.hv-chips .hv-chip')].map(b => b.textContent)).toEqual(['Strength levels', 'Trends', 'Exercise time'])
    act(() => container.querySelector('.hv-lifts-all').click())
    expect(path).toBe('/library')
  })
})
