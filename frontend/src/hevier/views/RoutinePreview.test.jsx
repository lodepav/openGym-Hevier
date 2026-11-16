// @vitest-environment happy-dom
// The routine's page (hevier/DECISIONS.md D37, D128): the Workout tab's routine name opens it; it
// shows the next session as it will open, last time beside each set, plans a number for the next
// session only, starts the routine with the plan and opens the editor.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { afterEach, beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { hevierRoutes } from '../routes.jsx'
import Modals from '../../components/Modals.jsx'
import { hooks } from '../hooks.js'
import { isPlain, plainRows } from '../lib/plain-routine.js'
import { storeAdapter } from '../lib/store-watch.js'
import { initNextPlan } from '../lib/next-plan-run.js'

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
  S.routines = [{ id: 'r1', name: 'Leg Day', emoji: 'dumbbell', ex }]
  useStore.setState({ S, user: null, isGuest: () => true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={['/workout', at]} initialIndex={1}>
    <Routes>
      {hevierRoutes}
      <Route path="*" element={<div id="elsewhere" />} />
    </Routes>
    <Modals />
    <Where />
  </MemoryRouter>))
}
const byText = (sel, text) => [...document.querySelectorAll(sel)].find(b => b.textContent.includes(text))
const rows = () => [...container.querySelectorAll('.hv-np-row:not(.hv-np-head)')].map(r => [...r.children].map(c => c.textContent))
const nums = () => container.querySelectorAll('.hv-np-num')
const key = text => act(() => [...document.querySelectorAll('.hv-kp-keys button')].find(b => b.textContent === text).click())
const press = label => act(() => document.querySelector(`.hv-kp-keys [aria-label="${label}"]`).click())
const tick = () => act(() => new Promise(r => setTimeout(r, 0)))
// Last time's workout of the routine: a warm-up and two different work sets.
const last = {
  id: 'w0', d: '2026-11-10', start: Date.parse('2026-11-10T10:00:00'), end: Date.parse('2026-11-10T11:00:00'), routineIds: ['r1'], routineId: 'r1', name: 'Leg Day',
  entries: [{ id: EX, rid: 'r1', target: { sets: 2, reps: 5, weight: 100, warmupSets: 1 },
    sets: [{ w: 60, r: 5, done: true, phase: 'warmup', warmup: true }, { w: 100, r: 5, done: true }, { w: 90, r: 8, done: true }] }],
}
const PLAN = [{ id: EX, mode: 'reps', sets: 2, reps: 5, weight: 100, warmupSets: 1 }]

beforeAll(() => {
  hooks.plainRoutine = { is: isPlain, rows: plainRows }   // D69, as hevier/index.js installs it
  initNextPlan(storeAdapter(useStore, () => {}))
})
afterAll(() => { hooks.plainRoutine = null })
beforeEach(() => {
  localStorage.clear()
  useUI.setState({ sheets: [], toastMsg: '', timer: null, work: null })
})
afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  root = container = null
})

