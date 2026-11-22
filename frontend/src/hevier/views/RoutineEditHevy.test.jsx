// @vitest-environment happy-dom
// The fork's routine editor (DECISIONS.md D15), routed over upstream's
// /plan/r/:id by seam S2. Every edit lands in the routine as upstream's settings would save it.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { bindUI } from '../../components/ui.jsx'
import { EXDB } from '../../lib/exercises.js'
import { modeOf } from '../../lib/history.js'
import { hevierRoutes } from '../routes.jsx'
import { tableShape } from '../lib/routine-table.js'
import { loadOfRoutine } from '../../lib/muscles.js'
import { hooks } from '../hooks.js'
import { isPlain, plainRows } from '../lib/plain-routine.js'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))
// Counted, to show a title key redraws no exercise card (the second audit, 2026-11-21).
vi.mock('../lib/routine-table.js', async orig => { const m = await orig(); return { ...m, tableShape: vi.fn(m.tableShape) } })
vi.mock('../../lib/muscles.js', async orig => { const m = await orig(); return { ...m, loadOfRoutine: vi.fn(m.loadOfRoutine) } })

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

  it('a lb exercise in a kg profile reads and types lb, stored in kg (the sixth audit, 2026-11-22)', () => {
    render([{ id: EX, mode: 'reps', sets: 1, reps: 8, weight: 20.4117 }])
    act(() => useStore.setState(st => ({ S: { ...st.S, exUnit: { [EX]: { unit: 'lb', _ts: 1 } } } })))
    expect(container.querySelector('.hv-rt-head').textContent).toBe('SETLBREPS')
    const w = container.querySelector('.hv-num')
    expect(w.getAttribute('aria-label')).toBe('Set 1, Weight (lb)')
    expect(w.value).toBe('45')
    // Key by key: each step reads as typed, none snaps back through the kg it is stored as.
    for (const typed of ['4', '47', '47.', '47.5']) {
      typeInto(w, typed)
      expect(container.querySelector('.hv-num').value).toBe(typed)
    }
    expect(slot().weight).toBe(21.5456)
    // A kg weight reads to the routine page's places: 50 kg is 110.2 lb, not 110.23.
    act(() => useStore.getState().update(s => { s.routines[0].ex[0].weight = 50 }))
    expect(container.querySelector('.hv-num').value).toBe('110.2')
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
    act(() => container.querySelector('.hv-nameline .hv-brand:not(.has)').click())
    const host = sheet()
    expect(host.textContent).toContain('Used for this exercise at City Gym from now on.')
    typeInto(host.querySelector('input'), 'Rogue')
    act(() => host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(useStore.getState().S.hvMachines[EX]).toEqual({ g1: 'Rogue' })
    const brand = container.querySelector('.hv-nameline .hv-brand')
    expect(brand.getAttribute('aria-label')).toBe('Brand: Rogue')
    act(() => brand.click())
    const again = sheet()
    // The current brand's quick pick says it is the one (the fifth audit, 2026-11-21).
    expect(byTextIn(again, '.hv-xd-chips button', 'Rogue').getAttribute('aria-pressed')).toBe('true')
    act(() => byTextIn(again, 'button', 'Remove brand').click())
    expect(useStore.getState().S.hvMachines[EX]).toBeUndefined()
  })

  it('a double-progression exercise shows its rep range', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 12, repsMin: 8, weight: 40, prog: 'double' }])
    expect(container.querySelector('.hv-rt-head').textContent).toContain('REP RANGE')
    expect(container.querySelector('.hv-rt-range').textContent).toBe('8–12')
    expect(container.querySelector('.hv-rt-range').getAttribute('aria-label')).toBe('Set 1, Reps, 8–12')   // the fifth audit, 2026-11-21
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

  // Not per key: each write redrew every exercise card (the audit, 2026-11-21).
  it('the title edits the routine’s name after a pause, on leaving the field, or when the page closes', () => {
    vi.useFakeTimers()
    try {
      render([])
      const title = container.querySelector('.hv-rtitle')
      typeInto(title, 'Push')
      expect(useStore.getState().S.routines[0].name).toBe('Leg Day')
      act(() => vi.advanceTimersByTime(500))
      expect(useStore.getState().S.routines[0].name).toBe('Push')
      typeInto(title, 'Push Day')
      act(() => title.dispatchEvent(new FocusEvent('focusout', { bubbles: true })))
      expect(useStore.getState().S.routines[0].name).toBe('Push Day')
      typeInto(title, 'Pull Day')
      act(() => root.unmount())
      root = null
      expect(useStore.getState().S.routines[0].name).toBe('Pull Day')
    } finally { vi.useRealTimers() }
  })

  it('a new routine’s default name is the placeholder; typing replaces it, emptying keeps it', () => {
    render([], { name: 'New routine' })
    const title = container.querySelector('.hv-rtitle')
    expect(title.value).toBe('')
    expect(title.placeholder).toBe('Routine title')
    const blur = () => act(() => title.dispatchEvent(new FocusEvent('focusout', { bubbles: true })))
    typeInto(title, 'P')
    blur()
    expect(useStore.getState().S.routines[0].name).toBe('P')
    typeInto(title, '')
    blur()
    expect(useStore.getState().S.routines[0].name).toBe('New routine')
  })

  // The second audit, 2026-11-21: the page stayed mounted, so the field kept the original's name.
  it('a key in the title redraws no exercise card', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 8, weight: 60 }, { id: EX, mode: 'reps', sets: 3, reps: 8, weight: 60 }])
    const n = tableShape.mock.calls.length
    typeInto(container.querySelector('.hv-rtitle'), 'Leg Day 2')
    expect(tableShape.mock.calls.length).toBe(n)
  })

  // The audit leftovers, 2026-11-21: Android may kill the app in the background before the pause ends.
  it('a title typed is written when the app goes to the background', () => {
    vi.useFakeTimers()
    render([{ id: EX, mode: 'reps', sets: 3, reps: 8, weight: 60 }])
    typeInto(container.querySelector('.hv-rtitle'), 'Leg Day 2')
    const vis = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState') || {}
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    delete document.visibilityState
    if (vis.get) Object.defineProperty(Document.prototype, 'visibilityState', vis)
    expect(useStore.getState().S.routines[0].name).toBe('Leg Day 2')
    vi.useRealTimers()
  })

  // The eighth critique, 2026-11-22: the body map is the routine page's; the editor ends at its settings.
  it('draws no body map and works none out', () => {
    const n = loadOfRoutine.mock.calls.length
    render([{ id: EX, mode: 'reps', sets: 3, reps: 8, weight: 60 }])
    expect(container.querySelector('.hv-rmap')).toBeNull()
    expect(loadOfRoutine.mock.calls.length).toBe(n)
  })

  it('says once on the first exercise what "–" under the weight means, gone after that visit (S.hvDashTipSeen)', () => {
    const tip = () => [...container.querySelectorAll('.hv-rt-tip')].map(p => p.textContent)
    render([{ id: EX, mode: 'reps', sets: 2, reps: 8 }, { id: EX, mode: 'reps', sets: 2, reps: 8 }])
    expect(tip()).toEqual(['– opens at last time’s weight.'])
    expect(container.querySelector('.hv-ex .hv-rt-tip').closest('.hv-ex')).toBe(container.querySelector('.hv-ex'))
    expect(useStore.getState().S.hvDashTipSeen).toBeUndefined()
    act(() => root.unmount()); container.remove(); root = null
    expect(useStore.getState().S.hvDashTipSeen).toBe(true)
    render([{ id: EX, mode: 'reps', sets: 2, reps: 8 }])
    act(() => useStore.getState().update(s => { s.hvDashTipSeen = true }))
    expect(tip()).toEqual([])
    act(() => root.unmount()); container.remove(); root = null
    // A routine with progression on opens at its rule: the tip says so, and what Auto means (the ninth critique).
    useStore.getState().update(s => { delete s.hvDashTipSeen })
    render([{ id: EX, mode: 'reps', sets: 2, reps: 8 }], { hvProg: true })
    expect(tip()).toEqual(['– lets the rule pick the weight. Auto warm-ups ramp up to it.'])
    // No rule to pick it, or a deload routine: the plain tip.
    act(() => useStore.getState().update(s => { s.routines[0].prog = 'off' }))
    expect(tip()).toEqual(['– opens at last time’s weight.'])
    act(() => useStore.getState().update(s => { s.routines[0].prog = 'linear'; s.routines[0].excludeFromProgression = true }))
    expect(tip()).toEqual(['– opens at last time’s weight.'])
  })

  it('the Progression row carries its rule’s description, and the switch does not contradict "No automatic progression"', () => {
    const rowOf = title => [...container.querySelectorAll('.hv-rsettings .lrow')].find(r => r.querySelector('.lrow-t')?.textContent === title)
    const sub = title => rowOf(title)?.querySelector('.lrow-s')?.textContent
    render([{ id: EX, mode: 'reps', sets: 3, reps: 8, weight: 60 }], { hvProg: true })
    expect(sub('Progression')).toMatch(/^Hit every rep in every set/)
    expect(sub('Progression & auto warm-ups')).toMatch(/^Targets move by the rule below/)
    expect(container.querySelector('.hv-rsettings-note')).toBeNull()
    act(() => useStore.getState().update(s => { s.routines[0].prog = 'off' }))
    expect(rowOf('Progression').querySelector('.lrow-v').textContent).toBe('No automatic progression')
    expect(sub('Progression')).toMatch(/^Targets stay where you set them\./)
    expect(sub('Progression & auto warm-ups')).toBe('Warm-ups ramp up to the work weight.')
    bindUI(useUI)
    act(() => rowOf('Progression').click())
    const host = sheet()
    act(() => [...host.querySelectorAll('button')].find(b => b.textContent.includes('Double progression')).click())
    expect(useStore.getState().S.routines[0].prog).toBe('double')
  })

  it('numbers each warm-up in its spoken name', () => {
    render([{ id: EX, mode: 'reps', sets: 2, reps: 8, weight: 60, warmupSets: 2 }])
    const names = [...container.querySelectorAll('.hv-rt-row .hv-set')].map(b => b.getAttribute('aria-label'))
    expect(names.slice(0, 2)).toEqual(['Warm-up 1, Set type', 'Warm-up 2, Set type'])
  })

  it('a first exercise with no weight column draws no tip, so leaving does not mark it seen', () => {
    const run = EXDB.find(e => modeOf({ id: e.id }) === 'cardio').id
    render([{ id: run, mode: 'cardio', sets: 1, min: 20 }, { id: EX, mode: 'reps', sets: 2, reps: 8 }])
    expect(container.querySelector('.hv-rt-tip')).toBeNull()
    act(() => root.unmount()); container.remove(); root = null
    expect(useStore.getState().S.hvDashTipSeen).toBeUndefined()
  })

  it('a set’s type button says what it opens', () => {
    render([{ id: EX, mode: 'reps', sets: 1, reps: 8 }])
    expect(container.querySelector('.hv-rt-row:not(.hv-rt-head) .hv-set').getAttribute('aria-label')).toMatch(/, Set type$/)
  })

  // The fresh audit, 2026-11-21: each key in a set field redrew every exercise card.
  it('a key in one card’s set field redraws that card only', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 8, weight: 60 }, { id: EX, mode: 'reps', sets: 3, reps: 12, weight: 60 }])
    const n = tableShape.mock.calls.length
    const field = container.querySelectorAll('.hv-ex')[1].querySelector('input.hv-num')
    typeInto(field, '9')
    act(() => field.dispatchEvent(new Event('change', { bubbles: true })))
    // The second card redraws; the first (8 reps) is not drawn again.
    const drawn = tableShape.mock.calls.slice(n).map(c => c[0].reps)
    expect(drawn.length).toBeGreaterThan(0)
    expect(drawn).not.toContain(8)
  })

  it('⋯ → Copy routine opens the copy with its own name in the title', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 8, weight: 60 }])
    act(() => container.querySelector('[aria-label="More, Leg Day"]').click())
    const menu = sheet()
    act(() => byTextIn(menu, '.menu-item', 'Copy routine').click())
    const copy = useStore.getState().S.routines.find(r => r.id !== 'r1')
    expect(path).toBe('/plan/r/' + copy.id)
    expect(container.querySelector('.hv-rtitle').value).toBe(copy.name)
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

  it('a routine deleted elsewhere while the editor is open leaves the page without a crash', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 8, weight: 60 }])
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    // A sync (or another tab) takes the routine out: the editor redraws once before it navigates.
    act(() => useStore.getState().update(s => { s.routines = [] }))
    expect(errors).not.toHaveBeenCalled()
    errors.mockRestore()
    expect(path).toBe('/routines')
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

