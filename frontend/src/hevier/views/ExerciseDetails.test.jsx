// @vitest-environment happy-dom
// Exercise details through seam S10: upstream's exerciseDetailSheet opens the
// fork's Summary · History · How to sheet, built from upstream's read-back of the log.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { modeOf } from '../../lib/history.js'
import { exerciseDetailSheet } from '../../sheets.jsx'
import { hooks } from '../hooks.js'
import { installExerciseDetails } from './ExerciseDetails.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const EX = EXDB.find(e => /barbell bench press/i.test(e.n) && modeOf({ id: e.id }) === 'reps')
const day = d => new Date(d + 'T18:00:00').getTime()
let root, container

function open(workouts) {
  const S = clone(DEF)
  S.workouts = workouts
  useStore.setState({ S, user: null })
  exerciseDetailSheet(EX)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const sheet = useUI.getState().sheets.at(-1)
  act(() => root.render(sheet.render(() => {})))
}
const tab = label => act(() => [...container.querySelectorAll('.hv-xd-tabs button')].find(b => b.textContent === label).click())

beforeEach(() => { useUI.setState({ sheets: [], toastMsg: '' }); installExerciseDetails() })
afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  hooks.exerciseDetail = null
})

describe('hevier: exercise details (seam S10)', () => {
  const log = [
    { id: 'a', d: new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10), name: 'Push Day', start: day('2026-09-26'), end: day('2026-09-26') + 3600000,
      entries: [{ id: EX.id, sets: [{ w: 60, r: 8, done: true }, { w: 62.5, r: 6, done: true }] }] },
  ]

  it('opens the fork’s sheet with records and set records', () => {
    open(log)
    expect(container.querySelector('.hv-xd')).toBeTruthy()
    expect(container.querySelector('.hv-xd-big').textContent).toContain('62.5')
    expect(container.textContent).toContain('Personal Records')
    expect(container.textContent).toContain('Best Set Volume')
    const rows = [...container.querySelectorAll('.hv-xd-rr')].map(r => r.firstChild.textContent)
    expect(rows).toEqual(['6', '8'])
  })

  it('History lists each session under its workout’s name', () => {
    open(log)
    tab('History')
    const card = container.querySelector('.hv-xd-sess')
    expect(card.textContent).toContain('Push Day')
    expect(card.querySelectorAll('.hv-xd-set')).toHaveLength(2)
  })

  it('How to shows the steps, and an empty log says so', () => {
    open([])
    expect(container.textContent).toContain('No sessions logged yet')
    tab('How to')
    expect(container.querySelector('.hv-xd-howto')).toBeTruthy()
  })

  it('Strength level: Compare strength folds the fields open, Save places the Best 1RM (D19)', () => {
    open(log)
    const sl = () => container.querySelector('.hv-sl')
    expect(sl().querySelector('input')).toBeNull()
    act(() => [...sl().querySelectorAll('button')].find(b => b.textContent === 'Compare strength').click())
    expect([...sl().querySelectorAll('button')].some(b => b.textContent === 'Look up on strengthlevel.com')).toBe(true)
    const set = (input, v) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, v)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    const inputs = [...sl().querySelectorAll('input')]
    expect(inputs).toHaveLength(5)
    act(() => ['40', '55', '70', '90', '110'].forEach((v, i) => set(inputs[i], v)))
    act(() => sl().querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(useStore.getState().S.hvStrength[EX.id]).toMatchObject({ lv: [40, 55, 70, 90, 110], u: 'kg' })
    expect(sl().querySelector('form')).toBeNull()
    const best = Number(container.textContent.match(/Best 1RM ([\d.]+)/)[1])
    expect(best).toBeGreaterThan(70); expect(best).toBeLessThan(90)
    expect(sl().querySelector('.hv-sl-head').textContent).toMatch(/^Intermediate · [\d.]+ kg to Advanced$/)
    act(() => [...sl().querySelectorAll('button')].find(b => b.textContent === 'Edit').click())
    act(() => [...sl().querySelectorAll('button')].find(b => b.textContent === 'Remove levels').click())
    expect(useStore.getState().S.hvStrength?.[EX.id]).toBeUndefined()
  })

  it('without the hook it is upstream’s sheet', () => {
    hooks.exerciseDetail = null
    open(log)
    expect(container.querySelector('.hv-xd')).toBeNull()
    expect(container.querySelector('.exdetail-name')).toBeTruthy()
  })
})
