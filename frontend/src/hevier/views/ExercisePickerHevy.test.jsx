// @vitest-environment happy-dom
// The Hevy Add Exercise picker through seam S13: upstream's exercisePicker
// opens the fork's sheet; an add picks several, a titled pick (Replace, swap) takes one tap.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { exercisePicker } from '../../sheets.jsx'
import { hooks } from '../hooks.js'
import { installExercisePicker } from './ExercisePickerHevy.jsx'

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
    click(rowOf(SQUAT))
    search(BENCH.n)
    click(rowOf(BENCH))
    expect(onPick).not.toHaveBeenCalled()
    const add = container.querySelector('.hv-pk-add button')
    expect(add.textContent).toBe('Add 2 exercises')
    click(add)
    expect(onPick.mock.calls.map(([e, quick]) => [e.id, quick])).toEqual([[SQUAT.id, true], [BENCH.id, true]])
    expect(useUI.getState().sheets).toHaveLength(0)
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
    click(rowOf(BENCH))
    click(rowOf(BENCH))
    expect(container.querySelector('.hv-pk-add')).toBeNull()
  })

  it('a Replace takes one tap and opens on the same muscle', () => {
    const onPick = vi.fn()
    open(onPick, { title: 'Replace exercise', like: BENCH.id })
    expect(container.querySelector('.hv-pk-filters').textContent).toContain('Chest')
    expect(rowOf(BENCH)).toBeUndefined()
    const first = container.querySelector('.hv-pk-row')
    click(first)
    expect(onPick).toHaveBeenCalledTimes(1)
    expect(onPick.mock.calls[0][1]).toBe(true)
    expect(container.querySelector('.hv-pk-check')).toBeNull()
  })

  it('a swap of the running workout’s exercise offers its slot’s backups first, until something is typed (D45)', () => {
    const S = clone(DEF)
    S.active = { start: Date.now(), entries: [{ id: BENCH.id, target: { subs: [SQUAT.id] }, sets: [] }] }
    useStore.setState({ S, user: null })
    exercisePicker(() => {}, { title: 'Swap exercise', like: BENCH.id })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const sheet = useUI.getState().sheets.at(-1)
    act(() => root.render(sheet.render(() => {})))
    const heads = [...container.querySelectorAll('h4.sec')].map(h => h.textContent)
    expect(heads[0]).toBe('Your backups')
    expect(container.querySelector('.list .hv-pk-row .tt').textContent).toBe(SQUAT.n)
    search('curl')
    expect(container.textContent).not.toContain('Your backups')
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
    act(() => root.unmount()); container.remove()
    open(vi.fn(), {}, [], { equipProfiles })
    expect(container.querySelector('.hv-pk-filters .btn').textContent).toBe('Home')   // remembered
  })
})
