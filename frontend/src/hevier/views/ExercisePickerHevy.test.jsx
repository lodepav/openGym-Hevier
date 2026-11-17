// @vitest-environment happy-dom
// The Hevy Add Exercise picker through seam S13: upstream's exercisePicker
// opens the fork's sheet; an add picks several, a titled pick (Replace, swap) takes one tap.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { exercisePicker, swapActiveWorkoutExercise } from '../../sheets.jsx'
import { hooks } from '../hooks.js'
import { installExercisePicker, Exercises } from './ExercisePickerHevy.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const BENCH = EXDB.find(e => /^barbell bench press$/i.test(e.n))
const SQUAT = EXDB.find(e => /^barbell (full )?squat$/i.test(e.n))
let root, container

function open(onPick, opts, workouts = [], extra = {}) {
  const S = Object.assign(clone(DEF), extra)
  S.workouts = workouts
  useStore.setState({ S, user: null })
  exercisePicker(onPick, opts)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const sheet = useUI.getState().sheets.at(-1)
  act(() => root.render(sheet.render(() => useUI.getState().closeSheet(sheet.id))))
}
const search = q => act(() => {
  const input = container.querySelector('input')
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, q)
  input.dispatchEvent(new Event('input', { bubbles: true }))
})
const rowOf = ex => [...container.querySelectorAll('.hv-pk-row')].find(r => r.querySelector('.tt').textContent === ex.n)
const click = el => act(() => el.click())

beforeEach(() => { useUI.setState({ sheets: [], toastMsg: '' }); installExercisePicker() })
afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  hooks.exercisePicker = null
})

