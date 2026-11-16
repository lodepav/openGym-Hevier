// @vitest-environment happy-dom
// The History tab (hevier/DECISIONS.md D126, D135): this week's numbers, the chips, the feed.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation, useParams } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXDB } from '../../lib/exercises.js'
import { hevierRoutes } from '../routes.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const EX = EXDB.find(e => /barbell/i.test(e.eq || '')).id
let root, container, path, state

function Where() { const l = useLocation(); path = l.pathname; state = l.state; return null }
function Page() { return <div id="page">{useParams().page}</div> }
function render(patch = {}) {
  useStore.setState({ S: Object.assign(clone(DEF), { weighIn: false }, patch), user: null, isGuest: () => true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={['/history-tab']}><Routes>{hevierRoutes}
    <Route path="/settings/:page" element={<Page />} /><Route path="*" element={<div id="elsewhere" />} /></Routes><Where /></MemoryRouter>))
}
const wo = (d, w) => ({ id: 'w' + d, d, name: 'Push', start: Date.parse(d + 'T10:00:00'), end: Date.parse(d + 'T11:00:00'),
  entries: [{ id: EX, sets: [{ w, r: 8, done: true }, { w, r: 8, done: true }] }] })
const chip = text => [...container.querySelectorAll('.hv-hlinks button')].find(b => b.textContent === text)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 18, 12))   // Wednesday 18 Nov
  localStorage.clear()
  useUI.setState({ sheets: [], toastMsg: '', timer: null, work: null })
})
afterEach(() => {
  if (root) act(() => root.unmount())
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('hevier: History (D135)', () => {
  it('this week in three numbers, then the workouts as feed cards', () => {
    render({ weekStart: 1, workouts: [wo('2026-11-09', 50), wo('2026-11-16', 60)] })
    const tiles = [...container.querySelectorAll('.hv-htile')].map(x => x.textContent)
    expect(tiles[0]).toContain('1')
    expect(tiles[1]).not.toMatch(/^Time0/)
    expect(tiles[2]).toMatch(/^Sets2/)
    expect(container.querySelector('.hv-htile .hv-pr')).toBeTruthy()
    expect(container.querySelectorAll('.hv-wcard')).toHaveLength(2)
  })

  it('the chips open the statistics; Sets per muscle opens its own page', () => {
    render()
    expect([...container.querySelectorAll('.hv-hlinks button')].map(b => b.textContent))
      .toEqual(['Calendar', 'Statistics', 'Month report', 'Sets per muscle', 'Body weight', 'More'])
    act(() => chip('Sets per muscle').click())
    expect(path).toBe('/muscle-sets')
    act(() => root.unmount()); container.remove()
    render()
    act(() => chip('More').click())
    expect(path).toBe('/stats/all')
  })

  it('an empty feed points to the Hevy import on Settings → Integrations', () => {
    render({ workouts: [] })
    expect(container.textContent).toContain('No workouts yet.')
    act(() => [...container.querySelectorAll('button')].find(b => b.textContent === 'Import from Hevy').click())
    expect(container.querySelector('#page').textContent).toBe('integrations')
  })
})
