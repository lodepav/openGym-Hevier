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
const stats = () => [...container.querySelectorAll('.hv-stats span, .hv-wcard-stats span')].map(s => s.textContent)
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

  it('the feed card shows Sets and the line instead of Volume', () => {
    render(<WorkoutCard w={W} />)
    expect(stats()).toEqual(['Time', 'Sets'])
    expect(container.querySelector('.hv-wcard-stats').textContent).toContain('5')
    expect(line()).toBe('Chest 3 · Triceps 2')
  })

  it('the weekly chart’s Volume is Sets, and a week lists its muscles', () => {
    render(<WeeklyChart />)
    const chips = [...container.querySelectorAll('.hv-chip')]
    expect(chips.map(c => c.textContent)).toEqual(['Duration', 'Sets', 'Reps'])
    act(() => chips[1].click())
    expect(container.querySelector('.hv-chart-h b').textContent).toBe('5 sets this week')
    act(() => [...container.querySelectorAll('button.hv-barcol')].at(-1).click())
    expect(sheetHost().textContent).toContain('Chest')
  })

  it('Settings → Volume switches it, kept in S', () => {
    installSettings()
    render(<Settings page={null} />)
    const row = [...container.querySelectorAll('.sp-root-row')].find(r => r.textContent.includes('Volume'))
    expect(row.textContent).toContain('Sets per muscle')
    act(() => row.click())
    const host = sheetHost()
    act(() => [...host.querySelectorAll('.menu-item')].find(i => i.textContent.includes('Total weight')).click())
    expect(useStore.getState().S.hvVolume).toBe('weight')
    expect(row.textContent).toContain('Total weight')
  })
})