describe('hevier: Add Exercise picker (seam S13)', () => {
  it('finds an exercise by its machine brand and says so under the name (D36)', () => {
    const PRESS = EXDB.find(e => /^sled 45° leg press$/i.test(e.n))
    open(vi.fn(), undefined, [{ d: '2026-10-01', entries: [{ id: PRESS.id, hvBrand: 'Life Fitness', sets: [{ w: 100, r: 10, done: true }] }] }])
    search('lifefitness')
    const first = container.querySelector('.hv-pk-row')
    expect(first.querySelector('.tt').textContent).toBe(PRESS.n)
    expect(first.querySelector('.ss').textContent).toContain('Life Fitness')
  })

  it('adds several exercises in the order they were ticked, with upstream’s quick add', () => {
    const onPick = vi.fn()
    open(onPick)
    expect(container.querySelector('.hv-pk')).toBeTruthy()
    search(SQUAT.n)
    click(rowOf(SQUAT).querySelector('.tap-main'))
    search(BENCH.n)
    click(rowOf(BENCH).querySelector('.tap-main'))
    expect(onPick).not.toHaveBeenCalled()
    const add = container.querySelector('.hv-pk-add button')
    expect(add.textContent).toBe('Add 2 exercises')
    click(add)
    expect(onPick.mock.calls.map(([e, quick]) => [e.id, quick])).toEqual([[SQUAT.id, true], [BENCH.id, true]])
    expect(useUI.getState().sheets).toHaveLength(0)
  })

  it('its sections are h4 under the sheet’s h3 title, and h2 under the library page’s h1', () => {
    open(vi.fn())
    expect(container.querySelector('.hv-pk-hd h3')).toBeTruthy()
    expect(container.querySelectorAll('h4.sec').length).toBeGreaterThan(0)
    expect(container.querySelector('h2.sec')).toBeNull()
    act(() => root.render(<MemoryRouter><Exercises /></MemoryRouter>))
    expect(container.querySelector('h1')).toBeTruthy()
    expect([...container.querySelectorAll('h2.sec')].map(h => h.textContent)).toContain('All Exercises')
    expect(container.querySelector('h4.sec')).toBeNull()
  })

  it('with nothing found, Create “…” opens the new exercise named as typed', () => {
    open(vi.fn())
    expect(container.querySelector('.hv-pk-create')).toBeNull()
    search('Qqzxj curl')
    const create = container.querySelector('.hv-pk-create')
    expect(create.textContent).toBe('Create “Qqzxj curl”')
    const before = useUI.getState().sheets.length
    click(create)
    expect(useUI.getState().sheets.length).toBe(before + 1)
    const host = document.createElement('div')
    document.body.appendChild(host)
    const r = createRoot(host)
    act(() => r.render(useUI.getState().sheets.at(-1).render(() => {})))
    expect([...host.querySelectorAll('input')].some(i => i.value === 'Qqzxj curl')).toBe(true)
    act(() => r.unmount())
    host.remove()
  })

  it('the chart button opens the exercise without picking or ticking it', () => {
    const onPick = vi.fn()
    open(onPick)
    search(BENCH.n)
    const opened = []
    hooks.exerciseDetail = ex => opened.push(ex.id)
    click(rowOf(BENCH).querySelector('.hv-pk-info'))
    hooks.exerciseDetail = null
    expect(opened).toEqual([BENCH.id])
    expect(onPick).not.toHaveBeenCalled()
    expect(container.querySelector('.hv-pk-add')).toBeNull()
    expect(useUI.getState().sheets).toHaveLength(1)
  })

  it('a second tap unticks', () => {
    open(vi.fn())
    search(BENCH.n)
    click(rowOf(BENCH).querySelector('.tap-main'))
    click(rowOf(BENCH).querySelector('.tap-main'))
    expect(container.querySelector('.hv-pk-add')).toBeNull()
  })

  it('a Replace takes one tap and opens on the same muscle', () => {
    const onPick = vi.fn()
    open(onPick, { title: 'Replace exercise', like: BENCH.id })
    expect(container.querySelector('.hv-pk-filters').textContent).toContain('Chest')
    expect(rowOf(BENCH)).toBeUndefined()
    const first = container.querySelector('.hv-pk-row')
    click(first.querySelector('.tap-main'))
    expect(onPick).toHaveBeenCalledTimes(1)
    expect(onPick.mock.calls[0][1]).toBe(true)
    expect(container.querySelector('.hv-pk-check')).toBeNull()
  })

  it('the routine editor’s Replace keeps the slot’s backups first, then the substitutes (D45, #674)', () => {
    open(vi.fn(), { title: 'Replace exercise', like: BENCH.id, backups: [SQUAT.id] })
    const heads = [...container.querySelectorAll('h4.sec')].map(h => h.textContent)
    expect(heads.slice(0, 2)).toEqual(['Your backups', 'Suggested substitutes'])
    expect(container.querySelector('.list .hv-pk-row .tt').textContent).toBe(SQUAT.n)
    const sug = [...container.querySelectorAll('section[aria-label="Suggested substitutes"] .hv-pk-row .tt')].map(e => e.textContent)
    expect(sug.length).toBeGreaterThan(0)
    expect(sug.length).toBeLessThanOrEqual(3)
    expect(sug).not.toContain(SQUAT.n)
    expect(sug).not.toContain(BENCH.n)
    expect(container.querySelector('.hv-pk-use')).toBeNull()
    search('curl')
    expect(container.textContent).not.toContain('Your backups')
    expect(container.textContent).not.toContain('Suggested substitutes')
  })

  describe('the live workout’s Swap and Add (D129)', () => {
    const ROW = EXDB.find(e => /^barbell bent over row$/i.test(e.n))
    const DB_BENCH = EXDB.find(e => /^dumbbell bench press$/i.test(e.n))
    const FLY = EXDB.find(e => /^dumbbell fly$/i.test(e.n))
    const done = (id, w, extra = {}) => ({ id, rid: 'r1', sets: [{ w, r: 8, done: true }], ...extra })
    const routine = () => ({ id: 'r1', name: 'Full A', ex: [SQUAT, BENCH, ROW].map(e => ({ id: e.id, sets: 3, reps: 8 })) })
    const history = () => [
      { id: 'w1', d: '2026-09-01', start: Date.parse('2026-09-01T10:00:00'), routineIds: ['r1'], entries: [done(SQUAT.id, 100), done(BENCH.id, 60), done(ROW.id, 50)] },
      { id: 'w2', d: '2026-09-08', start: Date.parse('2026-09-08T10:00:00'), routineIds: ['r1'], entries: [done(SQUAT.id, 100), done(DB_BENCH.id, 27.5), done(ROW.id, 50)] },
      { id: 'w3', d: '2026-09-10', start: Date.parse('2026-09-10T10:00:00'), routineIds: [], entries: [done(FLY.id, 14, { rid: undefined })] },
    ]
    const live = () => {
      const S = clone(DEF)
      S.routines = [routine()]
      S.workouts = history()
      S.active = { start: Date.now(), routineIds: ['r1'], cur: 0, entries: [SQUAT, BENCH, ROW].map(e => ({ id: e.id, rid: 'r1', target: { sets: 3, reps: 8, ...(e === BENCH ? { subs: [SQUAT.id] } : {}) }, sets: [{ w: 0, r: 8, done: false }] })) }
      useStore.setState({ S, user: null })
      container = document.createElement('div')
      document.body.appendChild(container)
      root = createRoot(container)
    }
    const render = () => act(() => root.render(useUI.getState().sheets.at(-1).render(() => {})))
    const heads = () => [...container.querySelectorAll('h4.sec')].map(h => h.textContent)
    const names = sec => [...container.querySelectorAll(`section[aria-label="${sec}"] .hv-pk-row .tt`)].map(e => e.textContent)

    it('Swap is titled with the exercise and lists your swaps, what you have done, then what you have not tried', () => {
      live()
      swapActiveWorkoutExercise(1)
      render()
      expect(container.querySelector('h3').textContent).toBe('Swap ' + BENCH.n)
      expect(heads().slice(0, 3)).toEqual(['You swapped to these before', 'You have done these', 'Same movement, not tried yet'])
      expect(container.textContent).not.toContain('Your backups')
      expect(names('You swapped to these before')).toEqual([DB_BENCH.n])
      expect(names('You have done these')).toEqual([FLY.n])
      const tried = names('Same movement, not tried yet')
      expect(tried.length).toBeGreaterThan(0)
      expect(tried).not.toContain(DB_BENCH.n)
      expect(tried).not.toContain(FLY.n)
      const swapped = container.querySelector('section[aria-label="You swapped to these before"] .hv-pk-row')
      expect(swapped.querySelector('.ss').textContent).toMatch(/^once · .+ · 27\.5 kg × 8$/)
      expect(swapped.querySelector('.tap-main').getAttribute('aria-label')).toMatch(new RegExp('^Use ' + DB_BENCH.n, 'i'))
      expect(swapped.querySelector('.hv-pk-use').textContent).toBe('Use')
      search('curl')
      expect(heads()).not.toContain('You swapped to these before')
      expect(container.textContent).not.toContain('Same movement, not tried yet')
    })

    it('Use swaps in one tap, for this workout only: the routine stays as it was', () => {
      live()
      const before = clone(useStore.getState().S.routines)
      swapActiveWorkoutExercise(1)
      render()
      click(container.querySelector('section[aria-label="You swapped to these before"] .tap-main'))
      const S = useStore.getState().S
      expect(S.active.entries.map(e => e.id)).toEqual([SQUAT.id, DB_BENCH.id, ROW.id])
      expect(S.active.entries[1].rid).toBe('r1')
      expect(S.routines).toEqual(before)
      expect(useUI.getState().sheets).toHaveLength(0)
    })

    it('Add is the same sheet without your swaps, still picking several', () => {
      const hash = window.location.hash
      window.location.hash = '#/workout'
      try {
        live()
        const onPick = vi.fn()
        exercisePicker(onPick)
        render()
        expect(heads()[0]).toBe('You have done these')
        expect(heads()).not.toContain('You swapped to these before')
        expect(heads()).not.toContain('Recent Exercises')
        expect(names('You have done these').slice(0, 2)).toEqual([FLY.n, SQUAT.n])
        const row = container.querySelector('section[aria-label="You have done these"] .hv-pk-row')
        expect(row.querySelector('.hv-pk-check')).toBeTruthy()
        expect(row.querySelector('.hv-pk-use')).toBeNull()
        click(row.querySelector('.tap-main'))
        expect(onPick).not.toHaveBeenCalled()
        expect(container.querySelector('.hv-pk-add button').textContent).toBe('Add 1 exercise')
      } finally { window.location.hash = hash }
    })
  })

  it('lists recent exercises first', () => {
    open(vi.fn(), {}, [{ id: 'w', d: '2026-10-01', entries: [{ id: SQUAT.id, sets: [] }] }])
    expect(container.textContent).toContain('Recent Exercises')
    expect(container.querySelector('.list .hv-pk-row .tt').textContent).toBe(SQUAT.n)
  })

  it('filters by a gym chosen outside a workout, remembered, body weight one of its ticks (D62)', () => {
    localStorage.clear()
    const PUSHUP = EXDB.find(e => e.eq === 'body weight' && /^push-up$/i.test(e.n))
    const CURL = EXDB.find(e => e.eq === 'dumbbell' && /^dumbbell biceps curl$/i.test(e.n))
    const equipProfiles = [{ id: 'g1', name: 'Home', equipment: ['dumbbell'], accV: 1, hvBw: 1 }]
    open(vi.fn(), {}, [], { equipProfiles, activeEquipId: 'g1', equipFilterOn: false })
    const filter = container.querySelector('.hv-pk-filters .btn')
    expect(filter.textContent).toBe('All Equipment')
    click(filter)
    const menu = useUI.getState().sheets.at(-1)
    const host = document.createElement('div')
    const r2 = createRoot(host)
    act(() => r2.render(menu.render(() => {})))
    click([...host.querySelectorAll('.menu-item')].find(i => i.textContent === 'Home'))
    act(() => r2.unmount())
    expect(filter.textContent).toBe('Home')
    search('curl')
    expect(rowOf(CURL)).toBeTruthy()
    search('push-up')
    expect(rowOf(PUSHUP)).toBeUndefined()      // Home has no body weight ticked
    // D67: what the gym hid is counted, and shown on a tap with its equipment.
    const more = container.querySelector('.hv-pk-hidden')
    expect(more.textContent).toMatch(/^\d+ hidden at HomeShow$/)
    search('push-up plus')
    expect(container.querySelector('.hv-pk-hidden')).toBeTruthy()      // every match hidden:
    expect(container.textContent).not.toContain('No exercises found')  // the line, not an empty list
    expect([...container.querySelectorAll('h4')].some(h => /exercises$/.test(h.textContent))).toBe(false)
    search('push-up')
    click(more)
    expect(container.textContent).toContain('Not at Home')
    expect(rowOf(PUSHUP).querySelector('.ss').textContent).toContain('Needs body weight')
    expect(container.querySelector('.hv-pk-hidden')).toBeNull()
    act(() => root.unmount()); container.remove()
    open(vi.fn(), {}, [], { equipProfiles })
    expect(container.querySelector('.hv-pk-filters .btn').textContent).toBe('Home')   // remembered
  })

  it('filters by a whole group of equipment, or by one kind under its chevron (D63)', () => {
    const KB = EXDB.find(e => e.eq === 'kettlebell')
    open(vi.fn())
    const sheet = () => {
      click(container.querySelector('.hv-pk-filters .btn'))
      const host = document.createElement('div')
      const r = createRoot(host)
      act(() => r.render(useUI.getState().sheets.at(-1).render(() => {})))
      return { host, r }
    }
    let { host, r } = sheet()
    const item = label => [...host.querySelectorAll('.menu-item')].find(i => i.querySelector('.tt').textContent === label)
    expect(item('kettlebell')).toBeUndefined()           // folded under Free weights
    click(item('Free weights'))
    act(() => r.unmount())
    expect(container.querySelector('.hv-pk-filters .btn').textContent).toBe('Free weights')
    const eqs = new Set([...container.querySelectorAll('.hv-pk-row .tt')].map(el => EXDB.find(e => e.n === el.textContent)?.eq).filter(Boolean))
    expect([...eqs].every(q => ['dumbbell', 'kettlebell', 'weight plate', 'medicine ball', 'sandbag', 'clubbell', 'macebell'].includes(q))).toBe(true)
    ;({ host, r } = sheet())
    click(item('Free weights').querySelector('.hv-eqg-x'))
    click(item('kettlebell'))
    act(() => r.unmount())
    expect(container.querySelector('.hv-pk-filters .btn').textContent).toBe('kettlebell')
    expect(rowOf(KB)).toBeTruthy()
  })

  it('filters by a muscle group, or by one muscle under its chevron (D64)', () => {
    open(vi.fn())
    const btn = () => [...container.querySelectorAll('.hv-pk-filters .btn')].find(b => /Muscle|Arms|Biceps/.test(b.textContent))
    const sheet = () => {
      click(btn())
      const host = document.createElement('div')
      const r = createRoot(host)
      act(() => r.render(useUI.getState().sheets.at(-1).render(() => {})))
      return { host, r }
    }
    let { host, r } = sheet()
    const item = label => [...host.querySelectorAll('.menu-item')].find(i => i.querySelector('.tt').textContent === label)
    expect(item('Biceps')).toBeUndefined()               // folded under Arms
    expect(item('Shoulders')).toBeTruthy()               // a group of one is the muscle
    click(item('Arms'))
    act(() => r.unmount())
    expect(btn().textContent).toBe('Arms')
    const muscles = new Set([...container.querySelectorAll('.hv-pk-row .ss')].map(el => el.textContent.split(' · ')[0]))
    expect([...muscles].every(m => ['Biceps', 'Triceps', 'Forearms'].includes(m))).toBe(true)
    expect(muscles.size).toBeGreaterThan(1)
    ;({ host, r } = sheet())
    expect(item('Biceps')).toBeUndefined()
    click(item('Arms').querySelector('.hv-eqg-x'))
    click(item('Biceps'))
    act(() => r.unmount())
    expect(btn().textContent).toBe('Biceps')
    expect(new Set([...container.querySelectorAll('.hv-pk-row .ss')].map(el => el.textContent.split(' · ')[0]))).toEqual(new Set(['Biceps']))
  })
})

describe('hevier: the picker’s chart button behind Exercise demos (D117)', () => {
  it('shows by default; off, the row has none and the thumbnail is the labelled way to the details', () => {
    open(vi.fn())
    search(BENCH.n)
    expect(rowOf(BENCH).querySelector('.hv-pk-info')).toBeTruthy()
    expect(rowOf(BENCH).querySelector('.hv-thumb').getAttribute('aria-hidden')).toBe('true')
    for (const off of [{ hvModuleParts: { 'hvWorkout.demos': false } }, { modules: { hvWorkout: false } }]) {
      act(() => root.unmount()); container.remove()
      open(vi.fn(), undefined, [], off)
      search(BENCH.n)
      expect(rowOf(BENCH).querySelector('.hv-pk-info')).toBeNull()
      const thumb = rowOf(BENCH).querySelector('.hv-thumb')
      expect(thumb.getAttribute('aria-hidden')).toBeNull()
      expect(thumb.getAttribute('aria-label')).toMatch(/^Details, barbell bench press$/i)
      const n = useUI.getState().sheets.length
      click(thumb)
      expect(useUI.getState().sheets.length).toBe(n + 1)
    }
  })
})
