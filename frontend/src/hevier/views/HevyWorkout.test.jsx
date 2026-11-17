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
import { isPlain } from '../lib/plain-routine.js'
import { installExercisePicker } from './ExercisePickerHevy.jsx'
import { fromSpeed } from '../../lib/speed.js'
import { clampIncline } from '../../lib/incline.js'
import { stopped } from '../lib/set-timer.js'

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

  it('editing a saved workout shows its title at the top, and a tap renames it', () => {
    const saved = { id: 'w1', d: '2026-10-15', name: 'Leg Day', entries: [{ id: EX, sets: [reps(60, 5, { done: true })] }] }
    render([], [saved])
    act(() => useStore.getState().update(s => { s.active = null }))
    act(() => useStore.getState().update(s => { s.active = { ...clone(saved), cur: 0, editingWorkoutId: 'w1', editBase: { name: 'Leg Day', note: '', bw: null } } }))
    const title = container.querySelector('.hv-wtitle')
    expect(title.textContent).toBe('Leg Day')
    act(() => title.click())
    const host = document.createElement('div')
    const r = createRoot(host)
    act(() => r.render(useUI.getState().sheets.at(-1).render(() => {})))
    expect(host.querySelector('input').value).toBe('Leg Day')
    act(() => r.unmount())
  })

  // The sets are counted on the Finish sheet now (lib/finish-facts.test.js, D18 there).
  it('the header is name, duration and Finish; the gym and the workout note open below the name at the start (D127)', () => {
    render([{ id: EX, target: { sets: 1, reps: 8 }, sets: [reps(60, 8)] }])
    expect(container.querySelector('.hv-stats')).toBeNull()
    expect(container.textContent).not.toContain('Volume')
    expect(container.querySelector('.hv-wtime')).toBeTruthy()
    expect(container.querySelector('.hv-finish').textContent).toBe('Finish')
    const name = container.querySelector('.hv-wname')
    expect(name.textContent).toBe('Leg Day')
    expect(name.getAttribute('aria-expanded')).toBe('true')
    expect(container.querySelector('.hv-gym')).toBeTruthy()
    expect(container.querySelector('.hv-wnote').textContent).toBe('Workout note')
    expect(container.textContent).not.toContain('Add notes here')
    act(() => name.click())
    expect(name.getAttribute('aria-expanded')).toBe('false')
    expect(container.querySelector('.hv-gym')).toBeNull()
    expect(container.querySelector('.hv-wnote')).toBeNull()
  })

  describe('scrolled into the middle of a long page (D127)', () => {
    const was = {}
    beforeEach(() => {
      for (const [o, k, v] of [[window, 'scrollY', 600], [window, 'innerHeight', 800], [document.documentElement, 'scrollHeight', 3000]]) {
        was[k] = Object.getOwnPropertyDescriptor(o, k)
        Object.defineProperty(o, k, { configurable: true, get: () => v })
      }
    })
    afterEach(() => {
      for (const [o, k] of [[window, 'scrollY'], [window, 'innerHeight'], [document.documentElement, 'scrollHeight']]) {
        if (was[k]) Object.defineProperty(o, k, was[k]); else delete o[k]
      }
    })
    const two = first => [
      { id: EX, target: { sets: 2, reps: 8 }, sets: [reps(60, 8, { done: first }), reps(60, 8)] },
      { id: EX, target: { sets: 1, reps: 8 }, sets: [reps(60, 8)] },
    ]
    const shown = () => container.querySelector('.hv-wname').getAttribute('aria-expanded')

    it('a session just started still shows the gym and the note', () => {
      render(two(false))
      expect(shown()).toBe('true')
    })

    it('mid-session they close, and a tap on the name opens them', () => {
      render(two(true))
      expect(shown()).toBe('false')
      expect(container.querySelector('.hv-gym')).toBeNull()
      act(() => container.querySelector('.hv-wname').click())
      expect(shown()).toBe('true')
    })

    it('a sheet’s scroll lock (fixed body, scrollY 0) does not count as the top', () => {
      render(two(true))
      Object.defineProperty(window, 'scrollY', { configurable: true, get: () => 0 })
      document.body.style.position = 'fixed'
      try {
        act(() => window.dispatchEvent(new Event('scroll')))
        expect(shown()).toBe('false')
      } finally { document.body.style.position = '' }
    })
  })

  // Upstream's check since 1.4.4 (#811, D90's 1.4.4 note): asked once, in upstream's words.
  it('a weight far past the best asks at the tick: Fix it leaves the set unticked, Log as typed logs it (D90)', () => {
    const past = [{ id: 'p', d: '2026-10-01', start: 1, entries: [{ id: EX, sets: [reps(30, 8, { done: true })] }] }]
    render([{ id: EX, target: { sets: 1, reps: 8 }, sets: [reps(300, 8, { weightOrigin: 'manual' })] }], past)
    const sheet = () => {
      const top = useUI.getState().sheets.at(-1)
      const host = document.createElement('div')
      const r = createRoot(host)
      act(() => r.render(top.render(() => useUI.setState({ sheets: [] }))))
      return host
    }
    act(() => container.querySelector('.hv-chk').click())
    expect(sets()[0].done).toBeFalsy()
    let host = sheet()
    expect(host.textContent).toContain('Weight: 300 kg is more than twice your heaviest, 30 kg.')
    act(() => [...host.querySelectorAll('button')].find(b => b.textContent === 'Fix it').click())
    expect(sets()[0].done).toBeFalsy()
    act(() => container.querySelector('.hv-chk').click())
    host = sheet()
    act(() => [...host.querySelectorAll('button')].find(b => b.textContent === 'Log as typed').click())
    expect(sets()[0].done).toBe(true)
    const open = useUI.getState().sheets.length   // upstream's all-sets-done prompt
    act(() => container.querySelector('.hv-chk').click())   // unticking never asks
    expect(sets()[0].done).toBeFalsy()
    expect(useUI.getState().sheets).toHaveLength(open)
  })

  it('a ticked set beside its number says how it compares with the same set last time, behind upstream’s switch (D66, #907)', () => {
    const past = [{ id: 'p', d: '2026-10-01', start: 1, entries: [{ id: EX, sets: [reps(60, 10, { done: true }), reps(60, 10, { done: true })] }] }]
    // Below last time, so no record: a record's trophy takes the arrow's place, as in Workout Detail.
    render([{ id: EX, target: { sets: 2, reps: 8 }, sets: [reps(60, 9, { done: true }), reps(60, 8)] }], past)
    const marks = () => [...container.querySelectorAll('.hv-set')].map(b => b.querySelector('.hv-trend')?.className || '')
    expect(marks()).toEqual(['hv-trend down', ''])
    expect(container.querySelector('.hv-set').getAttribute('aria-label')).toContain('Less than last time')
    act(() => useStore.getState().update(st => { st.setTrend = false }))
    expect(marks()).toEqual(['', ''])
  })

  it('a set’s note shows under it, and the set type sheet offers Note (D5, upstream 1.4.4)', () => {
    render([{ id: EX, target: { sets: 2, reps: 8 }, sets: [reps(60, 8, { note: 'grip slipped' }), reps(60, 8)] }])
    const notes = [...container.querySelectorAll('.hv-setnote')]
    expect(notes.map(n => n.textContent)).toEqual(['grip slipped'])
    act(() => container.querySelectorAll('.hv-set')[1].click())
    const host = document.createElement('div')
    act(() => createRoot(host).render(useUI.getState().sheets.at(-1).render(() => {})))
    expect(host.textContent).toContain('A word about this set')
  })

  it('draws upstream’s plate line under a barbell set only with Plates to load on (D84)', () => {
    render([{ id: EX, target: { sets: 2, reps: 8 }, sets: [reps(60, 8), reps(60, 8)] }])
    expect(container.querySelector('.hv-plates')).toBeNull()
    act(() => useStore.getState().update(s => { s.hvPlateLine = true }))
    expect(container.querySelectorAll('.hv-plates')).toHaveLength(1)   // the second set's stack is the same
    expect(container.querySelector('.hv-plates').textContent).toContain('per side')
  })

  it('with Effort on warm-ups off, a warm-up row has no effort button and a work row keeps it (D120)', () => {
    render([{ id: EX, target: { sets: 1, reps: 8 }, sets: [reps(40, 5, { phase: 'warmup', rir: 4 }), reps(60, 8)] }])
    act(() => useStore.getState().update(s => { s.effort = 'rir' }))
    const effs = () => [...container.querySelectorAll('.hv-row')].map(r => r.querySelectorAll('.hv-eff').length)
    expect(effs()).toEqual([1, 1])
    act(() => useStore.getState().update(s => { s.hvWarmupEffort = false }))
    expect(effs()).toEqual([0, 1])
    // The empty cell keeps the grid: the work row's effort button spans the tick's track too.
    const [warm, work] = container.querySelectorAll('.hv-row')
    expect(warm.children.length).toBe(work.children.length + 1)
    expect(sets()[0].rir).toBe(4)   // the logged effort stays stored
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

  it('a new working weight leaves the warm-ups alone unless the routine has progression on (D69)', () => {
    const open = hvProg => {
      render([{ id: EX, rid: 'r1', target: { sets: 1, reps: 8 }, sets: [reps(40, 5, { phase: 'warmup' }), reps(100, 8)] }])
      act(() => useStore.setState(st => ({ S: { ...st.S, routines: [{ id: 'r1', name: 'Upper A', ex: [], ...(hvProg ? { hvProg } : {}) }] } })))
      typeInto(container.querySelectorAll('.hv-num')[2], '120')
      expect(sets()[1].w).toBe(120)
      return sets()[0].w
    }
    hooks.plainRoutine = { is: isPlain }
    try {
      expect(open(false)).toBe(40)
      act(() => root.unmount())
      container.remove()
      // upstream's own (#156): the open warm-up follows the work weight
      expect(open(true)).not.toBe(40)
    } finally { hooks.plainRoutine = null }
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

  it('a tap on PREVIOUS on either half of a hold pair, when last time was one rep row, makes it that per-side set (D75, D89)', () => {
    const past = [{ id: 'w1', d: '2026-10-10', start: 1, entries: [{ id: EX, sets: [reps(40, 8, { done: true }), reps(45, 6, { done: true })] }] }]
    const half = (k, extra = {}) => ({ side: k, mode: 'time', sec: 30, w: 10, done: false, ...extra })
    const both = (w, r) => ({ L: { w, r }, R: { w, r } })
    for (const at of [0, 1]) {
      render([{ id: EX, target: { sets: 2, reps: 16, side: true }, sets: [half('L'), half('R'), reps(70, 5)] }], past)
      act(() => container.querySelectorAll('.hv-prev')[at].click())
      act(() => vi.advanceTimersByTime(1))
      expect(sets().length).toBe(2)
      expect(sets()[0]).toMatchObject({ w: 40, r: 16, sides: both(40, 8) })
      expect(sets()[0].mode).toBeUndefined()
      expect(sets()[1]).toEqual(reps(70, 5))
      // Copied, so firm: none of the set's four fields is the grey hint.
      const nums = [...container.querySelectorAll('.hv-num')].slice(0, 4)
      expect(nums.some(n => n.className.includes('hv-hint'))).toBe(false)
      act(() => root.unmount()); container.remove(); root = null
    }
    // The pair as the last set takes last time's second set.
    for (const at of [1, 2]) {
      render([{ id: EX, target: { sets: 2, reps: 16, side: true }, sets: [reps(70, 5), half('L'), half('R')] }], past)
      act(() => container.querySelectorAll('.hv-prev')[at].click())
      expect(sets()[0]).toEqual(reps(70, 5))
      expect(sets().length).toBe(2)
      expect(sets()[1]).toMatchObject({ w: 45, r: 12, sides: both(45, 6) })
      act(() => root.unmount()); container.remove(); root = null
    }
    // A pair with a half ticked keeps its kind, and the set after it is untouched.
    render([{ id: EX, target: { sets: 2, reps: 16, side: true }, sets: [half('L', { done: true }), half('R'), reps(70, 5)] }], past)
    act(() => container.querySelectorAll('.hv-prev')[1].click())
    expect(sets().map(s => s.side ?? null)).toEqual(['L', 'R', null])
    expect(sets()[2]).toEqual(reps(70, 5))
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
    // Upstream's pin since 1.4.4 (#657, D41's 1.4.4 note).
    act(() => useStore.getState().update(s => { s.exUnit = { [EX]: { unit: 'lb', _ts: 1 } }; for (const e of s.active.entries) if (e.id === EX) e.target = { ...e.target, inc: 5 * 0.45359237 } }))
    expect(container.querySelector('.hv-head').textContent).toContain('LB')
    const w = container.querySelector('.hv-row .hv-num')
    expect(w.placeholder).toBe('45')   // untouched: Hevy's grey hint (D2)
    expect(container.querySelector('.hv-prev').textContent).toContain('45lb × 8')
    typeInto(w, '50')
    expect(sets()[0].w).toBeCloseTo(50 * 0.45359237, 4)   // upstream stores a converted weight to four places (#657)
    expect(useStore.getState().S.active.entries[0].target.inc).toBeCloseTo(5 * 0.45359237, 9)
    // A tap on PREVIOUS copies last time's 45 lb back, not 45 kg read as lb.
    act(() => container.querySelector('.hv-prev').click())
    expect(sets()[0].w).toBeCloseTo(kg45, 3)
  })

  it('a timed hold gets KG · TIME, typed as a clock, with the big clock counting it down (M1, D53, D89)', () => {
    vi.setSystemTime(Date.parse('2026-10-18T10:00:00'))
    render([{ id: EX, target: { mode: 'time', sets: 1, sec: 30 }, sets: [{ sec: 30, done: false }] }])
    const head = container.querySelector('.hv-head').textContent
    expect(head).toContain('TIME')
    expect(head).not.toContain('REPS')
    typeInto(container.querySelectorAll('.hv-num')[1], '130')
    expect(sets()[0].sec).toBe(90)
    act(() => container.querySelector('.hv-go').click())
    expect(sets()[0].hvRun).toBe(Date.now())
    expect(sets()[0].hvGoal).toBe(90)
    expect(useUI.getState().work).toBeFalsy()      // not upstream's countdown
    expect(useUI.getState().sheets).toHaveLength(1)  // the big clock
    expect(container.querySelector('.hv-running')).toBeTruthy()
    vi.setSystemTime(Date.now() + 75_000)
    act(() => container.querySelector('.hv-go.on').click())
    expect(useUI.getState().sheets).toHaveLength(2)  // opened again, still running
    act(() => container.querySelector('.hv-chk').click())
    expect(sets()[0]).toMatchObject({ sec: 75, done: true })
    expect(sets()[0].hvRun).toBeUndefined()
  })

  it('a hold stopped from the big clock or its own end is firm, not a grey hint (D2, D89)', () => {
    vi.setSystemTime(Date.parse('2026-10-18T10:00:00'))
    const now = Date.now()
    render([{ id: EX, target: { mode: 'time', sets: 2, sec: 30 }, sets: [{ w: 0, sec: 30, done: false }, { w: 0, sec: 30, done: false, hvRun: now, hvGoal: 60 }] }])
    vi.setSystemTime(now + 42_000)
    // What ClockSheet's Stop and hold-clock-run.js write: the time held, outside the block.
    act(() => useStore.getState().update(st => { st.active.entries[0].sets[1] = stopped(st.active.entries[0].sets[1], 'time') }))
    expect(sets()[1].sec).toBe(42)
    const nums = container.querySelectorAll('.hv-num')
    expect(nums[3].className).not.toContain('hv-hint')
    expect(nums[1].className).toContain('hv-hint')
  })

  it('cardio speed typed in mph is stored in km/h, and the incline is clamped (M1)', () => {
    const run = EXDB.find(e => modeOfId(e.id) === 'cardio').id
    render([{ id: run, target: { mode: 'cardio', sets: 1, min: 20 }, sets: [{ min: 20, speed: 10, incline: 2, done: false }] }])
    act(() => useStore.setState(st => ({ S: { ...st.S, speedUnit: 'mph' } })))
    typeInto(container.querySelectorAll('.hv-num')[1], '6')
    expect(sets()[0].speed).toBeCloseTo(fromSpeed(6, 'mph'))
    typeInto(container.querySelectorAll('.hv-num')[2], '55')
    expect(sets()[0].incline).toBe(clampIncline(55))
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
    // ▶ counts on from the typed 12:34 (R7-U4), then the tick: the timer stops and its time is what is logged
    act(() => container.querySelector('.hv-go').click())
    vi.setSystemTime(Date.now() + (7 * 60 + 26) * 1000)
    act(() => container.querySelector('.hv-chk').click())
    expect(sets()[0].done).toBe(true)
    expect(sets()[0].min).toBeCloseTo(1200 / 60)
    expect(sets()[0].hvRun).toBeUndefined()
  })

  it('a run counted on from a typed time is not taken for a forgotten timer (D90, R7-U4)', () => {
    vi.setSystemTime(Date.parse('2026-10-18T10:00:00'))
    const run = EXDB.find(e => modeOfId(e.id) === 'cardio').id
    render([{ id: run, target: { mode: 'cardio', sets: 1, min: 20 }, sets: [{ min: 20, done: false }] }])
    typeInto(container.querySelectorAll('.hv-num')[0], '1500')
    act(() => container.querySelector('.hv-go').click())
    vi.setSystemTime(Date.now() + 16 * 60 * 1000)
    act(() => container.querySelector('.hv-chk').click())
    expect(sets()[0].done).toBe(true)
    expect(sets()[0].min).toBeCloseTo(31)
  })

  it('a cardio timer left running asks at the tick: Fix it stops it, unticked (D90)', () => {
    vi.setSystemTime(Date.parse('2026-10-18T10:00:00'))
    const run = EXDB.find(e => modeOfId(e.id) === 'cardio').id
    render([{ id: run, target: { mode: 'cardio', sets: 1, min: 20 }, sets: [{ min: 20, speed: 10, done: false }] }])
    act(() => container.querySelector('.hv-go').click())
    vi.setSystemTime(Date.now() + 100 * 60 * 1000)
    act(() => container.querySelector('.hv-chk').click())
    expect(sets()[0].done).toBeFalsy()
    const top = useUI.getState().sheets.at(-1)
    const host = document.createElement('div')
    act(() => createRoot(host).render(top.render(() => useUI.setState({ sheets: [] }))))
    expect(host.textContent).toContain('1:40:00 is over twice this set’s time, 20:00.')
    act(() => [...host.querySelectorAll('button')].find(b => b.textContent === 'Fix it').click())
    expect(sets()[0]).toMatchObject({ done: false, min: 100 })
    expect(sets()[0].hvRun).toBeUndefined()
  })

  it('a weight far under last time’s same set asks too (D90)', () => {
    const past = [{ id: 'p', d: '2026-10-01', start: 1, entries: [{ id: EX, sets: [reps(30, 8, { done: true })] }] }]
    render([{ id: EX, target: { sets: 1, reps: 8 }, sets: [reps(3, 8, { weightOrigin: 'manual' })] }], past)
    act(() => container.querySelector('.hv-chk').click())
    expect(sets()[0].done).toBeFalsy()
    const top = useUI.getState().sheets.at(-1)
    const host = document.createElement('div')
    act(() => createRoot(host).render(top.render(() => useUI.setState({ sheets: [] }))))
    expect(host.textContent).toContain('Weight: 3 kg is under a third of last time’s 30 kg.')
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

  it('an exercise set to right first draws R above L, with the set number on R (D72)', () => {
    const side = { w: 20, r: 8, done: false }
    render([{ id: EX, target: { sets: 1, reps: 16, side: true }, sets: [{ w: 20, r: 16, sides: { L: { ...side }, R: { ...side } } }] }])
    act(() => useStore.getState().update(st => { st.hvSideOrder = { [EX]: 'RL' } }))
    const lines = container.querySelectorAll('.hv-row.hv-side')
    expect([...lines].map(l => l.querySelector('.hv-lr').textContent)).toEqual(['R', 'L'])
    expect(lines[0].querySelector('.hv-set')).toBeTruthy()
    expect(lines[1].querySelector('.hv-set')).toBeNull()
    act(() => lines[0].querySelector('.hv-chk').click())
    expect(sets()[0].sides.R.done).toBe(true)
    expect(sets()[0].sides.L.done).toBe(false)
  })

  it('rest reads as a clock, and a set’s rest sheet names the exercise’s rest and the picked time', () => {
    render([{ id: EX, target: { sets: 2, reps: 8, restSec: 120 }, sets: [reps(100, 8), reps(100, 8, { restSec: 150 })] }])
    expect(container.querySelector('[aria-label="Rest: 2:00"]')).toBeTruthy()
    const items = i => {
      act(() => container.querySelectorAll('.hv-set')[i].click())
      const rest = useUI.getState().sheets.at(-1).render(() => {}).props.sections.flatMap(x => x.items).find(x => x?.label === 'Rest after this set')
      act(() => rest.onClick())
      const out = [rest.sub, ...useUI.getState().sheets.at(-1).render(() => {}).props.items.map(x => (x.on ? '*' : '') + x.label)]
      useUI.setState({ sheets: [] })
      return out
    }
    expect(items(0)).toEqual(['This exercise (2:00)', '*This exercise (2:00)', 'No timer', 'Pick a time'])
    expect(items(1)).toEqual(['2:30', 'This exercise (2:00)', 'No timer', '*Pick a time · 2:30'])
  })

  it('the card’s rest button opens the fork’s sheet: Settings named, No timer and a picked time shown', () => {
    render([{ id: EX, target: { sets: 1, reps: 8 }, sets: [reps(100, 8)] }])
    const btn = () => container.querySelector('[aria-label^="Rest: "]')
    const rows = () => {
      act(() => btn().click())
      return useUI.getState().sheets.at(-1).render(() => {}).props.items
    }
    expect(btn().getAttribute('aria-label')).toBe('Rest: 1:30')
    expect(rows().map(x => (x.on ? '*' : '') + x.label)).toEqual(['*Settings (1:30)', 'No timer', 'Pick a time'])
    act(() => rows()[1].onClick())
    useUI.setState({ sheets: [] })
    expect(useStore.getState().S.active.entries[0].target).toMatchObject({ restOff: true })
    expect(btn().getAttribute('aria-label')).toBe('Rest: No timer')
    act(() => rows()[2].onClick())
    act(() => useUI.getState().sheets.at(-1).render(() => {}).props.onDone(150))
    useUI.setState({ sheets: [] })
    expect(useStore.getState().S.active.entries[0].target.restSec).toBe(150)
    expect(useStore.getState().S.active.entries[0].target.restOff).toBeUndefined()
    expect(btn().getAttribute('aria-label')).toBe('Rest: 2:30')
    expect(rows().map(x => (x.on ? '*' : '') + x.label)).toEqual(['Settings (1:30)', 'No timer', '*Pick a time · 2:30'])
    useUI.setState({ sheets: [] })
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

  // D78: with the current exercise not the last, the picker offers Insert after it and Add to end.
  const openPicker = () => {
    installExercisePicker()
    const OTHER = EXDB.find(e => e.id !== EX && /dumbbell/i.test(e.eq || '')).id
    render([{ id: EX, target: { sets: 1, reps: 8 }, sets: [reps(60, 8)] }, { id: OTHER, target: { sets: 1, reps: 8 }, sets: [reps(20, 8)] }])
    act(() => container.querySelector('.hv-addex').click())
    const host = document.createElement('div')
    document.body.appendChild(host)
    const r = createRoot(host)
    act(() => r.render(useUI.getState().sheets.at(-1).render(() => {})))
    const rows = host.querySelectorAll('.hv-pk-row .tap-main')
    const button = text => [...host.querySelectorAll('button')].find(b => b.textContent.startsWith(text))
    const done = () => { act(() => r.unmount()); host.remove(); hooks.exercisePicker = null }
    return { OTHER, rows, button, done }
  }

  it('Add to end puts the picks after the last exercise, and Add superset links them there', () => {
    const { OTHER, rows, button, done } = openPicker()
    act(() => rows[0].click())
    act(() => rows[1].click())
    expect(button('Insert after')).toBeTruthy()
    act(() => button('Add superset').click())
    const es = useStore.getState().S.active.entries
    expect(es).toHaveLength(4)
    expect([es[0].id, es[1].id]).toEqual([EX, OTHER])
    expect(es[2].sg).toBeTruthy()
    expect(es[3].sg).toBe(es[2].sg)
    expect(es[0].sg || es[1].sg).toBeFalsy()
    done()
  })

  it('Insert after puts the pick after the current exercise; Add to end after the last one', () => {
    let p = openPicker()
    act(() => p.rows[0].click())
    act(() => p.button('Insert after').click())
    let es = useStore.getState().S.active.entries
    expect(es).toHaveLength(3)
    expect([es[0].id, es[2].id]).toEqual([EX, p.OTHER])
    p.done()
    p = openPicker()
    act(() => p.rows[0].click())
    act(() => p.button('Add to end').click())
    es = useStore.getState().S.active.entries
    expect(es).toHaveLength(3)
    expect([es[0].id, es[1].id]).toEqual([EX, p.OTHER])
    p.done()
  })
})

describe('hevier: Workout extras on the workout screen (D117)', () => {
  const offClock = [{ hvModuleParts: { 'hvWorkout.clock': false } }, { modules: { hvWorkout: false } }]
  const set = patch => act(() => useStore.getState().update(s => { Object.assign(s, patch) }))

  it('the header’s Timer and Stopwatch button goes with the part; the duration stays', () => {
    render([{ id: EX, target: { sets: 1, reps: 8 }, sets: [reps(60, 8)] }])
    expect(container.querySelector('.hv-clockbtn')).toBeTruthy()
    for (const off of offClock) {
      set({ modules: {}, hvModuleParts: {}, ...off })
      expect(container.querySelector('.hv-clockbtn')).toBeNull()
      expect(container.querySelector('.hv-wtime')).toBeTruthy()
    }
  })

  it('a timed hold’s big clock still opens with the Timer and Stopwatch off (D53, D89)', () => {
    render([{ id: EX, target: { mode: 'time', sets: 1, sec: 30 }, sets: [{ sec: 30, done: false }] }])
    set(offClock[0])
    act(() => container.querySelector('.hv-go').click())
    expect(sets()[0].hvRun).toBeTruthy()
    expect(useUI.getState().sheets).toHaveLength(1)
  })

  it('a cardio set’s timer still runs with the module off (D53)', () => {
    const run = EXDB.find(e => modeOfId(e.id) === 'cardio').id
    render([{ id: run, target: { mode: 'cardio', sets: 1, min: 20 }, sets: [{ min: 20, speed: 10, done: false }] }])
    set(offClock[1])
    act(() => container.querySelector('.hv-go').click())
    expect(sets()[0].hvRun).toBeTruthy()
  })
})

describe('hevier: the open set and its exercise (D127)', () => {
  const two = (id = EX) => ({ id, target: { sets: 2, reps: 8 }, sets: [reps(60, 8), reps(60, 8)] })
  const rows = () => [...container.querySelectorAll('.hv-row')]
  const B = EXDB.filter(e => e.id !== EX && modeOfId(e.id) === 'reps')[0].id

  it('the first set left is open, a tap opens another, and the tick moves on', () => {
    render([two(), two(B)])
    expect(rows().map(r => r.classList.contains('hv-open'))).toEqual([true, false, false, false])
    act(() => rows()[3].querySelector('.hv-cell').click())
    expect(rows().map(r => r.classList.contains('hv-open'))).toEqual([false, false, false, true])
    act(() => rows()[3].querySelector('.hv-chk').click())
    expect(rows().map(r => r.classList.contains('hv-open'))).toEqual([false, false, true, false])
  })

  it('only the open exercise has its six buttons and + Set beside + Warm-up', () => {
    render([two(), two(B)])
    const [a, b] = container.querySelectorAll('.hv-ex')
    expect([...a.querySelectorAll('.hv-acts button')].map(x => x.textContent)).toEqual(['Swap', 'Note', 'History', expect.any(String), 'Reorder', 'More'])
    expect(b.querySelector('.hv-acts')).toBeNull()
    expect([...a.querySelectorAll('.hv-addrow button')].map(x => x.textContent)).toEqual(['Set', 'Warm-up'])
    act(() => a.querySelector('.hv-addrow .hv-addwarm').click())
    expect(sets().some(x => x.phase === 'warmup')).toBe(true)
  })

  it('with effort on, a set not ticked has the effort button in the tick’s place; a ticked one keeps the tick, a warm-up without effort too', () => {
    render([{ id: EX, target: { sets: 2, reps: 8 }, sets: [reps(40, 5, { phase: 'warmup' }), reps(60, 8), reps(60, 8, { done: true, rpe: 8 })] }])
    act(() => useStore.getState().update(s => { s.effort = 'rpe'; s.hvWarmupEffort = false }))
    const rows = [...container.querySelectorAll('.hv-row')]
    const has = (r, sel) => !!r.querySelector(sel)
    expect(rows.map(r => [has(r, '.hv-chk'), has(r, '.hv-eff-tick')])).toEqual([[true, false], [false, true], [true, false]])
  })

  it('the effort button in the tick’s place logs the set with the rating picked; closing the dialog logs nothing', () => {
    render([{ id: EX, target: { sets: 2, reps: 8 }, sets: [reps(60, 8), reps(60, 8)] }])
    act(() => useStore.getState().update(s => { s.effort = 'rpe' }))
    const sets = () => useStore.getState().S.active.entries[0].sets
    const openSheet = () => {
      act(() => container.querySelector('.hv-row:not(.done) .hv-eff-tick').click())
      const host = document.createElement('div')
      const r = createRoot(host)
      const sheet = useUI.getState().sheets.at(-1)
      act(() => r.render(sheet.render(() => {})))
      return { host, r }
    }
    const a = openSheet()
    act(() => a.r.unmount())
    expect(sets().map(x => !!x.done)).toEqual([false, false])
    const b = openSheet()
    act(() => [...b.host.querySelectorAll('.item')].find(x => x.textContent.trim().startsWith('8')).click())
    act(() => b.r.unmount())
    expect(sets().map(x => [!!x.done, x.rpe ?? null])).toEqual([[true, 8], [false, null]])
  })

  it('the dialog of an unticked set has a tick at the bottom that logs it without a rating; a ticked set’s has none', () => {
    render([{ id: EX, target: { sets: 2, reps: 8 }, sets: [reps(60, 8), reps(60, 8, { done: true, rpe: 8 })] }])
    act(() => useStore.getState().update(s => { s.effort = 'rpe' }))
    const sets = () => useStore.getState().S.active.entries[0].sets
    const openSheet = sel => {
      act(() => container.querySelector(sel).click())
      const host = document.createElement('div')
      const r = createRoot(host)
      act(() => r.render(useUI.getState().sheets.at(-1).render(() => {})))
      return { host, r }
    }
    const plain = host => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === 'Log without rating')
    const done = openSheet('.hv-row.done .hv-eff')
    expect(plain(done.host)).toBeFalsy()
    act(() => done.r.unmount())
    const a = openSheet('.hv-row:not(.done) .hv-eff-tick')
    act(() => plain(a.host).click())
    act(() => a.r.unmount())
    expect(sets().map(x => [!!x.done, x.rpe ?? null])).toEqual([[true, null], [true, 8]])
  })

  it('the rest docks at the bottom: +1 min, +2 min and Skip, gone when it ends', () => {
    render([two()])
    act(() => container.querySelector('.hv-chk').click())
    const dock = () => container.querySelector('.hv-dock')
    expect(dock()).toBeTruthy()
    expect(document.body.classList.contains('hv-docked')).toBe(true)
    expect(document.body.classList.contains('hv-dock')).toBe(false)   // the panel's own class, position: fixed
    const left = useUI.getState().timer.left
    act(() => [...dock().querySelectorAll('button')].find(b => b.textContent === '+1 min').click())
    expect(useUI.getState().timer.left).toBe(left + 60)
    // Run out by itself, the panel goes and the page gives its room back, upstream's bar still aside.
    expect(document.body.classList.contains('hv-dock-room')).toBe(true)
    const running = useUI.getState().timer
    act(() => useUI.setState({ timer: { ...running, left: 0, ready: true } }))
    expect(dock()).toBeNull()
    expect(document.body.classList.contains('hv-dock-room')).toBe(false)
    expect(document.body.classList.contains('hv-docked')).toBe(true)
    act(() => useUI.setState({ timer: running }))
    act(() => [...dock().querySelectorAll('button')].find(b => b.textContent === 'Skip').click())
    expect(dock()).toBeNull()
    expect(document.body.classList.contains('hv-docked')).toBe(false)
  })
})

describe('hevier: the exercise ⋮ menu', () => {
  const [B, C, D] = EXDB.filter(e => e.id !== EX && modeOfId(e.id) === 'reps').slice(0, 3).map(e => e.id)
  const one = id => ({ id, target: { sets: 2, reps: 8 }, sets: [reps(60, 8), reps(60, 8)] })
  const menuItems = (n = 0) => {
    act(() => container.querySelectorAll('.hv-more')[n].click())
    const items = useUI.getState().sheets.at(-1).render(() => {}).props.sections.flatMap(x => x.items).filter(Boolean)
    useUI.setState({ sheets: [] })
    return items
  }
  const set = patch => act(() => useStore.getState().update(s => { Object.assign(s, patch) }))

  it('Reorder is a button on the open exercise, moves a superset as one block, and the rest timer follows its exercise', () => {
    render([one(EX), { ...one(B), sg: 's' }, { ...one(C), sg: 's' }, one(D)])
    act(() => container.querySelector('.hv-chk').click())
    expect(useUI.getState().timer.forIdx).toBe(0)
    const items = menuItems()
    expect(items.map(x => x.label)).not.toContain('Move up')
    expect(items.map(x => x.label)).not.toContain('Reorder exercises')
    act(() => [...container.querySelectorAll('.hv-acts button')].find(b => b.textContent === 'Reorder').click())
    const host = document.createElement('div')
    document.body.appendChild(host)
    const r = createRoot(host)
    act(() => r.render(useUI.getState().sheets.at(-1).render(() => {})))
    const ids = () => useStore.getState().S.active.entries.map(e => e.id)
    const grip = i => host.querySelectorAll('.hv-grip')[i]   // one per exercise, in the list's order
    const key = (el, k) => act(() => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })))
    expect(host.querySelectorAll('[data-reorder-row]')).toHaveLength(3)
    expect(grip(0).getAttribute('aria-label')).toMatch(/^Move ./)
    key(grip(0), 'ArrowDown')
    expect(ids()).toEqual([B, C, EX, D])
    expect(useUI.getState().timer.forIdx).toBe(2)
    key(grip(1), 'ArrowDown')   // the superset passes the exercise as one block
    expect(ids()).toEqual([EX, B, C, D])
    expect(useUI.getState().timer.forIdx).toBe(0)
    act(() => r.unmount())
    host.remove()
  })

  it('How to do it is left to the thumbnail and the name', () => {
    render([one(EX)])
    expect(menuItems().map(x => x.label)).not.toContain('How to do it')
    expect(container.querySelector('.hv-thumb').getAttribute('aria-label')).toBe('How to do it')
  })

  it('More holds Per side, Superset, Weight unit, Exercise settings and Remove exercise, each with an icon (D127)', () => {
    render([one(EX), one(B)])
    const items = menuItems()
    const labels = items.map(x => x.label)
    expect(labels[0]).toBe('Per side')
    expect(labels).toEqual(expect.arrayContaining(['Superset', 'Weight unit', 'Exercise settings', 'Remove exercise']))
    expect(labels.at(-1)).toBe('Remove exercise')
    expect(labels).not.toEqual(expect.arrayContaining(['Replace exercise']))
    expect(items.every(x => x.icon)).toBe(true)
  })

  it('Weight unit and Plate loading go with their part of Exercise settings (D114)', () => {
    render([one(EX), one(B)])
    const labels = () => menuItems().map(x => x.label)
    expect(labels()).toEqual(expect.arrayContaining(['Weight unit', 'Plate loading']))
    set({ hvModuleParts: { 'hvExercise.units': false } })
    expect(labels()).not.toContain('Weight unit')
    expect(labels()).toContain('Plate loading')
    for (const off of [{ hvModuleParts: { 'hvExercise.plates': false } }, { modules: { plates: false } }, { modules: { hvExercise: false } }]) {
      set({ modules: {}, hvModuleParts: {}, ...off })
      expect(labels()).not.toContain('Plate loading')
    }
  })
})
