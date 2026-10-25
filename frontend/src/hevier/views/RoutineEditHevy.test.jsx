// @vitest-environment happy-dom
// The fork's routine editor (DECISIONS.md D15), routed over upstream's
// /plan/r/:id by seam S2. Every edit lands in the routine as upstream's settings would save it.
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

function render(ex, extra = {}) {
  const S = Object.assign(clone(DEF), { weighIn: false })
  S.routines = [{ id: 'r1', name: 'Leg Day', emoji: 'dumbbell', prog: 'linear', ex, ...extra }]
  useStore.setState({ S, user: null, isGuest: () => true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={['/workout', '/plan/r/r1']} initialIndex={1}>
    <Routes>
      {hevierRoutes}
      <Route path="/plan/r/:id" element={<div id="upstream-editor" />} />
      <Route path="*" element={<div id="elsewhere" />} />
    </Routes>
    <Where />
  </MemoryRouter>))
}
const slot = (i = 0) => useStore.getState().S.routines[0].ex[i]
const byTextIn = (el, sel, text) => [...el.querySelectorAll(sel)].find(b => b.textContent.includes(text))
const byText = (sel, text) => [...container.querySelectorAll(sel)].find(b => b.textContent.includes(text))
const sheet = () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const r = createRoot(host)
  act(() => r.render(useUI.getState().sheets.at(-1).render(() => {})))
  return host
}
const typeInto = (input, text) => act(() => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, text)
  input.dispatchEvent(new Event('input', { bubbles: true }))
})

beforeEach(() => {
  localStorage.clear()
  useUI.setState({ sheets: [], toastMsg: '', timer: null, work: null })
})
afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  document.body.innerHTML = ''
})

