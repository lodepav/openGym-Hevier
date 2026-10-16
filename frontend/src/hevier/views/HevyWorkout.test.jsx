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

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../../lib/api.js', () => ({ api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const EX = EXDB.find(e => /barbell/i.test(e.eq || '')).id
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

  it('PREVIOUS shows last time’s matching set and a tap copies it in (D3)', () => {
    const past = [{ d: '2026-10-10', entries: [{ id: EX, sets: [{ w: 55, r: 9, done: true }] }] }]
    render([{ id: EX, target: { sets: 2, reps: 8 }, sets: [reps(60, 8), reps(60, 8)] }], past)
    const prev = container.querySelectorAll('.hv-prev')
    expect(prev[0].textContent).toBe('55kg × 9')
    expect(prev[1].textContent).toBe('–')
    act(() => prev[0].click())
    expect(sets()[0]).toMatchObject({ w: 55, r: 9 })
  })

  it('leaves timed exercises to upstream’s block for now', () => {
    render([{ id: EX, target: { mode: 'time', sets: 1, sec: 30 }, sets: [{ sec: 30, done: false }] }])
    expect(container.querySelector('.hv-fallback')).toBeTruthy()
    expect(container.querySelector('.hv-head')).toBeNull()
  })
})
