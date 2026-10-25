// @vitest-environment happy-dom
// Profile → Statistics → Monthly report (hevier/DECISIONS.md D23).
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { setNav } from '../../lib/nav.js'
import { EXDB } from '../../lib/exercises.js'
import { todayISO, MONTHS_LONG } from '../../lib/format.js'
import { hevierRoutes } from '../routes.jsx'
import { byExercise } from '../lib/month-report.js'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const BENCH = EXDB.find(e => /^barbell bench press$/i.test(e.n)).id
const pad = n => String(n).padStart(2, '0')
const month = by => { const n = new Date(todayISO() + 'T12:00:00'); const d = new Date(n.getFullYear(), n.getMonth() + by, 1); return { y: d.getFullYear(), mo: d.getMonth(), iso: day => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(day)}` } }
const last = month(-1), before = month(-2)
const W = (d, sets, extra = {}) => ({ id: d, d, start: Date.parse(d + 'T18:00:00'), end: Date.parse(d + 'T18:00:00') + 3600000, vol: 500,
  entries: [{ id: BENCH, sets: sets.map(w => ({ w, r: 5, done: true })) }], ...extra })
const log = [W(before.iso(5), [60]), W(last.iso(3), [70, 70]), W(last.iso(10), [75, 75, 75], { prs: [BENCH] })]

let root, container, path
function Bridge() { const n = useNavigate(); setNav(n); path = useLocation().pathname; return null }
function render(at, workouts, extra = {}) {
  const S = structuredClone(DEF)
  S.workouts = workouts
  Object.assign(S, extra)
  useStore.setState({ S, user: null })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={[at]}>
    <Routes>{hevierRoutes}<Route path="*" element={<div id="elsewhere" />} /></Routes>
    <Bridge />
  </MemoryRouter>))
}
const stat = label => [...container.querySelectorAll('.hv-report-stats > div')].find(d => d.firstChild.textContent === label)

beforeEach(() => { useUI.setState({ sheets: [], toastMsg: '' }) })
afterEach(() => { if (root) act(() => root.unmount()); container?.remove() })

describe('hevier: monthly report (D23)', () => {
  it('Statistics links to it, and it opens on last month with its changes', () => {
    render('/stats', log)
    act(() => [...container.querySelectorAll('.hv-linkrow')].find(b => b.textContent.includes('Monthly report')).click())
    expect(path).toBe('/report')
    expect(container.querySelector('.hv-report-bar h1').textContent).toContain(MONTHS_LONG[last.mo] + ' Report')
    expect(stat('Workouts').textContent).toBe('Workouts2+1')
    expect(stat('Sets').textContent).toBe('Sets5+4')
    expect([...container.querySelectorAll('h4.sec')].find(h => h.textContent.includes('PRs')).textContent).toBe(' PRs 8')
    // Every record, worked out from the log (D51): the heaviest weight, best 1RM, set and session volume.
    expect(container.textContent).toContain('Heaviest Weight · 75 kg')
    expect(container.querySelectorAll('.hv-report .hv-cal-d.done')).toHaveLength(2)
  })

  it('weight mode shows Volume in place of Sets', () => {
    render('/report', log, { hvVolume: 'weight' })
    expect(stat('Sets')).toBeUndefined()
    expect(stat('Volume').textContent).toContain('+500 kg')
  })

  it('steps back to the first logged month and no further, and that month is empty of records', () => {
    render('/report', log)
    const prev = container.querySelector('[aria-label="Previous month"]')
    act(() => prev.click())
    expect(container.querySelector('.hv-report-bar h1').textContent).toContain(MONTHS_LONG[before.mo])
    expect(stat('Workouts').textContent).toBe('Workouts1+1')
    expect(prev.disabled).toBe(true)
    expect(container.textContent).not.toContain('PRs')
  })

  it('lists the records one row per exercise, each kind once with how often it was beaten', () => {
    const rec = (id, kind, v, d) => ({ id, kind, v, d })
    const rows = byExercise([
      rec('a', 'weight', 80, '2026-09-02'), rec('b', 'reps', 10, '2026-09-03'),
      rec('a', 'e1rm', 90, '2026-09-02'), rec('a', 'weight', 85, '2026-09-09'),
    ])
    expect(rows.map(x => [x.id, x.n, x.recs.map(r => [r.kind, r.v, r.times, r.d])])).toEqual([
      ['a', 3, [['weight', 85, 2, '2026-09-09'], ['e1rm', 90, 1, '2026-09-02']]],
      ['b', 1, [['reps', 10, 1, '2026-09-03']]],
    ])
  })
})
