// @vitest-environment happy-dom
// Volume as sets per muscle or total weight (hevier/DECISIONS.md D18): the Settings row, the feed
// card, Workout Detail and Profile's weekly chart.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { todayISO } from '../../lib/format.js'
import Settings from '../../views/Settings.jsx'
import { hooks } from '../hooks.js'
import { installSettings } from './SettingsRootHevy.jsx'
import { WorkoutDetail } from './WorkoutDetail.jsx'
import WorkoutCard from '../components/WorkoutCard.jsx'
import WeeklyChart from '../components/WeeklyChart.jsx'
import { workoutTimeText, workoutWhenText } from '../lib/workout-when.js'
import { muscleOf } from '../lib/exercise-picker.js'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const CHEST = EXDB.find(e => muscleOf(e) === 'Chest').id
const TRI = EXDB.find(e => muscleOf(e) === 'Triceps').id
const done = { w: 50, r: 8, done: true }
const start = new Date(todayISO() + 'T10:00:00').getTime()
const W = { id: 'w1', d: todayISO(), start, end: start + 3600000, name: 'Push', vol: 2400,
  entries: [{ id: CHEST, sets: [done, done, done] }, { id: TRI, sets: [done, done] }] }
let root, container

function render(el, extra = {}, at = '/') {
  const S = Object.assign(clone(DEF), { workouts: [clone(W)] }, extra)
  useStore.setState({ S, user: null, isGuest: () => true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={[at]}><Routes><Route path="*" element={el} /></Routes></MemoryRouter>))
}
const stats = () => [...container.querySelectorAll('.hv-stats span')].map(s => s.textContent)
const line = () => container.querySelector('.hv-mline')?.textContent
const sheetHost = () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const r = createRoot(host)
  act(() => r.render(useUI.getState().sheets.at(-1).render(() => {})))
  return host
}

beforeEach(() => { useUI.setState({ sheets: [], toastMsg: '' }) })
afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  hooks.settings = null
})

describe('hevier: volume as sets per muscle (D18)', () => {
  it('Workout Detail: sets mode drops Volume for the muscle line; weight mode is as before', () => {
    const at = { pathname: '/workout-detail', state: { ref: { id: 'w1', d: W.d, start } } }
    render(<WorkoutDetail />, {}, at)
    expect(stats()).not.toContain('Volume')
    expect(line()).toBe('Chest 3 · Triceps 2')
    act(() => root.unmount()); container.remove()
    render(<WorkoutDetail />, { hvVolume: 'weight' }, at)
    expect(stats()).toContain('Volume')
    expect(line()).toBeUndefined()
  })

  it('the feed card shows Sets and the line instead of Volume, on the date line (the critique, 2026-11-21)', () => {
    render(<WorkoutCard w={W} />)
    expect(container.querySelector('.hv-wcard-d').textContent).toBe(`${workoutWhenText(W)} · ${workoutTimeText(W)} · 5 sets`)
    expect(container.querySelector('.hv-wcard-stats')).toBeNull()
    expect(line()).toBe('Chest 3 · Triceps 2')
  })

  it('the feed card shows the workout’s average heart rate when a watch saved one (D27)', () => {
    render(<WorkoutCard w={{ ...W, hr: { avg: 128, max: 161, src: 'hc', n: 300 } }} />)
    const hr = container.querySelector('.hv-wcard-d .hv-wcard-hr')
    expect(hr.textContent).toBe('128')
    expect(hr.getAttribute('aria-label')).toBe('Heart rate 128')
  })

  it('the weekly chart’s Volume is Sets, and a week lists its muscles', () => {
    render(<WeeklyChart />)
    const chips = [...container.querySelectorAll('.hv-chip')]
    expect(chips.map(c => c.textContent)).toEqual(['Duration', 'Sets', 'Reps'])
    act(() => chips[1].click())
    expect(container.querySelector('.hv-chart-h h2').textContent).toBe('Weekly chart')
    act(() => [...container.querySelectorAll('button.hv-barcol')].at(-1).click())
    expect(container.querySelector('.hv-chart-h h2').textContent).toMatch(/^Week of .+: 5 sets$/)
    expect(sheetHost().textContent).toContain('Chest')
  })

  it('a tap between the weekly chart’s bars picks the nearest week, once', () => {
    render(<WeeklyChart />)
    act(() => container.querySelectorAll('.hv-chip')[1].click())
    const cols = [...container.querySelectorAll('button.hv-barcol')]
    cols.forEach((c, i) => { c.getBoundingClientRect = () => ({ left: i * 10, width: 6 }) })
    const open = vi.spyOn(useUI.getState(), 'openSheet')
    // 10 px per week, a 6 px bar and a 4 px gap: x just past the second-to-last bar's edge is nearest to it
    act(() => container.querySelector('.hv-bars').dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: (cols.length - 2) * 10 + 7 })))
    expect(container.querySelector('.hv-chart-h h2').textContent).toMatch(/^Week of .+: 0 sets$/)
    expect(open).toHaveBeenCalledTimes(1)
    act(() => cols.at(-1).click())
    expect(container.querySelector('.hv-chart-h h2').textContent).toMatch(/^Week of .+: 5 sets$/)
    expect(open).toHaveBeenCalledTimes(2)
    open.mockRestore()
  })

  it('Settings → Volume switches it, kept in S', () => {
    installSettings()
    render(<Settings page={null} />)
    const row = [...container.querySelectorAll('.sp-root-row')].find(r => r.textContent.includes('Volume'))
    expect(row.textContent).toContain('Sets · main muscle')
    act(() => row.click())
    let host = sheetHost()
    act(() => [...host.querySelectorAll('.menu-item')].find(i => i.textContent.includes('Secondary muscles too')).click())
    expect(useStore.getState().S.hvMuscleSets).toBe('share')   // D42, in the same sheet (review S4)
    expect(row.textContent).toContain('Sets · secondary too')
    act(() => row.click())
    host = sheetHost()
    act(() => [...host.querySelectorAll('.menu-item')].find(i => i.textContent.includes('Total weight')).click())
    expect(useStore.getState().S.hvVolume).toBe('weight')
    expect(row.textContent).toContain('Total weight')
  })
})
