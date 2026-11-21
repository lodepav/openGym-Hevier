// @vitest-environment happy-dom
// Workout Detail through seam S14 (reference/SCREENS.md §4): upstream's workoutDetailSheet opens
// the fork's page, which reads the saved workout back; ⋯ → All details is upstream's sheet.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { setNav } from '../../lib/nav.js'
import { workoutDetailSheet } from '../../sheets.jsx'
import { hevierRoutes } from '../routes.jsx'
import { hooks } from '../hooks.js'
import { installWorkoutDetail, DETAIL_PATH } from './WorkoutDetail.jsx'
import { rowMode } from '../lib/hold-set.js'
import { workoutTrends, workoutSideTrends } from '../lib/set-trend.js'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))
// Counted, to show each exercise's trends are worked out once a render (the audit, 2026-11-21).
vi.mock('../lib/set-trend.js', async orig => { const m = await orig(); return { ...m, workoutTrends: vi.fn(m.workoutTrends), workoutSideTrends: vi.fn(m.workoutSideTrends) } })

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const BENCH = EXDB.find(e => /^barbell bench press$/i.test(e.n))
const SQUAT = EXDB.find(e => /^barbell full squat$/i.test(e.n)) || EXDB.find(e => /^barbell squat$/i.test(e.n))
const start = new Date('2026-10-10T18:00:00').getTime()
const W = {
  id: 'w1', d: '2026-10-10', start, end: start + 3600000, name: 'Push Day', note: 'Felt strong', vol: 1440,
  entries: [{ id: BENCH.id, target: { sets: 3, reps: 8 }, sets: [
    { w: 40, r: 10, done: true, phase: 'warmup' }, { w: 60, r: 8, done: true }, { w: 60, r: 8, done: true }, { w: 60, r: 8, done: false },
  ] }],
}
let root, container, path

function Bridge() { const n = useNavigate(); setNav(n); path = useLocation().pathname; return null }

function render() {
  const S = clone(DEF)
  // The week before sets the bar the workout beats (D51).
  S.workouts = [{ id: 'w0', d: '2026-10-03', start: start - 7 * 86400000, entries: [{ id: BENCH.id, sets: [{ w: 55, r: 8, done: true }] }] }, clone(W)]
  useStore.setState({ S, user: null })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={['/home']}>
    <Routes>{hevierRoutes}<Route path="*" element={<div id="elsewhere" />} /></Routes>
    <Bridge />
  </MemoryRouter>))
}

beforeEach(() => { useUI.setState({ sheets: [], toastMsg: '' }); installWorkoutDetail() })
afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  hooks.workoutDetail = null
  hooks.setMode = null
})

