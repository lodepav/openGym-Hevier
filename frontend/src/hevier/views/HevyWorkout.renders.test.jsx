// @vitest-environment happy-dom
// A keystroke or a tick in one exercise re-renders that card only, not the whole workout (a
// workout of 12 exercises took 49 ms of render per keystroke). A card is counted by its call to
// previousSetsFor, made once per render with its entry.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Workout from '../../views/Workout.jsx'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { modeOf } from '../../lib/history.js'
import { previousSetsFor } from '../lib/previous-sets.js'
import { supersetUnits } from '../../lib/history.js'
import HevyWorkout from './HevyWorkout.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../../lib/api.js', () => ({ api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))
vi.mock('../lib/previous-sets.js', async orig => {
  const m = await orig()
  return { ...m, previousSetsFor: vi.fn(m.previousSetsFor) }
})

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const REPS = EXDB.filter(e => /barbell/i.test(e.eq || '') && modeOf({ id: e.id }) === 'reps').map(e => e.id)
const reps = (w, r, extra = {}) => ({ w, r, done: false, ...extra })
const entry = (k, id = REPS[k]) => ({ _k: k, id, target: { sets: 2, reps: 8 }, sets: [reps(60, 8), reps(60, 8)] })

let root, container
function render(entries, workouts = [], routines) {
  const S = clone(DEF)
  S.workouts = workouts
  if (routines) S.routines = routines
  S.active = { id: 'hv', d: '2026-10-16', start: Date.now(), name: 'Leg Day', cur: 0, entries }
  useStore.setState({ S, user: null })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter><Workout /></MemoryRouter>))
}
// Renders per card since the last call, by the entry's _k.
const renders = () => {
  const n = {}
  for (const [, e] of previousSetsFor.mock.calls) if (e?._k != null) n[e._k] = (n[e._k] || 0) + 1
  previousSetsFor.mockClear()
  return n
}
const card = k => container.querySelectorAll('.hv-ex')[k]
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

describe('hevier: the live workout re-renders only the card that changed', () => {
  it('a keystroke in one exercise re-renders that card alone', () => {
    render([entry(0), entry(1), entry(2)])
    renders()
    typeInto(card(1).querySelector('input.hv-num'), '72.5')
    expect(useStore.getState().S.active.entries[1].sets[0].w).toBe(72.5)
    const n = renders()
    expect(n[1]).toBeGreaterThan(0)
    expect(n[0]).toBeUndefined()
    expect(n[2]).toBeUndefined()
  })

  it('a tick re-renders its card, and the card the open set moves to', () => {
    render([entry(0), entry(1), entry(2)])
    // the first set of exercise 1, then its last: the open set moves on to exercise 2
    act(() => card(1).querySelectorAll('.hv-row')[0].click())
    renders()
    act(() => card(1).querySelectorAll('.hv-chk')[0].click())
    expect(useStore.getState().S.active.entries[1].sets[0].done).toBe(true)
    let n = renders()
    expect(n[1]).toBeGreaterThan(0)
    expect(n[0]).toBeUndefined()
    expect(n[2]).toBeUndefined()
    act(() => card(1).querySelectorAll('.hv-chk')[1].click())
    n = renders()
    expect(n[1]).toBeGreaterThan(0)
    expect(n[2]).toBeGreaterThan(0)
    expect(n[0]).toBeUndefined()
    expect(card(2).classList.contains('hv-exopen')).toBe(true)
  })

  it('a superset partner re-renders with its pair', () => {
    render([entry(0), { ...entry(1), sg: 'a' }, { ...entry(2), sg: 'a' }])
    renders()
    typeInto(card(1).querySelector('input.hv-num'), '70')
    const n = renders()
    expect(n[1]).toBeGreaterThan(0)
    expect(n[2]).toBeGreaterThan(0)
    expect(n[0]).toBeUndefined()
  })

  it('a record set in one card takes the mark off the same exercise in another', () => {
    const past = { id: 'w0', d: '2026-10-01', start: 1, end: 2, name: 'Old', entries: [{ id: REPS[0], sets: [{ w: 50, r: 8, done: true }] }] }
    render([entry(0), entry(1), entry(2, REPS[0])], [past])
    const marks = () => [0, 1, 2].map(k => card(k).querySelectorAll('.hv-pr-live').length)
    act(() => card(0).querySelectorAll('.hv-chk')[0].click())
    expect(marks()).toEqual([1, 0, 0])
    typeInto(card(2).querySelector('input.hv-num'), '80')
    renders()
    act(() => card(2).querySelectorAll('.hv-chk')[0].click())
    expect(marks()).toEqual([0, 0, 1])
    const n = renders()
    expect(n[0]).toBeGreaterThan(0)
    expect(n[1]).toBeUndefined()
  })

  it('a card that skips a render keeps its set rows bound to its entry’s new object', () => {
    // upstream's binders (views/Workout.jsx): both maps keyed by the entry object
    const exRefs = new Map(), setRefs = new Map()
    const bindExRef = (e, el) => { if (el) exRefs.set(e, el); else { exRefs.delete(e); setRefs.delete(e) } }
    const bindSetRef = (e, i, el) => {
      let m = setRefs.get(e)
      if (el) { if (!m) setRefs.set(e, (m = new Map())); m.set(i, el) } else if (m) m.delete(i)
    }
    const blockProps = idx => ({ editing: false, onField: (i, f, v) => useStore.getState().update(st => { st.active.entries[idx].sets[i][f] = v }) })
    function Host() {
      const A = useStore(st => st.S.active)
      return <HevyWorkout units={supersetUnits(A.entries)} editing={false} blockProps={blockProps} bindExRef={bindExRef} bindSetRef={bindSetRef} actions={{}} />
    }
    const S = clone(DEF)
    S.workouts = []
    S.active = { id: 'hv', d: '2026-10-16', start: Date.now(), name: 'Leg Day', cur: 0, entries: [entry(0), entry(1)] }
    useStore.setState({ S, user: null })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root.render(<MemoryRouter><Host /></MemoryRouter>))
    renders()
    typeInto(card(0).querySelector('input.hv-num'), '75')
    expect(renders()[1]).toBeUndefined()
    const now = useStore.getState().S.active.entries
    expect(exRefs.get(now[1])).toBe(card(1).parentElement)
    expect([...(setRefs.get(now[1])?.values() || [])]).toEqual([...card(1).querySelectorAll('.hv-row')])
  })

  it('a routine’s workout, with a past session of it, re-renders only the card typed or ticked in', () => {
    const ex = k => ({ id: REPS[k], sets: 2, reps: 8, w: 60 })
    const routine = { id: 'r1', name: 'Upper A', ex: [ex(0), ex(1), ex(2)] }
    const past = { id: 'w0', d: '2026-10-09', start: 1, end: 2, name: 'Upper A', rid: 'r1',
      entries: [0, 1, 2].map(k => ({ id: REPS[k], rid: 'r1', sets: [{ w: 55, r: 8, done: true }, { w: 55, r: 8, done: true }] })) }
    render([0, 1, 2].map(k => ({ ...entry(k), rid: 'r1' })), [past], [routine])
    act(() => card(1).querySelectorAll('.hv-row')[0].click())
    renders()
    typeInto(card(1).querySelector('input.hv-num'), '62.5')
    act(() => card(1).querySelectorAll('.hv-chk')[0].click())
    const n = renders()
    expect(n[1]).toBeGreaterThan(0)
    expect(n[0]).toBeUndefined()
    expect(n[2]).toBeUndefined()
  })
})
