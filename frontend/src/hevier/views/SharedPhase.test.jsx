// @vitest-environment happy-dom
// OpenBite's phase on saved workouts and the statistics pages' filter (D93), and the gym on the feed
// card (D94).
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { todayISO } from '../../lib/format.js'
import { setNav, nav } from '../../lib/nav.js'
import { finishWorkout } from '../../sheets.jsx'
import { hevierRoutes } from '../routes.jsx'
import { hooks, installFinishHook } from '../hooks.js'
import { readSharedPhase, useStatsPhase, useStatsS } from '../lib/shared-phase-run.js'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))
vi.mock('../lib/shared-phase-run.js', async orig => ({ ...(await orig()), readSharedPhase: vi.fn(async () => null) }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const BENCH = EXDB.find(e => /bench press/i.test(e.n) && /barbell/i.test(e.eq || '')).id
const flush = () => act(() => new Promise(r => setTimeout(r, 0)))
let root, container

function Bridge() { setNav(useNavigate()); return null }

function render(at, patch = {}) {
  const S = Object.assign(clone(DEF), { weighIn: false, equipProfiles: [{ id: 'g1', name: 'City Gym' }] }, patch)
  useStore.setState({ S, user: null, isGuest: () => true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={['/home', at]} initialIndex={1}>
    <Routes>{hevierRoutes}<Route path="*" element={<div id="elsewhere" />} /></Routes><Bridge />
  </MemoryRouter>))
}
const workout = (id, sets, extra = {}, entry = {}) => ({ id, d: todayISO(), name: 'Push', start: 1, end: 3600001, vol: 960,
  entries: [{ id: BENCH, sets: Array.from({ length: sets }, () => ({ w: 60, r: 8, done: true })), ...entry }], ...extra })
const chips = () => [...container.querySelectorAll('.hv-phase-filter .hv-chip')]

beforeEach(() => {
  localStorage.clear()
  useUI.setState({ sheets: [], toastMsg: '', timer: null, work: null })
  useStatsPhase.setState({ phase: null })
  readSharedPhase.mockReset()
  readSharedPhase.mockResolvedValue(null)
})
afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  hooks.finish = hooks.done = null
})

describe('a saved workout', () => {
  it('shows its gym and phase on the feed card', () => {
    render('/profile', { workouts: [workout('w1', 2, { hvPhase: { p: 'cutting' } }, { hvGym: 'g1' })] })
    const tags = container.querySelector('.hv-wcard-tags').textContent
    expect(tags).toContain('City Gym')
    expect(tags).toContain('Cutting')
  })
  it('has no tag line with neither', () => {
    render('/profile', { workouts: [workout('w1', 2)] })
    expect(container.querySelector('.hv-wcard')).toBeTruthy()
    expect(container.querySelector('.hv-wcard-tags')).toBeNull()
  })
  it('shows its phase on Workout Detail', () => {
    render('/home', { workouts: [workout('w1', 2, { hvPhase: { p: 'bulking' } })] })
    act(() => nav('/workout-detail', { state: { ref: { id: 'w1' } } }))
    expect(container.querySelector('.hv-wd-d').textContent).toContain('Bulking')
  })
})

describe('Save Workout', () => {
  const active = extra => ({ id: 'hv1', d: todayISO(), start: Date.now() - 2700000, name: 'Leg Day', cur: 0,
    entries: [{ id: BENCH, target: { sets: 1, reps: 8 }, sets: [{ w: 60, r: 8, done: true, at: Date.now() - 60000 }] }], ...extra })
  const save = () => act(() => [...container.querySelectorAll('button')].find(b => b.textContent === 'Save').click())

  it('writes OpenBite\'s phase on the saved record, not on the running session', async () => {
    readSharedPhase.mockResolvedValue({ p: 'cutting', r: -0.4, k: 3098 })
    installFinishHook(nav)
    render('/workout/save', { active: active() })
    await flush()
    expect(useStore.getState().S.active.hvPhase).toBeUndefined()
    save()
    expect(useStore.getState().S.workouts[0].hvPhase).toEqual({ p: 'cutting', r: -0.4, k: 3098 })
  })
  it('writes nothing when OpenBite shares nothing', async () => {
    installFinishHook(nav)
    render('/workout/save', { active: active() })
    await flush()
    save()
    expect(useStore.getState().S.workouts[0]).not.toHaveProperty('hvPhase')
  })
  it('does not ask for a workout logged into the past', async () => {
    readSharedPhase.mockResolvedValue({ p: 'cutting' })
    installFinishHook(nav)
    render('/workout/save', { active: active({ backfill: true, d: '2026-01-05' }) })
    await flush()
    expect(readSharedPhase).not.toHaveBeenCalled()
  })
})

describe('the statistics filter', () => {
  const log = [workout('a', 2, { hvPhase: { p: 'cutting' } }), workout('b', 5, { hvPhase: { p: 'bulking' } }), workout('c', 7)]

  it('does not show without a workout carrying a phase', () => {
    render('/stats', { workouts: [workout('c', 7)] })
    expect(chips()).toHaveLength(0)
  })
  it('starts on All and offers only the phases in the log', () => {
    render('/stats', { workouts: log })
    expect(chips().map(c => c.textContent)).toEqual(['All', 'Cutting', 'Bulking'])
    expect(chips()[0].getAttribute('aria-pressed')).toBe('true')
  })
  it('narrows the set counts on the page to the phase, and All brings them back', () => {
    render('/stats', { workouts: log })
    const sets = () => container.querySelector('.hv-mset b').textContent
    expect(sets()).toBe('14')
    act(() => chips()[1].click())
    expect(sets()).toBe('2')
    act(() => chips()[0].click())
    expect(sets()).toBe('14')
  })
  it('follows the filter in upstream\'s pages through the hook', () => {
    let seen
    function Page() { seen = useStatsS(useStore(s => s.S)).workouts.length; return null }
    useStore.setState({ S: Object.assign(clone(DEF), { workouts: log }) })
    container = document.createElement('div')
    root = createRoot(container)
    act(() => root.render(<Page />))
    expect(seen).toBe(3)
    act(() => useStatsPhase.getState().pick('bulking'))
    expect(seen).toBe(1)
  })
})
