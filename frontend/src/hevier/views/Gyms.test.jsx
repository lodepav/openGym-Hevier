// @vitest-environment happy-dom
// Gyms and machine labels on screen (hevier/DECISIONS.md D28): the workout's gym line, a machine's
// brand line and their sheets, the labels landing on the saved workout, Workout Detail and the
// exercise details' label chooser.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Workout from '../../views/Workout.jsx'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXIDX } from '../../lib/exercises.js'
import { setNav, nav } from '../../lib/nav.js'
import { hevierRoutes } from '../routes.jsx'
import { hooks, installFinishHook } from '../hooks.js'
import { exerciseDetailsSheet } from './ExerciseDetails.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const CABLE = '8878'      // cable 45 degrees reverse fly
const DB = '4067'         // dumbbell alternate arnold press
const gyms = [{ id: 'g1', name: 'City Gym', equipment: [] }, { id: 'g2', name: 'Home', equipment: [] }]
let root, container, sheetRoot, sheetHost

function Bridge() { setNav(useNavigate()); return null }

function render(el, { entries = [], extra = {}, at = '/workout' } = {}) {
  const S = Object.assign(clone(DEF), { weighIn: false, equipProfiles: gyms, activeEquipId: 'g1' }, extra)
  if (entries.length) {
    const start = Date.now() - 30 * 60000
    const d = new Date(start)
    S.active = { id: 'hv1', d: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, start, name: 'Pull', cur: 0, entries }
  }
  useStore.setState({ S, user: null, isGuest: () => true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={['/home', at]} initialIndex={1}>
    {el || <Routes>{hevierRoutes}<Route path="*" element={<div id="elsewhere" />} /></Routes>}
    <Bridge />
  </MemoryRouter>))
}
// The top sheet, rendered on its own (as WorkoutTab.test.jsx does).
function sheet() {
  sheetHost = document.createElement('div')
  document.body.appendChild(sheetHost)
  sheetRoot = createRoot(sheetHost)
  const top = useUI.getState().sheets.at(-1)
  act(() => sheetRoot.render(<MemoryRouter>{top.render(() => useUI.setState({ sheets: useUI.getState().sheets.filter(x => x !== top) }))}</MemoryRouter>))
  return sheetHost
}
const typeInto = (el, text) => act(() => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, text)
  el.dispatchEvent(new Event('input', { bubbles: true }))
})
const byText = (root, sel, text) => [...root.querySelectorAll(sel)].find(b => b.textContent.includes(text))
const done = (w, r) => ({ w, r, done: true, at: Date.now() - 60000 })
const S = () => useStore.getState().S

beforeEach(() => {
  localStorage.clear()
  useUI.setState({ sheets: [], toastMsg: '', timer: null, work: null })
  installFinishHook(nav)
})
afterEach(() => {
  if (sheetRoot) act(() => sheetRoot.unmount())
  sheetHost?.remove(); sheetRoot = sheetHost = null
  if (root) act(() => root.unmount())
  container?.remove()
  hooks.finish = hooks.done = null
})

