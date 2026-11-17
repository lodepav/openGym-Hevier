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

  it('a typed weight is the plan’s weight; + Set adds a set', () => {
    render([{ id: EX, mode: 'reps', sets: 2, reps: 8, weight: 60 }])
    typeInto(container.querySelectorAll('.hv-num')[2], '70')
    expect(slot().weight).toBe(70)
    act(() => container.querySelector('.hv-addset').click())
    expect(slot().sets).toBe(3)
  })

  it('+ Warm-up adds a warm-up beside + Set; each set row has a remove mark (D130)', () => {
    render([{ id: EX, mode: 'reps', sets: 2, reps: 8, weight: 60 }])
    act(() => container.querySelector('.hv-addrow .hv-addwarm').click())
    expect(slot()).toMatchObject({ sets: 2, warmupSets: 1 })
    const marks = () => [...container.querySelectorAll('.hv-rt-del')].map(b => b.getAttribute('aria-label'))
    expect(marks()).toEqual(['Remove warm-up 1', 'Remove set 1', 'Remove set 2'])
    expect([...container.querySelectorAll('.hv-rt-del svg')].map(i => i.dataset.icon)).toEqual(['minusCircle', 'minusCircle', 'minusCircle'])
    act(() => container.querySelector('[aria-label="Remove set 2"]').click())
    expect(slot()).toMatchObject({ sets: 1, warmupSets: 1 })
    act(() => container.querySelector('[aria-label="Remove set 1"]').click())
    expect(slot().sets).toBe(1)
    expect(useUI.getState().toastMsg).toBe('Keep at least one set, champ')
  })

  it('the rest is a chip that opens the rest sheet (D130)', () => {
    render([{ id: EX, mode: 'reps', sets: 2, reps: 8, weight: 60, restSec: 90 }])
    const chip = container.querySelector('.hv-addrow .hv-rtrest')
    expect(chip.getAttribute('aria-label')).toBe('Rest: 1:30')
    act(() => chip.click())
    expect(useUI.getState().sheets).toHaveLength(1)
    expect(useUI.getState().sheets[0].render(() => {}).props.off).toBe('Settings (1:30)')
    expect(container.querySelector('.hv-rest')).toBeNull()
  })

  it('the brand sits on the name line: + Brand adds one at the active gym, a tap on it changes it (D130)', () => {
    render([{ id: EX, mode: 'reps', sets: 2, reps: 8, weight: 60 }])
    act(() => useStore.getState().update(s => { s.equipProfiles = [{ id: 'g1', name: 'City Gym', items: [] }]; s.activeEquipId = 'g1' }))
    act(() => container.querySelector('.hv-nameline .hv-addbrand').click())
    const host = sheet()
    expect(host.textContent).toContain('Used for this exercise at City Gym from now on.')
    typeInto(host.querySelector('input'), 'Rogue')
    act(() => host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(useStore.getState().S.hvMachines[EX]).toEqual({ g1: 'Rogue' })
    const brand = container.querySelector('.hv-nameline .hv-brand')
    expect(brand.getAttribute('aria-label')).toBe('Brand: Rogue')
    act(() => brand.click())
    const again = sheet()
    act(() => byTextIn(again, 'button', 'Remove brand').click())
    expect(useStore.getState().S.hvMachines[EX]).toBeUndefined()
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

  it('a new routine’s default name is the placeholder; typing replaces it, emptying keeps it', () => {
    render([], { name: 'New routine' })
    const title = container.querySelector('.hv-rtitle')
    expect(title.value).toBe('')
    expect(title.placeholder).toBe('Routine title')
    typeInto(title, 'P')
    expect(useStore.getState().S.routines[0].name).toBe('P')
    typeInto(title, '')
    expect(useStore.getState().S.routines[0].name).toBe('New routine')
  })

  it('⋯ → Delete routine leaves the page with an Undo that puts it back', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 8, weight: 60 }])
    act(() => container.querySelector('[aria-label="More, Leg Day"]').click())
    const menu = sheet()
    act(() => byTextIn(menu, '.menu-item', 'Delete routine').click())
    expect(useStore.getState().S.routines).toHaveLength(0)
    expect(path).toBe('/routines')
    expect(useUI.getState().toastMsg).toBe('“Leg Day” gone.')
    act(() => useUI.getState().runToastAction())
    expect(useStore.getState().S.routines.map(r => r.name)).toEqual(['Leg Day'])
  })

  it('the warning sign of an exercise the gym lacks says why on a tap', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 8, weight: 60 }])
    act(() => {
      useStore.getState().update(s => { s.equipProfiles = [{ id: 'g1', name: 'City Gym', items: [] }] })
      localStorage.setItem('hevier_ex_gym', 'g1')
    })
    act(() => root.render(<MemoryRouter initialEntries={['/plan/r/r1']}><Routes>{hevierRoutes}</Routes></MemoryRouter>))
    const warn = container.querySelector('button.hv-warn')
    expect(warn.getAttribute('aria-label')).toMatch(/^Needs .+, which City Gym doesn’t have$/)
    act(() => warn.click())
    expect(useUI.getState().toastMsg).toBe(warn.getAttribute('aria-label'))
  })

  it('an exercise’s note is written from ⋮ → Note and shows as text; Remove note takes it out (D130)', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 8, weight: 0 }])
    expect(container.querySelector('.hv-notes-in')).toBeNull()
    act(() => container.querySelector('.hv-ex .hv-more').click())
    const menu = sheet()
    act(() => byTextIn(menu, '.menu-item', 'Note').click())
    const host = sheet()
    const area = host.querySelector('textarea')
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(area, ' Belt on ')
      area.dispatchEvent(new Event('input', { bubbles: true }))
    })
    act(() => host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(slot().note).toBe('Belt on')
    const shown = container.querySelector('.hv-ex .hv-exnote')
    expect(shown.textContent).toBe('Belt on')
    act(() => shown.click())
    const again = sheet()
    act(() => byTextIn(again, 'button', 'Remove note').click())
    expect(slot().note).toBeUndefined()
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
    const rows = host.querySelectorAll('.hv-pk-row .tap-main')
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
