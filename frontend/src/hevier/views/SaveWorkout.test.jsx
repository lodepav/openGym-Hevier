// @vitest-environment happy-dom
// Finish → Save Workout → "Nice work!" through seam S9 (hevier/DECISIONS.md D10): the page writes
// the session's name and note, upstream's doFinishWorkout saves it, and the summary reads it back.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { setNav, nav } from '../../lib/nav.js'
import { finishWorkout } from '../../sheets.jsx'
import { hevierRoutes } from '../routes.jsx'
import { hooks, installFinishHook } from '../hooks.js'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const EX = EXDB.find(e => /barbell/i.test(e.eq || '')).id
const pad = n => String(n).padStart(2, '0')
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
let root, container, path

function Bridge() { const n = useNavigate(); setNav(n); path = useLocation().pathname; return null }

function render(at, entries) {
  const S = Object.assign(clone(DEF), { weighIn: false })
  const start = Date.now() - 45 * 60000
  S.active = { id: 'hv1', d: iso(new Date(start)), start, name: 'Leg Day', cur: 0, entries }
  useStore.setState({ S, user: null, isGuest: () => true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={['/home', at]} initialIndex={1}>
    <Routes>{hevierRoutes}<Route path="*" element={<div id="elsewhere" />} /></Routes>
    <Bridge />
  </MemoryRouter>))
}
const typeInto = (el, text) => act(() => {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, text)
  el.dispatchEvent(new Event('input', { bubbles: true }))
})
const byText = (sel, text) => [...container.querySelectorAll(sel)].find(b => b.textContent.includes(text))
const logged = () => [{ id: EX, target: { sets: 2, reps: 8 }, sets: [{ w: 60, r: 8, done: true, at: Date.now() - 60000 }, { w: 60, r: 8, done: false }] }]

beforeEach(() => {
  localStorage.clear()
  useUI.setState({ sheets: [], toastMsg: '', timer: null, work: null })
  installFinishHook(nav)
})
afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  hooks.finish = hooks.done = null
})

describe('hevier: Save Workout (seam S9)', () => {
  it('Finish opens the Save page instead of upstream’s confirm', () => {
    render('/workout', logged())
    act(() => finishWorkout())
    expect(path).toBe('/workout/save')
    expect(useUI.getState().sheets).toHaveLength(0)
    expect(container.querySelector('.hv-save')).toBeTruthy()
    expect(container.querySelector('.hv-warn').textContent).toContain('1 set still unchecked')
  })

  it('writes the day’s auto-backup again once the gym label is on the saved workout (D20, D28)', () => {
    render('/workout/save', logged())
    useStore.setState(st => ({ S: { ...st.S, equipProfiles: [{ id: 'g1', name: 'City Gym', equipment: [] }], activeEquipId: 'g1' } }))
    const seen = []
    const spy = vi.spyOn(useStore.getState(), 'autoBackupNow').mockImplementation(() => { seen.push(clone(useStore.getState().S.workouts)) })
    act(() => byText('.hv-pagebar button', 'Save').click())
    spy.mockRestore()
    expect(seen.length).toBeGreaterThan(1)
    expect(seen.at(-1)[0].entries[0].hvGym).toBe('g1')
  })

  it('saves the title and description through upstream’s finish, then shows Nice work!', () => {
    render('/workout/save', logged())
    typeInto(container.querySelector('.hv-stitle'), 'Heavy legs')
    typeInto(container.querySelector('.hv-sdesc'), 'Felt strong')
    act(() => byText('.hv-pagebar button', 'Save').click())
    const S = useStore.getState().S
    expect(S.active).toBeNull()
    expect(S.workouts).toHaveLength(1)
    expect(S.workouts[0]).toMatchObject({ id: 'hv1', name: 'Heavy legs', note: 'Felt strong' })
    expect(useUI.getState().sheets).toHaveLength(0)   // upstream's summary sheet is not opened
    expect(path).toBe('/workout/done')
    expect(container.textContent).toContain('Nice work!')
    expect(container.textContent).toContain('That’s workout number 1.')
    expect(container.querySelector('.hv-wcard').textContent).toContain('Heavy legs')
    expect(container.textContent).toContain('New PR:')
    act(() => byText('.hv-done-btn', 'Done').click())
    expect(path).toBe('/home')
  })

  it('a changed Duration lands on the saved record; the day stays the session\'s', () => {
    render('/workout/save', logged())
    expect(container.querySelector('input[type="date"]')).toBeNull()
    typeInto(container.querySelector('.hv-smin'), '40')
    act(() => byText('.hv-pagebar button', 'Save').click())
    const [w] = useStore.getState().S.workouts
    expect(w.d).toBe(iso(new Date()))
    expect(w.end - w.start).toBe(40 * 60000)
    expect(container.textContent).toContain('Nice work!')
  })

  it('Discard Workout ends the session after upstream’s confirm', () => {
    render('/workout/save', logged())
    act(() => byText('.hv-sdiscard', 'Discard').click())
    const sheet = useUI.getState().sheets.at(-1)
    const div = document.createElement('div')
    const r = createRoot(div)
    act(() => r.render(sheet.render(() => {})))
    act(() => byTextIn(div, 'button', 'Discard').click())
    expect(useStore.getState().S.active).toBeNull()
    expect(useStore.getState().S.workouts).toHaveLength(0)
    expect(path).toBe('/home')
    act(() => r.unmount())
  })
})