describe('Routine page (D37, D128)', () => {
  it('opens from the routine name on Routines', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 5, weight: 100 }], '/routines')
    act(() => byText('button.hv-rname', 'Leg Day').click())
    expect(path).toBe('/plan/r/r1/view')
    expect(container.querySelector('.hv-pagebar .hv-title').textContent).toBe('Leg Day')
  })

  it('shows last time beside what each set opens with, warm-ups included', () => {
    render(PLAN, undefined, { workouts: [last] })
    expect(container.querySelector('input')).toBeNull()
    expect(rows()).toEqual([['W', '60 × 5', '60 kg × 5'], ['1', '100 × 5', '100 kg × 5'], ['2', '90 × 8', '90 kg × 8']])
  })

  it('never done: the routine’s own numbers, no last time', () => {
    render([{ id: EX, mode: 'reps', sets: 2, reps: 5, weight: 100, lastToFailure: true }])
    expect(rows()).toEqual([['1', '–', '100 kg × 5'], ['F', '–', '100 kg × 5']])
    expect(container.querySelector('.hv-rv-count').textContent).toContain('2 sets')
  })

  it('a tap on a number plans it for the next session only, in the accent colour', () => {
    render(PLAN, undefined, { workouts: [last] })
    const before = clone(useStore.getState().S.routines)
    act(() => nums()[2].click())
    expect(document.querySelector('.hv-kp-hd').textContent).toContain('Last time: 100 × 5')
    key('1'); key('0'); key('2'); key('.'); key('5')
    expect(useStore.getState().S.hvPlan).toEqual({ r1: { ex: { [EX]: { 0: { w: 102.5 } } } } })
    expect(rows()[1]).toEqual(['1', '100 × 5', '102.5 kg × 5'])
    const planned = container.querySelector('.hv-np-num.chg')
    expect(planned.textContent).toBe('102.5')
    expect(planned.getAttribute('aria-label')).toMatch(/Set 1, Weight 102.5 kg, planned$/)
    expect(container.querySelector('.hv-np-note')).toBeTruthy()
    // The warm-up stays last time's; the routine is not changed.
    expect(rows()[0]).toEqual(['W', '60 × 5', '60 kg × 5'])
    expect(useStore.getState().S.routines).toEqual(before)
    // Next moves to the reps, + steps them; Last time puts them back.
    key('Next')
    expect(document.querySelector('.hv-kp-hd b').textContent).toMatch(/Set 1, Reps$/)
    press('Increase')
    expect(rows()[1]).toEqual(['1', '100 × 5', '102.5 kg × 6'])
    key('Last time')
    expect(rows()[1]).toEqual(['1', '100 × 5', '102.5 kg × 5'])
    // Stepped back to what it opens with, a number is no plan.
    key('Next')
    press('Decrease')
    expect(rows()[2]).toEqual(['2', '90 × 8', '87.5 kg × 8'])
    press('Increase')
    expect(useStore.getState().S.hvPlan.r1.ex[EX][1]).toBeUndefined()
    // The last number's Next is Done, and closes the keypad.
    key('Next')
    key('Done')
    expect(document.querySelector('.hv-kp')).toBeNull()
  })

  it('Start opens the workout with the plan; saved, the plan is used up', async () => {
    render(PLAN, undefined, { workouts: [last] })
    act(() => nums()[2].click())
    key('1'); key('1'); key('0')
    const shown = rows()
    act(() => byText('.hv-rv-start', 'Start').click())
    await tick()
    const A = useStore.getState().S.active
    expect(A.routineIds).toEqual(['r1'])
    expect(A.entries[0].sets.map(s => s.w + ' kg × ' + s.r)).toEqual(shown.map(r => r[2]))
    expect(useStore.getState().S.hvPlan.r1.used).toBe(A.id)
    act(() => useStore.getState().update(s => { s.workouts.push({ ...last, id: A.id }); s.active = null }))
    await tick()
    expect(useStore.getState().S.hvPlan).toBeUndefined()
  })

  it('a discarded workout leaves the plan for the next one', async () => {
    render(PLAN, undefined, { workouts: [last] })
    act(() => nums()[2].click())
    key('9'); key('5')
    act(() => byText('.hv-rv-start', 'Start').click())
    await tick()
    expect(useStore.getState().S.active.entries[0].sets[1].w).toBe(95)
    act(() => useStore.getState().update(s => { s.active = null }))
    await tick()
    expect(useStore.getState().S.hvPlan).toEqual({ r1: { ex: { [EX]: { 0: { w: 95 } } } } })
  })

  it('shows a timed set as it opens, with nothing to plan', () => {
    render([{ id: EX, mode: 'time', sets: 1, sec: 45, weight: 0 }])
    expect(rows()[0][2]).toContain('45')
    expect(nums()).toHaveLength(0)
  })

  it('Edit routine opens the editor', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 5, weight: 100 }])
    act(() => byText('button', 'Edit').click())
    expect(path).toBe('/plan/r/r1')
  })

  it('shares the routine with a friend through upstream’s sheet (D37, upstream 1.4.4)', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 5, weight: 100 }])
    const share = container.querySelector('[aria-label="Share with a friend"]')
    expect(share.disabled).toBe(false)
    act(() => share.click())
    expect(useUI.getState().sheets).toHaveLength(1)
    act(() => root.unmount()); container.remove()
    render([])
    expect(container.querySelector('[aria-label="Share with a friend"]').disabled).toBe(true)
  })

  it('resumes a session already open instead of starting another', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 5, weight: 100 }], undefined, { active: { id: 'a1', d: '2026-10-17', start: 1, entries: [] } })
    act(() => byText('button', 'Resume').click())
    expect(useStore.getState().S.active.id).toBe('a1')
    expect(path).toBe('/workout')
  })

  it('says how long the routine usually takes, from its saved workouts', () => {
    const w = min => ({ d: '2026-11-01', start: 1000, end: 1000 + min * 60000, routineIds: ['r1'], routineId: 'r1', name: 'Leg Day', entries: [] })
    render([{ id: EX, mode: 'reps', sets: 3, reps: 5, weight: 100 }], undefined, { workouts: [w(50)] })
    expect(container.querySelector('.hv-rv-when').textContent).not.toContain('about')
    act(() => useStore.setState(st => ({ S: { ...st.S, workouts: [w(50), w(65), w(55)] } })))
    expect(container.querySelector('.hv-rv-when').textContent).toContain('about 55min')
  })

  it('a routine that is gone goes back to Routines', () => {
    render([], '/plan/r/nope/view')
    expect(path).toBe('/routines')
  })
})
