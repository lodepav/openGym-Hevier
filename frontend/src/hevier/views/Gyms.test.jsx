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
import { NearbySheet } from '../components/GymLabels.jsx'

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

  it('with no gym yet the line reads No gym, and a custom gym is added and picked from its sheet (D47)', () => {
    render(<Workout />, { entries: [{ id: DB, sets: [] }], extra: { equipProfiles: [], activeEquipId: null } })
    expect(container.querySelector('.hv-gym').textContent).toContain('No gym')
    act(() => container.querySelector('.hv-gym').click())
    const menu = sheet()
    act(() => byText(menu, '.menu-item', 'Custom gym').click())
    const host = sheet()
    typeInto(host.querySelector('input'), 'Iron Barn')
    act(() => host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(S().equipProfiles.map(g => g.name)).toEqual(['Iron Barn'])
    expect(S().active.hvGym).toBe(S().equipProfiles[0].id)
    expect(S().equipProfiles[0].equipment.length).toBeGreaterThan(10)
  })

  it('gyms nearby: your gym there first, a picked place becomes a gym with that place (D47)', async () => {
    const here = { lat: 47.3769, lng: 8.5417, accuracy: 30 }
    const places = [
      { osm: 'node/1', name: 'NonStop Gym', street: 'Langstrasse 1', label: 'NonStop Gym · Langstrasse 1', sub: '', lat: 47.3772, lng: 8.5420, dist: 40 },
      { osm: 'node/2', name: 'Kieser Training', street: '', label: 'Kieser Training', sub: '', lat: 47.3701, lng: 8.5519, dist: 1000 },
    ]
    render(null, { entries: [{ id: DB, sets: [] }], extra: { hvGymPlaces: { g2: { lat: 47.3770, lng: 8.5418 } } } })
    sheetHost = document.createElement('div')
    document.body.appendChild(sheetHost)
    sheetRoot = createRoot(sheetHost)
    const close = vi.fn()
    await act(async () => sheetRoot.render(<MemoryRouter><NearbySheet close={close} locate={async () => here} places={async () => places} /></MemoryRouter>))
    const secs = [...sheetHost.querySelectorAll('.menu-sec')].map(x => x.textContent)
    expect(secs).toEqual(['Your gyms here', 'Nearby'])
    expect(sheetHost.querySelector('.menu-item').textContent).toContain('Home')
    act(() => byText(sheetHost, '.menu-item', 'NonStop Gym').click())
    // Named with its street, as a chain's gyms share one name; the place keeps OpenStreetMap's.
    const made = S().equipProfiles.find(g => g.name === 'NonStop Gym · Langstrasse 1')
    expect(made).toBeTruthy()
    expect(S().activeEquipId).toBe(made.id)
    expect(S().hvGymPlaces[made.id]).toEqual({ lat: 47.3772, lng: 8.5420, osm: 'node/1', name: 'NonStop Gym' })
    expect(close).toHaveBeenCalled()
  })

  it('gyms nearby says why when the position is not allowed, and offers a custom gym (D47)', async () => {
    render(null, { entries: [{ id: DB, sets: [] }] })
    sheetHost = document.createElement('div')
    document.body.appendChild(sheetHost)
    sheetRoot = createRoot(sheetHost)
    const places = vi.fn()
    await act(async () => sheetRoot.render(<MemoryRouter><NearbySheet close={() => {}}
      locate={async () => { throw Object.assign(new Error('denied'), { code: 'denied' }) }} places={places} /></MemoryRouter>))
    expect(sheetHost.textContent).toContain('Location isn’t allowed')
    expect(sheetHost.textContent).toContain('Custom gym')
    expect(places).not.toHaveBeenCalled()
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

  it('exercise details narrows to a picked brand, not a gym, and lists them only when they differ', () => {
    const w = (id, day, kg, g, b) => ({ id, d: `2026-10-0${day}`, start: Date.parse(`2026-10-0${day}T10:00`), end: Date.parse(`2026-10-0${day}T11:00`),
      entries: [{ id: CABLE, sets: [done(kg, 10)], hvGym: g, hvBrand: b }] })
    render(<div />, { extra: { workouts: [w('a', 1, 40, 'g1', 'Life Fitness'), w('b', 2, 25, 'g2', 'Matrix'), w('c', 3, 45, 'g2', 'Life Fitness')] } })
    act(() => exerciseDetailsSheet(EXIDX[CABLE]))
    const host = sheet()
    const sel = host.querySelector('.hv-xd-label')
    expect([...sel.options].map(o => o.textContent)).toEqual(['All sets', 'Life Fitness (2)', 'Matrix (1)'])
    expect(host.querySelector('.hv-xd-big').textContent).toContain('45')
    act(() => { sel.value = 'k:Matrix'; sel.dispatchEvent(new Event('change', { bubbles: true })) })
    expect(host.querySelector('.hv-xd-big').textContent).toContain('25')
  })

  it('the strength level follows the picked brand (D19, D28)', () => {
    const w = (id, day, kg, b) => ({ id, d: `2026-10-0${day}`, start: Date.parse(`2026-10-0${day}T10:00`), end: Date.parse(`2026-10-0${day}T11:00`),
      entries: [{ id: CABLE, sets: [done(kg, 10)], hvBrand: b }] })
    const hvStrength = { [CABLE]: { lv: [20, 40, 60, 80, 100], u: 'kg', d: '2026-10-01' } }
    render(<div />, { extra: { hvStrength, workouts: [w('a', 1, 45, 'Life Fitness'), w('b', 2, 25, 'Matrix')] } })
    act(() => exerciseDetailsSheet(EXIDX[CABLE]))
    const host = sheet()
    const best = () => Number(host.querySelector('.hv-sl').textContent.match(/Best 1RM ([\d.]+)/)[1])
    const all = best()
    const sel = host.querySelector('.hv-xd-label')
    act(() => { sel.value = 'k:Matrix'; sel.dispatchEvent(new Event('change', { bubbles: true })) })
    expect(best()).toBeLessThan(all)
  })
})
