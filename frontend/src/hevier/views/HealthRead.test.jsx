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
import { Section } from '../../components/ui.jsx'
import { insertBeforeSection } from '../lib/settings.js'
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
    expect([...container.querySelectorAll('.hv-wd-hr')].map(x => x.textContent)).toEqual(['141'])
  })

  it('a workout without one shows none', async () => {
    withState(S => { S.workouts = [{ id: 'w1', d: '2026-10-10', start, end: start + 3600e3, entries: [{ id: BENCH.id, sets: [{ w: 60, r: 8, done: true }] }] }] })
    await mount(<MemoryRouter initialEntries={[{ pathname: DETAIL_PATH, state: { ref: { id: 'w1', d: '2026-10-10', start } } }]}>
      <Routes>{hevierRoutes}</Routes>
    </MemoryRouter>)
    expect(container.querySelector('.hv-wd-hrline')).toBeNull()
    expect(container.querySelector('.hv-wd-hr')).toBeNull()
  })

  it('typing over an imported weigh-in makes it a typed one (upstream’s rule)', async () => {
    withState(S => { S.bodyweight = [{ d: todayISO(), w: 80, t: 1, src: 'hc' }] })
    bwSheet()
    await mount(useUI.getState().sheets.at(-1).render(() => {}))
    act(() => [...container.querySelectorAll('button')].find(b => b.textContent === 'Save').click())
    expect(useStore.getState().S.bodyweight).toEqual([{ d: todayISO(), w: 80, t: expect.any(Number) }])
  })

  it('goes in right before upstream’s “Bring data in” section', () => {
    const tree = <div><Section title="Backup" /><div><Section title="Bring data in" /></div></div>
    const out = insertBeforeSection(tree, 'Bring data in', <i key="x" id="mine" />)
    const inner = out.props.children[1].props.children
    expect(inner.map(k => k.props.id || k.props.title)).toEqual(['mine', 'Bring data in'])
    expect(insertBeforeSection(tree, 'Nope', <i key="x" />)).toBe(tree)
  })
})