describe('hevier: Workout Detail (seam S14)', () => {
  it('Edit Workout, then Save or ✕, comes back to this page, not upstream’s History', () => {
    render()
    act(() => workoutDetailSheet(W))
    act(() => container.querySelector('.hv-wd-edit').click())
    expect(path).toBe('/workout')
    act(() => container.querySelector('.hv-finish').click())
    expect(useStore.getState().S.active).toBeNull()
    expect(path).toBe(DETAIL_PATH)
    act(() => container.querySelector('.hv-wd-edit').click())
    act(() => container.querySelector('[aria-label="Close editor"]').click())
    expect(useStore.getState().S.active).toBeNull()
    expect(path).toBe(DETAIL_PATH)
  })

  it('opens the fork’s page instead of upstream’s sheet', () => {
    render()
    act(() => workoutDetailSheet(W))
    expect(path).toBe(DETAIL_PATH)
    expect(useUI.getState().sheets).toHaveLength(0)
    const page = container.querySelector('.hv-wd')
    expect(page.querySelector('.hv-wd-t').textContent).toBe('Push Day')
    expect(page.textContent).toContain('Felt strong')
    // D133: the bars went; the line under the stats has the counts (sets mode, D18).
    expect(page.textContent).not.toContain('Muscle Split')
    expect(page.querySelector('.hv-mline').textContent).toContain('Chest')
    expect(page.querySelector('.hv-name').textContent).toBe(BENCH.n)
    expect(page.querySelector('.hv-wd-row .hv-pr')).toBeTruthy()
  })

  it('works out each exercise’s trends once a render', () => {
    render()
    act(() => workoutDetailSheet(W))
    const n = workoutTrends.mock.calls.length, m = workoutSideTrends.mock.calls.length
    act(() => useStore.getState().update(s => { s.hvUnrelated = 1 }))
    expect([workoutTrends.mock.calls.length - n, workoutSideTrends.mock.calls.length - m]).toEqual([1, 1])
  })

  it('lists the ticked sets, the warm-up as W', () => {
    render()
    act(() => workoutDetailSheet(W))
    const rows = [...container.querySelectorAll('.hv-wd-row:not(.hv-wd-th)')].map(r => r.firstChild.textContent)
    expect(rows).toEqual(['W', '1', '2'])
    // Each record is on the set that made it (the first at 60), named; the session's volume on the last work set.
    const prRows = [...container.querySelectorAll('.hv-wd-row')].filter(r => r.querySelector('.hv-pr'))
    expect(prRows.map(r => r.firstChild.textContent)).toEqual(['1', '2'])
    expect(prRows[0].querySelector('.hv-pr').textContent).toBe('Heaviest Weight · Best 1RM · Best Set Volume')
    expect(prRows[1].querySelector('.hv-pr').textContent).toBe('Best Session Volume')
    expect(container.querySelector('.hv-exhd .hv-pr')).toBeNull()
    expect([...container.querySelectorAll('.hv-stats div')].find(d => d.textContent.startsWith('Records')).textContent).toBe('Records4')
    const sets = [...container.querySelectorAll('.hv-stats div')].find(d => d.textContent.startsWith('Sets'))
    expect(sets.querySelector('b').textContent).toBe('2')
  })

  it('marks a timed hold H in place of its number, as a warm-up is W (D89)', () => {
    render()
    const H = { ...clone(W), id: 'wh', entries: [{ ...clone(W.entries[0]), sets: [
      { w: 40, r: 10, done: true, phase: 'warmup' }, { w: 60, r: 8, done: true }, { w: 60, sec: 30, mode: 'time', done: true }, { w: 60, r: 8, done: true },
    ] }] }
    act(() => useStore.setState(st => ({ S: { ...st.S, workouts: [...st.S.workouts, H] } })))
    hooks.setMode = rowMode   // hevier/index.js sets it in the app (S48)
    act(() => workoutDetailSheet(H))
    const rows = [...container.querySelectorAll('.hv-wd-row:not(.hv-wd-th)')]
    expect(rows.map(r => r.firstChild.textContent)).toEqual(['W', '1', 'H', '2'])
    expect(rows[2].firstChild.className).toBe('hv-wd-h')
    // Spoken as words, not letters (the audit, 2026-11-21).
    expect([rows[0], rows[2]].map(r => [r.firstChild.getAttribute('role'), r.firstChild.getAttribute('aria-label')])).toEqual([['img', 'Warm-up'], ['img', 'Hold']])
    expect(rows[1].firstChild.getAttribute('aria-label')).toBeNull()
    expect(rows[2].textContent).toContain('0:30')
  })

  // D133: a per-side set of any type is an L row and an R row under one number, each written like
  // any other set, effort and heart rate once on the first row. Upstream's per-side drop set keeps
  // its drops on each side (workout-model.js addSideDrop): each side shows its own.
  it('writes a per-side set of any type as an L row and an R row (D133)', () => {
    render()
    const sd = (w, r, extra = {}) => ({ w, r, done: true, ...extra })
    const P = { ...clone(W), id: 'wp', entries: [{ id: SQUAT.id, sets: [
      { phase: 'warmup', w: 10, r: 24, done: true, sides: { L: sd(10, 12), R: sd(10, 12) } },
      { w: 20, r: 19, done: true, rpe: 8, hr: { avg: 112, max: 120 }, sides: { L: sd(20, 10, { rpe: 8 }), R: sd(20, 9, { rpe: 7 }) } },
      { failure: true, w: 20, r: 15, done: true, sides: { L: sd(20, 8), R: sd(20, 7) } },
      { type: 'dropset', w: 20, r: 16, done: true, sides: {
        L: sd(20, 8, { type: 'dropset', drops: [{ w: 15, r: 6 }] }), R: sd(20, 8, { type: 'dropset', drops: [{ w: 15, r: 5 }] }) } },
      { side: 'L', mode: 'time', sec: 45, w: 0, done: true, rpe: 7 }, { side: 'R', mode: 'time', sec: 40, w: 0, done: true },
      { w: 30, r: 5, done: true },
    ] }] }
    act(() => useStore.setState(st => ({ S: { ...st.S, workouts: [...st.S.workouts, P] } })))
    hooks.setMode = rowMode
    act(() => workoutDetailSheet(P))
    const rows = [...container.querySelectorAll('.hv-wd-row:not(.hv-wd-th)')]
    const read = r => [r.children[0].textContent, r.querySelector('.hv-wd-v').textContent]
    expect(rows.map(read)).toEqual([
      ['W', 'L10 kg × 12'], ['', 'R10 kg × 12'],
      ['1', 'L20 kg × 10'], ['', 'R20 kg × 9'],
      ['2', 'L20 kg × 8 F'], ['', 'R20 kg × 7 F'],
      ['3', 'L20 kg × 8 ↘ 15 kg × 6'], ['', 'R20 kg × 8 ↘ 15 kg × 5'],
      ['H', 'L0:45'], ['', 'R0:40'],
      ['4', '30 kg × 5'],
    ])
    expect([...container.querySelectorAll('.hv-lr')].slice(0, 2).map(x => x.getAttribute('aria-label'))).toEqual(['Left', 'Right'])
    // Effort in its own column, once on the first row (the scale's name read out only); heart rate the same.
    expect(container.querySelector('.hv-wd-th').textContent).toContain('RPE')
    expect(rows.map(r => r.querySelector('.hv-wd-rpe')?.textContent ?? null)).toEqual(['', '', 'RPE 8', '', '', '', '', '', 'RPE 7', '', ''])
    expect(rows.map(r => !!r.querySelector('.hv-wd-hr'))).toEqual([false, false, true, false, false, false, false, false, false, false, false])
  })

  it('names the effort column RIR on a reps-in-reserve profile, and leaves it out with no effort', () => {
    render()
    const P = { ...clone(W), id: 'wr', entries: [{ id: SQUAT.id, sets: [{ w: 30, r: 5, done: true, rpe: 8 }] }] }
    act(() => useStore.setState(st => ({ S: { ...st.S, effort: 'rir', workouts: [...st.S.workouts, P] } })))
    act(() => workoutDetailSheet(P))
    expect(container.querySelector('.hv-wd-th').textContent).toContain('RIR')
    expect(container.querySelector('.hv-wd-row:not(.hv-wd-th) .hv-wd-rpe').textContent).toBe('RIR 2')
    expect(container.querySelector('.hv-wd-row:not(.hv-wd-th) .hv-wd-v').textContent).toBe('30 kg × 5')
    act(() => workoutDetailSheet(W))
    expect(container.querySelector('.hv-wd-th').textContent).not.toMatch(/RPE|RIR/)
    expect(container.querySelector('.hv-wd-rpe')).toBeNull()
  })

  it('shows a set’s note under its row (D5, upstream 1.4.4)', () => {
    render()
    const N = { ...clone(W), id: 'wn', entries: [{ ...clone(W.entries[0]), sets: [{ w: 60, r: 8, done: true, note: 'felt strong' }] }] }
    act(() => useStore.setState(st => ({ S: { ...st.S, workouts: [...st.S.workouts, N] } })))
    act(() => workoutDetailSheet(N))
    expect(container.querySelector('.hv-wd-setnote').textContent).toBe('felt strong')
  })

  it('marks each work set against the same set last time (D66)', () => {
    render()
    act(() => workoutDetailSheet(W))
    const trend = n => [...container.querySelectorAll('.hv-wd-row')].find(r => r.firstChild.textContent === n)?.querySelector('.hv-trend')
    expect(trend('W')).toBeNull()                       // warm-ups are not compared
    expect(trend('2')).toBeNull()                       // last time had one set
    // 60 × 8 beats last week's 55 × 8, but it is a record: the badge says so, no arrow.
    const row1 = [...container.querySelectorAll('.hv-wd-row')].find(r => r.firstChild.textContent === '1')
    expect(row1.querySelector('.hv-pr')).toBeTruthy()
    expect(trend('1')).toBeNull()
    // Last week's second set, 60 × 9: today's 60 × 8 is less, and no record, so it gets ↓.
    act(() => useStore.setState(({ S }) => ({ S: { ...S, workouts: S.workouts.map((w, k) => (k ? w : { ...w, entries: [{ ...w.entries[0], sets: [...w.entries[0].sets, { w: 60, r: 9, done: true }] }] })) } })))
    expect(trend('2').className).toContain('down')
    expect(trend('2').getAttribute('aria-label')).toBe('Less than last time')
    // One line says what the marks mean, under the first exercise that has one, and only there (the critique, 2026-11-21).
    const legends = [...container.querySelectorAll('.hv-wd-legend')]
    expect(legends.map(l => l.textContent)).toEqual(['↑ = ↓ against the same set last time'])
    expect(legends[0].closest('.hv-wd-ex').querySelector('.hv-trend')).toBeTruthy()
  })

  it('⋯ → All details opens upstream’s sheet', () => {
    render()
    act(() => workoutDetailSheet(W))
    act(() => container.querySelector('.hv-pagebar [aria-label="More"]').click())
    const menu = useUI.getState().sheets.at(-1)
    const host = document.createElement('div')
    const r2 = createRoot(host)
    act(() => r2.render(menu.render(() => {})))
    const all = [...host.querySelectorAll('.menu-item')].find(i => i.textContent.includes('All details'))
    act(() => all.click())
    expect(useUI.getState().sheets.length).toBeGreaterThan(0)
    act(() => r2.unmount())
  })

  it('goes home when the workout is gone', () => {
    render()
    act(() => workoutDetailSheet(W))
    act(() => useStore.getState().update(s => { s.workouts = [] }))
    expect(path).toBe('/home')
  })
  it('shows how long each exercise took, from its tick times (D88)', () => {
    render()
    act(() => workoutDetailSheet(W))
    expect(container.querySelector('.hv-extime')).toBeNull()
    const timed = clone(W)
    timed.id = 'w2'
    timed.entries[0].sets.forEach((s, i) => { if (s.done) s.at = start + (i + 1) * 4 * 60000 })
    act(() => useStore.getState().update(s => { s.workouts.push(timed) }))
    act(() => workoutDetailSheet(timed))
    expect(container.querySelector('.hv-extime').textContent).toBe('Exercise time: 12min')
  })
  it('compares the workout with the same routine’s last one, under the stats', () => {
    render()
    act(() => workoutDetailSheet(W))
    expect(container.querySelector('.hv-wd-vs')).toBeNull()   // the week before has another name
    // 2 × 60 × 8 = 960 against 1 × 55 × 8 = 440 kg; 60 min against 50.
    act(() => useStore.getState().update(s => {
      s.hvVolume = 'weight'
      Object.assign(s.workouts[0], { name: 'Push Day', end: s.workouts[0].start + 50 * 60000 })
    }))
    expect(container.querySelector('.hv-wd-vs').textContent).toBe('+520 kg · +1 set · +10min vs 3 Oct')
    // A number that did not change is left out, and with none left the line says so.
    act(() => useStore.getState().update(s => { s.workouts[0].end = s.workouts[0].start + 60 * 60000 }))
    expect(container.querySelector('.hv-wd-vs').textContent).toBe('+520 kg · +1 set vs 3 Oct')
    act(() => useStore.getState().update(s => { s.workouts[0].entries = JSON.parse(JSON.stringify(W.entries)) }))
    expect(container.querySelector('.hv-wd-vs').textContent).toBe('Same as 3 Oct')
  })
})
