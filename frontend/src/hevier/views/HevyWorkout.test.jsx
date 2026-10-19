// @vitest-environment happy-dom
// The fork's workout screen through seam S3: views/Workout.jsx with the fork flag on renders
// HevyWorkout, and every row action lands in upstream's own session pipeline.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Workout from '../../views/Workout.jsx'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { modeOf } from '../../lib/history.js'
import { hooks } from '../hooks.js'
import { installExercisePicker } from './ExercisePickerHevy.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../../lib/api.js', () => ({ api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const EX = EXDB.find(e => /barbell/i.test(e.eq || '')).id
const modeOfId = id => modeOf({ id })
const reps = (w, r, extra = {}) => ({ w, r, done: false, ...extra })

let root, container

function render(entries, workouts = []) {
  const S = clone(DEF)
  S.workouts = workouts
  S.active = { id: 'hv', d: '2026-10-16', start: Date.now(), name: 'Leg Day', cur: 0, entries }
  useStore.setState({ S, user: null })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter><Workout /></MemoryRouter>))
}
const sets = () => useStore.getState().S.active.entries[0].sets
const typeInto = (input, text) => act(() => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, text)
  input.dispatchEvent(new Event('input', { bubbles: true }))
})

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  useUI.getState().stopRest()
  useUI.setState({ sheets: [], toastMsg: '', timer: null, work: null })
})
afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  useUI.getState().stopRest()
  vi.useRealTimers()
})

