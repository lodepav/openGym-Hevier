// @vitest-environment happy-dom
// Statistics' Sets per muscle card (D142): a week without training opens on the month (the sixth audit, 2026-11-22).
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { EXDB } from '../../lib/exercises.js'
import MuscleSetsCard from './MuscleSetsCard.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const BENCH = EXDB.find(e => /bench press/i.test(e.n) && /barbell/i.test(e.eq || '')).id
const W = d => ({ id: 'w' + d, d, start: 1, end: 2, entries: [{ id: BENCH, sets: [{ w: 60, r: 8, done: true }] }] })
let root, container

function render(workouts) {
  const S = Object.assign(structuredClone(DEF), { workouts, weekStart: 1 })
  useStore.setState({ S, user: null })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MuscleSetsCard S={S} today="2026-10-16" />))
}
const pressed = () => container.querySelector('.hv-chip[aria-pressed="true"]').textContent

afterEach(() => { if (root) act(() => root.unmount()); container?.remove() })

describe('hevier: the Sets per muscle card', () => {
  it('opens on the week with a set this week, on the month without one', () => {
    render([W('2026-10-14')])
    expect(pressed()).toBe('Week')
    act(() => root.unmount()); container.remove()
    render([W('2026-10-05')])
    expect(pressed()).toBe('Month')
    expect(container.querySelector('.hv-mset')).toBeTruthy()
  })
})