describe('hevier: Update routine from the summary (D35)', () => {
  const CURL = EXDB.find(e => /^lever lying leg curl$/i.test(e.n)).id
  const withRoutine = () => {
    render('/workout/save', [
      { ...logged()[0], rid: 'r1' },
      { id: CURL, rid: 'r1', target: { sets: 3, reps: 10 }, sets: [{ w: 30, r: 10, done: true, at: Date.now() - 30000 }] },
    ])
    useStore.getState().update(s => { s.routines = [{ id: 'r1', name: 'Leg Day', ex: [{ id: EX, sets: 2, reps: 8, weight: 60 }] }] })
    act(() => byText('.hv-pagebar button', 'Save').click())
  }
  const routineIds = () => useStore.getState().S.routines[0].ex.map(e => e.id)

  it('a small button keeps the added exercise in the routine, with Undo', () => {
    withRoutine()
    const btn = container.querySelector('.hv-ru')
    expect(btn.textContent).toContain('Update Leg Day')
    expect(btn.textContent).toContain('+1')
    act(() => btn.click())
    expect(routineIds()).toEqual([EX, CURL])
    expect(container.querySelector('.hv-ru')).toBeNull()
    expect(useUI.getState().toastMsg).toBe('“Leg Day” updated')
    act(() => useUI.getState().toastAction.run())
    expect(routineIds()).toEqual([EX])
  })

  it('goes by itself after ten seconds, and the routine stays as it was', () => {
    vi.useFakeTimers()
    try {
      withRoutine()
      act(() => vi.advanceTimersByTime(9000))
      expect(container.querySelector('.hv-ru.leaving')).toBeNull()
      act(() => vi.advanceTimersByTime(1000))
      expect(container.querySelector('.hv-ru.leaving')).toBeTruthy()
      act(() => vi.advanceTimersByTime(500))
      expect(container.querySelector('.hv-ru')).toBeNull()
      expect(routineIds()).toEqual([EX])
    } finally { vi.useRealTimers() }
  })

  it('no button after a freestyle workout', () => {
    render('/workout/save', logged())
    act(() => byText('.hv-pagebar button', 'Save').click())
    expect(container.textContent).toContain('Nice work!')
    expect(container.querySelector('.hv-ru')).toBeNull()
  })
})
const byTextIn = (el, sel, text) => [...el.querySelectorAll(sel)].filter(b => b.textContent.includes(text)).at(-1)

describe('hevier: the summary stays put', () => {
  it('keeps showing the workout when a sync rewrites its record', () => {
    render('/workout/save', logged())
    act(() => byText('.hv-pagebar button', 'Save').click())
    expect(container.textContent).toContain('Nice work!')
    act(() => useStore.getState().update(s => { s.workouts = s.workouts.map(w => ({ ...w, id: 'other' })) }))
    expect(path).toBe('/workout/done')
    expect(container.textContent).toContain('Nice work!')
  })

  it('the header’s Done goes while the bottom one is on screen', () => {
    let seen
    const IO = globalThis.IntersectionObserver
    globalThis.IntersectionObserver = class { constructor(cb) { seen = cb } observe() {} disconnect() {} }
    try {
      render('/workout/save', logged())
      act(() => byText('.hv-pagebar button', 'Save').click())
      expect(byText('.hv-pagebar button', 'Done')).toBeTruthy()
      act(() => seen([{ isIntersecting: true }]))
      expect(byText('.hv-pagebar button', 'Done')).toBeUndefined()
      act(() => seen([{ isIntersecting: false }]))
      expect(byText('.hv-pagebar button', 'Done')).toBeTruthy()
    } finally { globalThis.IntersectionObserver = IO }
  })
})
