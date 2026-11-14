// @vitest-environment happy-dom
// Heart rate and weigh-ins read from Health Connect (hevier/DECISIONS.md D27): what the screens do
// with them. The reading itself is upstream's (lib/health-sync.js, since v1.4.3).
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { todayISO } from '../../lib/format.js'
import { bwSheet } from '../../sheets.jsx'
import { hevierRoutes } from '../routes.jsx'
import { DETAIL_PATH } from './WorkoutDetail.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const BENCH = EXDB.find(e => /^barbell bench press$/i.test(e.n))
const start = new Date('2026-10-10T18:00:00').getTime()
let root, container

async function mount(el) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => root.render(el))
}
const withState = edit => { const S = clone(DEF); edit(S); useStore.setState({ S, user: null }) }

beforeEach(() => {
  useUI.setState({ sheets: [], toastMsg: '' })
})
afterEach(() => { if (root) act(() => root.unmount()); container?.remove() })

describe('hevier: Health Connect reads (D27)', () => {
  it('Workout Detail shows the session’s heart rate and each set’s', async () => {
    withState(S => {
      S.workouts = [{ id: 'w1', d: '2026-10-10', start, end: start + 3600e3, name: 'Push', vol: 960, hr: { avg: 128, max: 161, src: 'hc', n: 900 },
        entries: [{ id: BENCH.id, sets: [{ w: 60, r: 8, done: true, hr: { avg: 141, max: 155 } }, { w: 60, r: 8, done: true }] }] }]
    })
    await mount(<MemoryRouter initialEntries={[{ pathname: DETAIL_PATH, state: { ref: { id: 'w1', d: '2026-10-10', start } } }]}>
      <Routes>{hevierRoutes}<Route path="*" element={<div id="elsewhere" />} /></Routes>
    </MemoryRouter>)
    expect(container.querySelector('.hv-wd-hrline').textContent).toBe('Heart rate 128 avg · 161 max')
    expect([...container.querySelectorAll('.hv-wd-hr')].map(x => x.textContent)).toEqual(['Heart rate: 141'])
  })

  it('a workout without one shows none', async () => {
    withState(S => { S.workouts = [{ id: 'w1', d: '2026-10-10', start, end: start + 3600e3, entries: [{ id: BENCH.id, sets: [{ w: 60, r: 8, done: true }] }] }] })
    await mount(<MemoryRouter initialEntries={[{ pathname: DETAIL_PATH, state: { ref: { id: 'w1', d: '2026-10-10', start } } }]}>
      <Routes>{hevierRoutes}</Routes>
    </MemoryRouter>)
    expect(container.querySelector('.hv-wd-hrline')).toBeNull()
    expect(container.querySelector('.hv-wd-hr')).toBeNull()
  })

  // Upstream 1.4.4 keeps several weigh-ins a day (#859, D27's 1.4.4 note): a typed one joins the
  // imported one, and the day reads as typed.
  it('typing over an imported weigh-in adds a typed one beside it (upstream’s rule)', async () => {
    withState(S => { S.bodyweight = [{ d: todayISO(), w: 80, t: 1, src: 'hc' }] })
    bwSheet()
    await mount(useUI.getState().sheets.at(-1).render(() => {}))
    act(() => [...container.querySelectorAll('button')].find(b => b.textContent === 'Save').click())
    const [day, ...more] = useStore.getState().S.bodyweight
    expect(more).toEqual([])
    expect(day).toMatchObject({ d: todayISO(), w: 80 })
    expect(day.src).toBeUndefined()
    expect(day.ins.map(x => x.src || 'typed')).toEqual(['hc', 'typed'])
  })
})