describe('hevier: routine editor (M3)', () => {
  it('replaces upstream’s editor and draws SET · KG · REPS from the plan', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 8, weight: 60, warmupSets: 1 }])
    expect(container.querySelector('#upstream-editor')).toBeNull()
    expect(container.querySelector('.hv-rt-head').textContent).toBe('SETKGREPS')
    const marks = [...container.querySelectorAll('.hv-rt-row:not(.hv-rt-head) .hv-set')].map(b => b.textContent)
    expect(marks).toEqual(['W', '1', '2', '3'])
  })

  it('a typed weight is the plan’s weight; + Add Set adds a set', () => {
    render([{ id: EX, mode: 'reps', sets: 2, reps: 8, weight: 60 }])
    typeInto(container.querySelectorAll('.hv-num')[2], '70')
    expect(slot().weight).toBe(70)
    act(() => byText('.hv-addset', 'Add Set').click())
    expect(slot().sets).toBe(3)
  })

  it('a double-progression exercise shows its rep range', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 12, repsMin: 8, weight: 40, prog: 'double' }])
    expect(container.querySelector('.hv-rt-head').textContent).toContain('REP RANGE')
    expect(container.querySelector('.hv-rt-range').textContent).toBe('8–12')
  })

  it('set type W turns a work set into a warm-up', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 8, weight: 60 }])
    act(() => container.querySelectorAll('.hv-rt-row:not(.hv-rt-head) .hv-set')[0].click())
    const menu = sheet()
    act(() => [...menu.querySelectorAll('.menu-item')].find(m => m.textContent.includes('Warm-up set')).click())
    expect(slot()).toMatchObject({ sets: 2, warmupSets: 1 })
  })

  it('⋮ opens upstream’s exercise settings for drop sets, pyramid and progression', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 8, weight: 60 }])
    act(() => container.querySelector('.hv-ex .hv-more').click())
    const menu = sheet()
    const before = useUI.getState().sheets.length
    act(() => [...menu.querySelectorAll('.menu-item')].find(m => m.textContent.includes('Settings & progression')).click())
    expect(useUI.getState().sheets.length).toBe(before + 1)
    expect(sheet().textContent).toContain('Progression')
  })

  it('⋮ → Backups lists the slot’s backups and a remove saves at once; Replace offers them first (D45)', () => {
    const B = EXDB.filter(e => e.id !== EX && /dumbbell/i.test(e.eq || ''))[0]
    render([{ id: EX, mode: 'reps', sets: 3, reps: 8, weight: 60, subs: [B.id] }])
    act(() => container.querySelector('.hv-ex .hv-more').click())
    const menu = sheet()
    const row = [...menu.querySelectorAll('.menu-item')].find(m => m.textContent.includes('Backups'))
    expect(row.textContent).toContain(B.n.split(' ')[0])
    act(() => [...menu.querySelectorAll('.menu-item')].find(m => m.textContent.includes('Replace exercise')).click())
    const picker = sheet()
    expect(picker.textContent).toContain('Your backups')
    expect(picker.querySelector('.list .hv-pk-row').textContent.toLowerCase()).toContain(B.n.toLowerCase().split(' ')[0])
    act(() => row.click())
    const backups = sheet()
    expect(backups.textContent).toContain('Backups for')
    act(() => backups.querySelector('.hv-backups button[aria-label^="Remove"]').click())
    expect('subs' in slot()).toBe(false)
  })

  it('a save of upstream’s exercise settings keeps the backups (D45)', () => {
    const B = EXDB.filter(e => e.id !== EX && /dumbbell/i.test(e.eq || ''))[0]
    render([{ id: EX, mode: 'reps', sets: 3, reps: 8, weight: 60, subs: [B.id] }])
    act(() => container.querySelector('.hv-ex .hv-more').click())
    const menu = sheet()
    act(() => [...menu.querySelectorAll('.menu-item')].find(m => m.textContent.includes('Settings & progression')).click())
    const settings = sheet()
    act(() => [...settings.querySelectorAll('button')].filter(b => b.textContent.includes('Save')).at(-1).click())
    expect(slot().subs).toEqual([B.id])
  })

  it('the routine-wide progression stays, and Done goes back', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 8, weight: 60 }])
    expect(byText('.hv-rsettings *', 'Deload routine')).toBeTruthy()
    act(() => byText('button', 'Done').click())
    expect(path).toBe('/routines')  // no router index here: the fallback, the Workout tab's routines
  })

  it('the title edits the routine’s name', () => {
    render([])
    typeInto(container.querySelector('.hv-rtitle'), 'Push Day')
    expect(useStore.getState().S.routines[0].name).toBe('Push Day')
  })

  it('a handle moves an exercise, and a superset moves as one', () => {
    const [A, B, C] = EXDB.filter(e => /barbell/i.test(e.eq || '')).slice(0, 3).map(e => e.id)
    render([{ id: A, mode: 'reps', sets: 3, reps: 8, weight: 0 },
      { id: B, mode: 'reps', sets: 3, reps: 8, weight: 0, sg: 'sg1' }, { id: C, mode: 'reps', sets: 3, reps: 8, weight: 0, sg: 'sg1' }])
    const grips = () => container.querySelectorAll('.hv-ex .hv-grip')
    expect(grips().length).toBe(3)
    act(() => grips()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })))
    expect(useStore.getState().S.routines[0].ex.map(e => e.id)).toEqual([B, C, A])
    expect(useStore.getState().S.routines[0].ex.slice(0, 2).every(e => e.sg === 'sg1')).toBe(true)
  })

  it('Add superset adds the ticked exercises linked as one superset', () => {
    render([{ id: EX, sets: 3, reps: 5, w: 60 }])
    act(() => byText('button', 'Add Exercise').click())
    const host = sheet()
    const rows = host.querySelectorAll('.hv-pk-row')
    act(() => rows[0].click())
    expect(host.querySelector('.hv-pk-add').textContent).not.toContain('Add superset')
    act(() => rows[1].click())
    act(() => byTextIn(host, 'button', 'Add superset').click())
    const ex = useStore.getState().S.routines[0].ex
    expect(ex).toHaveLength(3)
    expect(ex[0].sg).toBeUndefined()
    expect(ex[1].sg).toBeTruthy()
    expect(ex[2].sg).toBe(ex[1].sg)
    host.remove()
  })
})
