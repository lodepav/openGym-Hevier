// @vitest-environment happy-dom
// Arrange Statistics (hevier/DECISIONS.md D142): move a tile or card with its handle, switch one off
// or on, Reset with Undo; all kept in S.hvStatsLayout.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { hevierRoutes } from '../routes.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, container, path

function Where() { path = useLocation().pathname; return null }
function render(entries, patch = {}) {
  useStore.setState({ S: Object.assign(structuredClone(DEF), { weighIn: false }, patch), user: null, isGuest: () => true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
    <Routes>{hevierRoutes}<Route path="*" element={<div />} /></Routes><Where /></MemoryRouter>))
}
const list = n => container.querySelectorAll('.hv-arrlist')[n]
const names = n => [...list(n).querySelectorAll('.hv-arr-n')].map(x => x.textContent)
const row = (n, name) => [...list(n).querySelectorAll('.hv-arr')].find(r => r.querySelector('.hv-arr-n').textContent === name)
const layout = () => useStore.getState().S.hvStatsLayout

beforeEach(() => { useUI.setState({ sheets: [], toastMsg: '', toastAction: null }) })
afterEach(() => { if (root) act(() => root.unmount()); document.body.innerHTML = '' })

describe('hevier: Arrange Statistics (D142)', () => {
  it('says Body weight waits for a weigh-in while there is none (the critique, 2026-11-21)', () => {
    render(['/stats/arrange'])
    expect(row(0, 'Body weight').querySelector('.hv-arr-h').textContent).toBe('Shows once you log a weigh-in')
    expect(row(1, 'Body weight').querySelector('.hv-arr-h')).not.toBeNull()
    expect(row(0, 'Sets per muscle').querySelector('.hv-arr-h')).toBeNull()
    act(() => root.unmount()); document.body.innerHTML = ''
    render(['/stats/arrange'], { bodyweight: [{ d: '2026-11-01', w: 80 }] })
    expect(row(0, 'Body weight').querySelector('.hv-arr-h')).toBeNull()
  })

  it('is reached from Statistics and lists the tiles and the cards, the optional tiles off', () => {
    render(['/stats'])
    act(() => [...container.querySelectorAll('button')].find(b => b.textContent === 'Arrange').click())
    expect(path).toBe('/stats/arrange')
    expect(container.textContent).toContain('Drag or tap the handle to move. Switch one off to hide it, on to add it back.')
    expect(names(0)).toEqual(['Exercise time', 'Body weight', 'Sets per muscle', 'Training time', 'Workouts this month', 'Average RPE'])
    expect(names(1)).toEqual(['Exercise time', 'Body weight', 'Sets per muscle', 'Weekly chart'])
    const sw = row(0, 'Average RPE').querySelector('[role="switch"]')
    expect(sw.getAttribute('aria-label')).toBe('Average RPE')
    expect(sw.getAttribute('aria-checked')).toBe('false')
    expect(row(1, 'Weekly chart').querySelector('.hv-grip').getAttribute('aria-label')).toBe('Move Weekly chart')
  })

  it('a switch shows or hides its item, and Statistics follows', () => {
    render(['/stats', '/stats/arrange'])
    act(() => row(0, 'Workouts this month').querySelector('[role="switch"]').click())
    act(() => row(1, 'Weekly chart').querySelector('[role="switch"]').click())
    expect(layout().tiles.hidden).not.toContain('month')
    expect(layout().cards.hidden).toEqual(['weekly'])
    expect(row(1, 'Weekly chart').querySelector('[role="switch"]').getAttribute('aria-checked')).toBe('false')
    act(() => container.querySelector('.hv-pb-back').click())
    expect(path).toBe('/stats')
    expect([...container.querySelectorAll('[data-tile]')].map(x => x.dataset.tile)).toEqual(['sets', 'hours', 'month'])
    expect([...container.querySelectorAll('[data-card]')].map(x => x.dataset.card)).toEqual(['sets'])
  })

  it('the handle moves with the arrow keys, or a tap and Move up', () => {
    render(['/stats/arrange'])
    act(() => row(1, 'Weekly chart').querySelector('.hv-grip').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })))
    expect(names(1)).toEqual(['Exercise time', 'Body weight', 'Weekly chart', 'Sets per muscle'])
    expect(layout().cards.order).toEqual(['time', 'weight', 'weekly', 'sets'])
    act(() => row(1, 'Weekly chart').querySelector('.hv-grip').click())
    const sheet = useUI.getState().sheets.at(-1)
    expect(sheet).toBeTruthy()
    const host = document.createElement('div')
    document.body.appendChild(host)
    const r = createRoot(host)
    act(() => r.render(sheet.render(() => {})))
    expect(host.querySelector('h3').textContent).toBe('Move Weekly chart')
    act(() => [...host.querySelectorAll('.menu-item')].find(i => i.textContent === 'Move up').click())
    act(() => r.unmount())
    expect(names(1)).toEqual(['Exercise time', 'Weekly chart', 'Body weight', 'Sets per muscle'])
  })

  it('leaves out what has its module part off, a move stepping over it; no data yet still lists it', () => {
    render(['/stats/arrange'], { bodyweight: [], hvModuleParts: { 'hvStats.time': false } })
    expect(names(0)).toEqual(['Body weight', 'Sets per muscle', 'Training time', 'Workouts this month', 'Average RPE'])
    expect(names(1)).toEqual(['Body weight', 'Sets per muscle', 'Weekly chart'])
    act(() => root.unmount()); container.remove()
    render(['/stats/arrange'], { hvModuleParts: { 'body.weight': false } })
    expect(names(1)).toEqual(['Exercise time', 'Sets per muscle', 'Weekly chart'])
    act(() => row(1, 'Sets per muscle').querySelector('.hv-grip').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })))
    expect(names(1)).toEqual(['Sets per muscle', 'Exercise time', 'Weekly chart'])
    expect(layout().cards.order).toEqual(['sets', 'time', 'weight', 'weekly'])
  })

  it('Reset puts the first layout back, and Undo the one before', () => {
    const mine = { tiles: { order: ['rpe', 'time', 'weight', 'sets', 'hours', 'month'], hidden: ['time'] }, cards: { order: ['weekly', 'time', 'weight', 'sets'], hidden: [] } }
    render(['/stats/arrange'], { hvStatsLayout: mine })
    expect(names(0)[0]).toBe('Average RPE')
    act(() => [...container.querySelectorAll('.hv-pagebar button')].find(b => b.textContent === 'Reset').click())
    expect(names(0)).toEqual(['Exercise time', 'Body weight', 'Sets per muscle', 'Training time', 'Workouts this month', 'Average RPE'])
    expect(layout().tiles.hidden).toEqual(['month', 'rpe'])
    expect(useUI.getState().toastMsg).toBe('Layout reset')
    act(() => useUI.getState().toastAction.run())
    expect(layout()).toEqual(mine)
    expect(names(1)[0]).toBe('Weekly chart')
  })

  it('Reset is off while the layout is already the first one', () => {
    const resetBtn = () => [...container.querySelectorAll('.hv-pagebar button')].find(b => b.textContent === 'Reset')
    render(['/stats/arrange'], {})
    expect(resetBtn().disabled).toBe(true)
    act(() => row(1, 'Sets per muscle').querySelector('.hv-grip').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })))
    expect(resetBtn().disabled).toBe(false)
  })
})
