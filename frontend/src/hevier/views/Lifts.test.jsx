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
import { muscleGroup } from '../lib/strength-signal.js'
import { isCompound } from '../lib/compound.js'

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

  it('an empty log says so; links at the end lead on, Exercise time is on Statistics (D140, D142)', () => {
    render()
    expect(container.querySelector('.empty')).toBeTruthy()
    expect(container.querySelector('.hv-chips')).toBeNull()
    expect(container.querySelector('.hv-lifts-win')).toBeNull()
    expect([...container.querySelectorAll('.hv-lifts-link')].map(b => b.textContent)).toEqual(['Strength levels', 'All exercises · Create'])
    act(() => container.querySelector('.hv-lifts-all').click())
    expect(path).toBe('/library')
  })

  it('the window is kept in S; Phase shows only while the latest workout has a phase (D140)', () => {
    render({ workouts: log, hvLiftsWindow: 'phase' })
    const segs = () => [...container.querySelectorAll('.hv-lifts-win button')]
    expect(segs().map(b => b.textContent)).toEqual(['12 weeks', 'All'])
    expect(segs()[0].getAttribute('aria-pressed')).toBe('true')   // a stored Phase reads as 12 weeks
    expect(container.querySelector('.hv-lifts-phase')).toBeNull()
    act(() => segs()[1].click())
    expect(useStore.getState().S.hvLiftsWindow).toBe('all')
    act(() => root.unmount()); container.remove()

    const cut = log.map(w => ({ ...w, hvPhase: { p: 'cutting' } }))
    render({ workouts: cut, hvLiftsWindow: 'phase' })
    expect(segs().map(b => b.textContent)).toEqual(['12 weeks', 'Phase', 'All'])
    expect(container.querySelector('.hv-lifts-phase').textContent).toMatch(/^Cutting since .+ · 2 weeks$/)
    act(() => root.unmount()); container.remove()
    render({ workouts: cut, hvLiftsWindow: 'phase', modules: { integrations: false } })
    expect(segs().map(b => b.textContent)).toEqual(['12 weeks', 'All'])
  })

  // A falling three times lighter, B rising, each a week apart.
  const trend = [wo('2026-11-02', A.id, 80), wo('2026-11-09', A.id, 75), wo('2026-11-15', A.id, 70),
    wo('2026-11-01', B.id, 40), wo('2026-11-08', B.id, 45), wo('2026-11-14', B.id, 50)]
  const totals = () => [...container.querySelectorAll('.hv-lifts-total')]

  it('totals filter the list: a tap shows only those lifts, a second tap all (D140)', () => {
    render({ workouts: trend })
    expect(totals().map(b => b.getAttribute('aria-label'))).toEqual(['Rising, 1 lift', 'Holding, 0 lifts', 'Falling, 1 lift'])
    expect(container.querySelector('.hv-lifts-hint').textContent).toBe('Tap a total to show only those lifts')
    act(() => totals()[2].click())
    expect(totals()[2].getAttribute('aria-pressed')).toBe('true')
    expect(totals()[2].getAttribute('aria-label')).toBe('Falling, 1 lift, filter on')
    expect(names()).toEqual([exerciseNameFor(A)])
    expect(container.querySelector('.hv-lifts-hint').textContent).toBe('Showing falling lifts · tap Falling again for all')
    act(() => totals()[2].click())
    expect(totals()[2].getAttribute('aria-pressed')).toBe('false')
    expect(names()).toEqual([exerciseNameFor(A), exerciseNameFor(B)])
  })

  it('a row shows the change and a chart of the estimated 1RM, and speaks them (D140)', () => {
    render({ workouts: trend })
    const a = container.querySelectorAll('.hv-lift')[0]
    expect(a.querySelector('.hv-lift-ch').textContent).toMatch(/^↓ −\d+%$/)
    expect(a.querySelector('.hv-lift-ch').classList.contains('falling')).toBe(true)
    expect(a.querySelector('svg.hv-lift-chart').getAttribute('aria-hidden')).toBe('true')
    const [hi, lo] = [...a.querySelectorAll('.hv-lift-scale span')].map(s => Number(s.textContent))
    expect(hi).toBeGreaterThan(lo)
    expect(a.getAttribute('aria-label')).toBe(`${exerciseNameFor(A)}, ${a.querySelector('.ss').textContent}, estimated 1RM ${lo} to ${hi} kg over 12 weeks, Falling, down ${a.querySelector('.hv-lift-ch').textContent.match(/\d+/)[0]} %, last 70 × 8, best 80 × 8`)
  })

  it('a flat line shows one number on its scale and speaks it once', () => {
    render({ workouts: [wo('2026-11-02', A.id, 70), wo('2026-11-09', A.id, 70), wo('2026-11-15', A.id, 70)] })
    const a = container.querySelector('.hv-lift')
    const scale = a.querySelector('.hv-lift-scale')
    expect(scale.classList.contains('flat')).toBe(true)
    const nums = [...scale.querySelectorAll('span')].map(s => s.textContent)
    expect(nums).toHaveLength(1)
    expect(a.getAttribute('aria-label')).toContain(`estimated 1RM ${nums[0]} kg over 12 weeks`)
    expect(a.getAttribute('aria-label')).not.toMatch(/ to /)
  })

  it('a lift on two brands has a line per brand, named under the chart (D140)', () => {
    const lf = trend.slice(0, 3).map(w => ({ ...w, entries: [{ ...w.entries[0], hvBrand: 'LF' }] }))
    const hs = [wo('2026-11-03', A.id, 50), wo('2026-11-10', A.id, 55)].map(w => ({ ...w, id: w.id + 'hs', entries: [{ ...w.entries[0], hvBrand: 'HS' }] }))
    render({ workouts: [...lf, ...hs] })
    const a = container.querySelector('.hv-lift')
    expect(a.querySelectorAll('svg.hv-lift-chart g')).toHaveLength(2)
    expect(a.querySelector('.hv-lift-legend').textContent).toBe('LF −12%HS +10%')   // 80 to 70: −12.5, rounded up
  })

  // Two compound chest lifts rising, an isolation one holding, one calf lift falling.
  const chest = EXDB.filter(e => e.eq === 'barbell' && muscleGroup(e) === 'Chest')
  const [P, Q] = chest.filter(e => isCompound(e))
  const F = EXDB.find(e => e.eq === 'dumbbell' && muscleGroup(e) === 'Chest' && !isCompound(e))
  const C = EXDB.find(e => e.eq === 'barbell' && muscleGroup(e) === 'Calves')
  const three = (id, ws) => ws.map((w, i) => ({ ...wo(['2026-11-01', '2026-11-08', '2026-11-15'][i], id, w), id: 'g' + i + id }))
  const groups = [...three(P.id, [40, 45, 50]), ...three(Q.id, [50, 52.5, 55]), ...three(F.id, [20, 20, 20]), ...three(C.id, [80, 75, 70])]
  const heads = () => [...container.querySelectorAll('h2.hv-lifts-gh')]
  const row = ex => [...container.querySelectorAll('.hv-lift')].find(b => b.querySelector('.tt').textContent === exerciseNameFor(ex))

  it('By muscle: each group’s header shows its weighted change and how many lifts rise; isolation is marked ½ (D141)', () => {
    render({ workouts: groups, hvLiftsBy: 'muscle' })
    const [ch, calves] = heads()
    const pct = ex => Number(row(ex).querySelector('.hv-lift-ch').textContent.match(/[+−-]?\d+/)[0].replace('−', '-'))
    const want = Math.round((pct(P) + pct(Q) + pct(F) / 2) / 2.5)
    expect(want).toBeGreaterThan(0)
    expect(ch.textContent).toBe(`Chest↑ +${want}%2 of 3 rising`)
    expect(ch.getAttribute('aria-label')).toBe(`Chest, up ${want} %, 2 of 3 lifts rising`)
    expect(calves.textContent).toBe('Calves1 lift · a group number needs two')
    expect(calves.getAttribute('aria-label')).toBe('Calves, 1 lift, a group number needs two')
    expect(container.querySelector('.hv-lifts-hint').textContent).toBe('Tap a total to show only those lifts · ½ counts half in its group')
    const half = row(F).querySelector('.hv-lift-half')
    expect([half.textContent, half.getAttribute('aria-hidden')]).toEqual(['½', 'true'])
    expect(row(P).querySelector('.hv-lift-half')).toBeNull()
    expect(row(F).getAttribute('aria-label')).toMatch(/, isolation, counts half in its group$/)
    expect(row(P).getAttribute('aria-label')).not.toMatch(/isolation/)
  })

  it('the header’s arrow follows its lifts’ states, not the sign of its change (D141)', () => {
    render({ workouts: [...three(P.id, [40, 45, 50]), ...three(Q.id, [80, 75, 70])] })
    act(() => [...container.querySelectorAll('.hv-lifts-by button')].find(b => b.textContent === 'By muscle').click())
    const ch = heads()[0].querySelector('.hv-lift-ch')
    expect(ch.textContent).toMatch(/^→ \+\d+%$/)   // one rising, one falling: holding, though the mean is up
    expect(ch.classList.contains('holding')).toBe(true)
    expect(heads()[0].textContent).toMatch(/1 of 2 rising$/)
  })

  it('a filter hides rows and empty groups, but a header still speaks for its whole group (D141)', () => {
    render({ workouts: groups, hvLiftsBy: 'muscle' })
    const before = heads()[0].textContent
    act(() => totals()[0].click())   // Rising
    expect(heads()).toHaveLength(1)
    expect(heads()[0].textContent).toBe(before)
    expect(names().sort()).toEqual([P, Q].map(exerciseNameFor).sort())
    expect(container.querySelector('.hv-lifts-hint').textContent).toBe('Showing rising lifts · tap Rising again for all · ½ counts half in its group')
  })

  it('Recent has no group numbers and no ½ marks (D141)', () => {
    render({ workouts: groups })
    expect(heads()).toHaveLength(0)
    expect(container.querySelector('.hv-lift-half')).toBeNull()
    expect(row(F).getAttribute('aria-label')).not.toMatch(/isolation/)
    expect(container.querySelector('.hv-lifts-hint').textContent).toBe('Tap a total to show only those lifts')
  })
})