describe('hevier: Log Workout screen (seam S3)', () => {
  it('replaces upstream’s layouts with the Hevy table', () => {
    render([{ id: EX, target: { sets: 2, reps: 8 }, sets: [reps(60, 8), reps(60, 8)] }])
    expect(container.querySelector('.hv-workout')).toBeTruthy()
    expect(container.querySelector('[data-testid="workout-list"]')).toBeNull()
    expect(container.querySelector('.hv-head').textContent).toContain('PREVIOUS')
    expect(container.querySelectorAll('.hv-row')).toHaveLength(2)
  })

  it('ticks a set through upstream’s pipeline: done, timestamped, rest started', () => {
    render([{ id: EX, target: { sets: 2, reps: 8 }, sets: [reps(60, 8), reps(60, 8)] }])
    act(() => container.querySelector('.hv-chk').click())
    expect(sets()[0].done).toBe(true)
    expect(sets()[0].at).toBeGreaterThan(0)
    expect(useUI.getState().timer).toBeTruthy()
    expect(container.querySelector('.hv-row').className).toContain('done')
  })

  it('shows prefilled values grey until they are typed over (D2)', () => {
    render([{ id: EX, target: { sets: 2, reps: 8 }, sets: [reps(60, 8), reps(60, 8)] }])
    const [w0, r0] = container.querySelectorAll('.hv-num')
    expect(w0.className).toContain('hv-hint')
    typeInto(w0, '65')
    expect(sets()[0].w).toBe(65)
    // upstream's cascade carries the new weight to the next inherited set, which stays grey
    expect(sets()[1].w).toBe(65)
    const nums = container.querySelectorAll('.hv-num')
    expect(nums[0].className).not.toContain('hv-hint')
    expect(nums[1].className).toContain('hv-hint')
    expect(nums[2].className).toContain('hv-hint')
  })

  it('a typed value stays bold on its own set when a set above it goes (D2)', () => {
    render([{ id: EX, target: { sets: 3, reps: 8 }, sets: [reps(60, 8), reps(60, 8), reps(60, 8)] }])
    typeInto(container.querySelectorAll('.hv-num')[3], '10')   // set 2's reps
    act(() => useStore.getState().update(s => { s.active.entries[0].sets.splice(0, 1) }))
    const nums = container.querySelectorAll('.hv-num')
    expect(nums[1].className).not.toContain('hv-hint')   // set 2, now first
    expect(nums[3].className).toContain('hv-hint')       // set 3, untouched
  })

  it('an untouched value is the grey placeholder: typing replaces it, left empty it stays (D2)', () => {
    render([{ id: EX, target: { sets: 2, reps: 8 }, sets: [reps(60, 8), reps(60, 8)] }])
    let w = container.querySelectorAll('.hv-num')[0]
    expect(w.value).toBe('')
    expect(w.placeholder).toBe('60')
    act(() => w.focus())
    typeInto(w, '6')
    typeInto(w, '')
    act(() => w.blur())
    w = container.querySelectorAll('.hv-num')[0]
    expect(sets().map(x => x.w)).toEqual([60, 60])   // the cascade undone too
    expect(w.placeholder).toBe('60')
    expect(w.className).toContain('hv-hint')
    act(() => w.focus())
    typeInto(w, '70')
    act(() => w.blur())
    w = container.querySelectorAll('.hv-num')[0]
    expect(sets()[0].w).toBe(70)
    expect(w.value).toBe('70')
    expect(w.className).not.toContain('hv-hint')
  })

  it('a typed value stays bold on its own set when a set below it goes (D2)', () => {
    render([{ id: EX, target: { sets: 3, reps: 8 }, sets: [reps(60, 8), reps(60, 8), reps(60, 8)] }])
    typeInto(container.querySelectorAll('.hv-num')[1], '10')   // set 1's reps
    act(() => useStore.getState().update(s => { s.active.entries[0].sets.splice(2, 1) }))
    const nums = container.querySelectorAll('.hv-num')
    expect(nums[1].className).not.toContain('hv-hint')   // set 1, typed
    expect(nums[3].className).toContain('hv-hint')       // set 2, untouched
  })

  it('PREVIOUS shows last time’s matching set and a tap copies it in (D3)', () => {
    const past = [{ d: '2026-10-10', entries: [{ id: EX, sets: [{ w: 55, r: 9, done: true }] }] }]
    render([{ id: EX, target: { sets: 2, reps: 8 }, sets: [reps(60, 8), reps(60, 8)] }], past)
    const prev = container.querySelectorAll('.hv-prev')
    expect(prev[0].textContent).toBe('55kg × 9')
    expect(prev[1].textContent).toBe('–')
    act(() => prev[0].click())
    expect(sets()[0]).toMatchObject({ w: 55, r: 9 })
  })

  it('a tick that sets records puts the trophy on that set and says so, once (D22, D51)', () => {
    render([{ id: EX, target: { sets: 3, reps: 8 }, sets: [reps(60, 8), reps(70, 8), reps(70, 8)] }],
      [{ id: 'w1', d: '2026-10-09', start: 1, end: 2, entries: [{ id: EX, sets: [{ w: 65, r: 8, done: true }] }] }])
    const chk = i => act(() => container.querySelectorAll('.hv-chk')[i].click())
    const trophies = () => [...container.querySelectorAll('.hv-set')].map(b => !!b.querySelector('.hv-pr-live'))
    chk(0)
    expect(trophies()).toEqual([false, false, false])
    expect(useUI.getState().toastMsg).not.toContain('PR')
    chk(1)
    expect(trophies()).toEqual([false, true, false])
    expect(useUI.getState().toastMsg).toBe('New PR · Heaviest Weight 70 kg +2')
    useUI.setState({ toastMsg: '' })
    chk(2)
    expect(trophies()).toEqual([false, true, false])
    expect(useUI.getState().toastMsg).not.toContain('PR')
  })

  it('an exercise switched to lb shows and takes lb, stored in kg (D41)', () => {
    const kg45 = 45 * 0.45359237
    render([{ id: EX, target: { sets: 1, reps: 8 }, sets: [reps(kg45, 8)] }],
      [{ id: 'w0', d: '2026-10-10', start: 1, entries: [{ id: EX, sets: [{ w: kg45, r: 8, done: true }] }] }])
    act(() => useStore.getState().update(s => { s.hvExUnit = { [EX]: { u: 'lb', step: 5, inc: 5 * 0.45359237 } } }))
    expect(container.querySelector('.hv-head').textContent).toContain('LB')
    const w = container.querySelector('.hv-row .hv-num')
    expect(w.placeholder).toBe('45')   // untouched: Hevy's grey hint (D2)
    expect(container.querySelector('.hv-prev').textContent).toContain('45lb × 8')
    typeInto(w, '50')
    expect(sets()[0].w).toBeCloseTo(50 * 0.45359237, 9)
    expect(useStore.getState().S.active.entries[0].target.inc).toBeCloseTo(5 * 0.45359237, 9)
  })

  it('a timed hold gets KG · TIME, typed as a clock, with a count-up timer (M1, D53)', () => {
    vi.setSystemTime(Date.parse('2026-10-18T10:00:00'))
    render([{ id: EX, target: { mode: 'time', sets: 1, sec: 30 }, sets: [{ sec: 30, done: false }] }])
    const head = container.querySelector('.hv-head').textContent
    expect(head).toContain('TIME')
    expect(head).not.toContain('REPS')
    typeInto(container.querySelectorAll('.hv-num')[1], '130')
    expect(sets()[0].sec).toBe(90)
    act(() => container.querySelector('.hv-go').click())
    expect(sets()[0].hvRun).toBe(Date.now())
    expect(useUI.getState().work).toBeFalsy()      // not upstream's countdown
    expect(container.querySelector('.hv-running')).toBeTruthy()
    vi.setSystemTime(Date.now() + 75_000)
    act(() => container.querySelector('.hv-go.on').click())
    expect(sets()[0]).toMatchObject({ sec: 75 })
    expect(sets()[0].hvRun).toBeUndefined()
  })

  it('cardio gets TIME · speed, its time in minutes and its speed in km/h (M1, D53)', () => {
    vi.setSystemTime(Date.parse('2026-10-18T10:00:00'))
    const run = EXDB.find(e => modeOfId(e.id) === 'cardio').id
    render([{ id: run, target: { mode: 'cardio', sets: 1, min: 20 }, sets: [{ min: 20, speed: 10, done: false }] }])
    const head = container.querySelector('.hv-head').textContent
    expect(head).toContain('TIME')
    expect(head).not.toContain('REPS')
    expect(container.querySelector('.hv-num').placeholder).toBe('20:00')
    typeInto(container.querySelectorAll('.hv-num')[1], '12')
    expect(sets()[0].speed).toBe(12)
    typeInto(container.querySelectorAll('.hv-num')[0], '1234')
    expect(sets()[0].min).toBeCloseTo(754 / 60)
    // ▶, then the tick: the timer stops and its time is what is logged
    act(() => container.querySelector('.hv-go').click())
    vi.setSystemTime(Date.now() + (30 * 60 + 5) * 1000)
    act(() => container.querySelector('.hv-chk').click())
    expect(sets()[0].done).toBe(true)
    expect(sets()[0].min).toBeCloseTo(1805 / 60)
    expect(sets()[0].hvRun).toBeUndefined()
  })

  it('a per-side set has an L and an R line, each ticked on its own (M1)', () => {
    const side = { w: 20, r: 8, done: false }
    render([{ id: EX, target: { sets: 1, reps: 16, side: true }, sets: [{ w: 20, r: 16, sides: { L: { ...side }, R: { ...side } } }] }])
    const lines = container.querySelectorAll('.hv-row.hv-side')
    expect(lines.length).toBe(2)
    act(() => lines[0].querySelector('.hv-chk').click())
    expect(sets()[0].sides.L.done).toBe(true)
    expect(sets()[0].sides.R.done).toBe(false)
    typeInto(lines[1].querySelectorAll('.hv-num')[0], '22.5')
    expect(sets()[0].sides.R.w).toBe(22.5)
  })

  it('the set type menu adds drops and bursts, edited and removed in their own rows (D5)', () => {
    render([{ id: EX, target: { sets: 1, reps: 8 }, sets: [reps(100, 8)] }])
    const pick = label => {
      act(() => container.querySelector('.hv-set').click())
      const items = useUI.getState().sheets.at(-1).render(() => {}).props.sections.flatMap(x => x.items).filter(Boolean)
      act(() => items.find(x => x.label === label).onClick())
      useUI.setState({ sheets: [] })
    }
    pick('Drop set')
    expect(sets()[0].drops).toHaveLength(1)
    expect(sets()[0].drops[0].w).toBeLessThan(100)
    const drop = container.querySelector('.hv-sub-row')
    typeInto(drop.querySelectorAll('.hv-num')[0], '70')
    expect(sets()[0].drops[0].w).toBe(70)
    act(() => drop.querySelector('.hv-x').click())
    expect(sets()[0].drops || []).toHaveLength(0)
    pick('Rest-pause burst')
    const added = sets()[0].clusters[0].r
    expect(sets()[0].r).toBe(8 + added)
    typeInto(container.querySelector('.hv-sub-row .hv-num'), String(added + 1))
    expect(sets()[0].r).toBe(9 + added)
    pick('Failure set')
    expect(sets()[0].failure).toBe(true)
  })

  it('a per-side weight is carried down to the sets after it (M1)', () => {
    const side = { w: 20, r: 8, done: false }
    const row = () => ({ w: 20, r: 16, sides: { L: { ...side }, R: { ...side } } })
    render([{ id: EX, target: { sets: 2, reps: 16, side: true }, sets: [row(), row()] }])
    typeInto(container.querySelectorAll('.hv-row.hv-side')[0].querySelectorAll('.hv-num')[0], '25')
    expect(sets().map(s => s.sides.L.w)).toEqual([25, 25])
    expect(sets().map(s => s.sides.R.w)).toEqual([20, 20])
  })

  it('a focused field gets the keypad row, and ⌨ hides the keyboard (SCREENS.md §0)', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }))
    render([{ id: EX, target: { sets: 1, reps: 8 }, sets: [reps(60, 8)] }])
    expect(container.querySelector('.hv-keypad')).toBeNull()
    const input = container.querySelector('.hv-num')
    act(() => input.focus())
    expect(container.querySelector('.hv-keypad')).toBeTruthy()
    expect(document.body.classList.contains('hv-kb')).toBe(true)
    act(() => { container.querySelector('.hv-kb-hide').click(); vi.advanceTimersByTime(5) })
    expect(document.activeElement).not.toBe(input)
    expect(container.querySelector('.hv-keypad')).toBeNull()
    expect(document.body.classList.contains('hv-kb')).toBe(false)
    vi.restoreAllMocks()
  })

  it('the picker’s Add superset links the new exercises after the current one', () => {
    installExercisePicker()
    const OTHER = EXDB.find(e => e.id !== EX && /dumbbell/i.test(e.eq || '')).id
    render([{ id: EX, target: { sets: 1, reps: 8 }, sets: [reps(60, 8)] }, { id: OTHER, target: { sets: 1, reps: 8 }, sets: [reps(20, 8)] }])
    act(() => container.querySelector('.hv-addex').click())
    const host = document.createElement('div')
    document.body.appendChild(host)
    const r = createRoot(host)
    act(() => r.render(useUI.getState().sheets.at(-1).render(() => {})))
    const rows = host.querySelectorAll('.hv-pk-row')
    act(() => rows[0].click())
    act(() => rows[1].click())
    act(() => [...host.querySelectorAll('button')].find(b => b.textContent === 'Add superset').click())
    const es = useStore.getState().S.active.entries
    expect(es).toHaveLength(4)
    expect([es[0].id, es[3].id]).toEqual([EX, OTHER])
    expect(es[1].sg).toBeTruthy()
    expect(es[2].sg).toBe(es[1].sg)
    expect(es[0].sg || es[3].sg).toBeFalsy()
    act(() => r.unmount())
    host.remove()
    hooks.exercisePicker = null
  })
})