describe('hevier: routine editor, a planned timed hold (D146)', () => {
  beforeAll(() => { hooks.plainRoutine = { is: isPlain, rows: plainRows } })   // D69, as hevier/index.js installs it
  afterAll(() => { hooks.plainRoutine = null })
  const marks = () => [...container.querySelectorAll('.hv-rt-row:not(.hv-rt-head) .hv-set')].map(b => b.textContent)
  const setType = (n, label) => {
    act(() => container.querySelectorAll('.hv-rt-row:not(.hv-rt-head) .hv-set')[n].click())
    const menu = sheet()
    const item = [...menu.querySelectorAll('.menu-item')].find(m => m.textContent.includes(label))
    act(() => item.click())
    return item
  }

  it('Timed hold in the set type sheet makes a set a hold with a time; Normal set turns it back', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 8, weight: 60 }])
    const item = setType(1, 'Timed hold')
    expect(item.textContent).toContain('Seconds in place of reps')
    expect(slot().hvHolds).toEqual({ 1: 45 })
    expect(marks()).toEqual(['1', 'H', '2'])
    expect(container.querySelector('.hv-set .hv-h')).not.toBeNull()
    const time = container.querySelector('input.hv-dur')
    expect(time.value).toBe('0:45')
    expect(time.getAttribute('aria-label')).toBe('Hold 1, Time')
    typeInto(time, '40')
    expect(slot().hvHolds).toEqual({ 1: 40 })
    act(() => time.dispatchEvent(new Event('blur', { bubbles: true })))
    setType(1, 'Normal set')
    expect(slot().hvHolds).toBeUndefined()
    expect(marks()).toEqual(['1', '2', '3'])
  })

  it('shows a hold carried over from last time; Normal set plans a rep set over it', () => {
    const S = { routineId: 'r1', routineIds: ['r1'], d: '2026-11-10', start: 1, end: 2, entries: [{ id: EX, rid: 'r1',
      sets: [{ w: 60, r: 8, done: true }, { w: 60, mode: 'time', sec: 50, done: true }, { w: 60, r: 8, done: true }] }] }
    render([{ id: EX, mode: 'reps', sets: 3, reps: 8, weight: 60 }])
    act(() => useStore.getState().update(s => { s.workouts = [{ id: 'w0', ...S }] }))
    expect(marks()).toEqual(['1', 'H', '2'])
    expect(container.querySelector('input.hv-dur').value).toBe('0:50')
    setType(1, 'Normal set')
    expect(slot().hvHolds).toEqual({ 1: 0 })
    expect(marks()).toEqual(['1', '2', '3'])
  })

  it('a routine with progression on offers no timed hold', () => {
    render([{ id: EX, mode: 'reps', sets: 3, reps: 8, weight: 60 }], { hvProg: true })
    act(() => container.querySelectorAll('.hv-rt-row:not(.hv-rt-head) .hv-set')[1].click())
    expect([...sheet().querySelectorAll('.menu-item')].some(m => m.textContent.includes('Timed hold'))).toBe(false)
  })
})