describe('hevier gyms and machine labels on screen (D28)', () => {
  it('the workout shows the active profile as its gym, and the gym can be changed', () => {
    render(<Workout />, { entries: [{ id: DB, target: { sets: 1, reps: 8 }, sets: [{ w: 20, r: 8, done: false }] }] })
    const row = container.querySelector('.hv-gym')
    expect(row.textContent).toContain('City Gym')
    act(() => row.click())
    const item = byText(sheet(), '.menu-item', 'Home')
    act(() => item.click())
    expect(S().active.hvGym).toBe('g2')
    expect(S().activeEquipId).toBe('g2')
    expect(container.querySelector('.hv-gym').textContent).toContain('Home')
  })

  it('shows no gym line before any equipment profile exists', () => {
    render(<Workout />, { entries: [{ id: DB, sets: [] }], extra: { equipProfiles: [], activeEquipId: null } })
    expect(container.querySelector('.hv-gym')).toBeNull()
  })

  it('a cable exercise gets a brand line filled from this gym, a dumbbell none', () => {
    render(<Workout />, {
      entries: [{ id: CABLE, sets: [] }, { id: DB, sets: [] }],
      extra: { hvMachines: { [CABLE]: { g1: 'Life Fitness' } } },
    })
    const lines = container.querySelectorAll('.hv-brand')
    expect(lines).toHaveLength(1)
    expect(lines[0].textContent).toContain('Life Fitness')
  })

  it('the brand sheet changes the label and what this gym has from now on', () => {
    render(<Workout />, { entries: [{ id: CABLE, sets: [] }], extra: { hvMachines: { [CABLE]: { '': 'Matrix' } } } })
    expect(container.querySelector('.hv-brand').textContent).toContain('Add machine label')
    act(() => container.querySelector('.hv-brand').click())
    const host = sheet()
    expect(host.textContent).toContain('Used for this exercise at City Gym from now on.')
    expect(byText(host, '.chip', 'Matrix')).toBeTruthy()   // brands typed before are quick picks
    typeInto(host.querySelector('input'), 'Life Fitness')
    act(() => host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(S().active.entries[0].hvBrand).toBe('Life Fitness')
    expect(S().hvMachines[CABLE]).toEqual({ '': 'Matrix', g1: 'Life Fitness' })
    expect(container.querySelector('.hv-brand').textContent).toContain('Life Fitness')
  })

  it('Save Workout writes the gym and the brand onto the saved exercises', () => {
    render(null, {
      at: '/workout/save',
      entries: [{ id: CABLE, sets: [done(15, 12)] }, { id: DB, sets: [done(20, 8)] }],
      extra: { hvMachines: { [CABLE]: { g1: 'Life Fitness' } } },
    })
    act(() => byText(container, '.hv-pagebar button', 'Save').click())
    const w = S().workouts[0]
    expect(S().active).toBeNull()
    expect(w.entries.map(e => [e.id, e.hvGym, e.hvBrand])).toEqual([[CABLE, 'g1', 'Life Fitness'], [DB, 'g1', undefined]])
  })

  it('Workout Detail shows the gym and each machine\'s brand', () => {
    const w = { id: 'w1', d: '2026-10-10', start: 1, end: 3600001, entries: [
      { id: CABLE, sets: [done(15, 12)], hvGym: 'g1', hvBrand: 'Life Fitness' },
      { id: DB, sets: [done(20, 8)], hvGym: 'g1' },
    ] }
    render(null, { extra: { workouts: [w] }, at: '/home' })
    act(() => nav('/workout-detail', { state: { ref: { id: 'w1' } } }))
    expect(container.querySelector('.hv-wd-d').textContent).toContain('City Gym')
    const brands = container.querySelectorAll('.hv-brand')
    expect(brands).toHaveLength(1)
    expect(brands[0].textContent).toBe('Life Fitness')
  })

  it('exercise details narrows to a picked gym · brand, and lists them only when they differ', () => {
    const w = (id, day, kg, g, b) => ({ id, d: `2026-10-0${day}`, start: Date.parse(`2026-10-0${day}T10:00`), end: Date.parse(`2026-10-0${day}T11:00`),
      entries: [{ id: CABLE, sets: [done(kg, 10)], hvGym: g, hvBrand: b }] })
    render(<div />, { extra: { workouts: [w('a', 1, 40, 'g1', 'Life Fitness'), w('b', 2, 25, 'g2', 'Matrix'), w('c', 3, 45, 'g1', 'Life Fitness')] } })
    act(() => exerciseDetailsSheet(EXIDX[CABLE]))
    const host = sheet()
    const sel = host.querySelector('.hv-xd-label')
    expect([...sel.options].map(o => o.textContent)).toEqual(['All sets', 'City Gym · Life Fitness (2)', 'Home · Matrix (1)'])
    expect(host.querySelector('.hv-xd-big').textContent).toContain('45')
    act(() => { sel.value = 'g2|Matrix'; sel.dispatchEvent(new Event('change', { bubbles: true })) })
    expect(host.querySelector('.hv-xd-big').textContent).toContain('25')
  })
})
