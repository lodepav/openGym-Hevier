// @vitest-environment happy-dom
// Measures (D14), the tenth critique, 2026-11-22: the chart's change seen under the weight, the empty
// well's action, and what a goal does before one is set. The page's other tests are in Statistics.test.jsx.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { todayISO, isoOf } from '../../lib/format.js'
import { hevierRoutes } from '../routes.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
let root, container
function render(patch = {}) {
  useStore.setState({ S: Object.assign(clone(DEF), { weighIn: false }, patch), user: null, isGuest: () => true })
  useUI.setState({ sheets: [] })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter initialEntries={['/measures']}><Routes>{hevierRoutes}</Routes></MemoryRouter>))
}
afterEach(() => { act(() => root.unmount()); container.remove() })
// Calendar days, not 24-hour steps: across a clock change those land on the wrong date late in the evening.
const ago = days => { const d = new Date(); d.setDate(d.getDate() - days); return isoOf(d) }

describe('hevier: Measures (the tenth critique)', () => {
  it('shows the 90-day change under the weight, and no goal caption (the owner, 2026-11-22)', () => {
    render({ bodyweight: [{ d: ago(30), w: 82 }, { d: todayISO(), w: 80.5 }] })
    expect(container.querySelector('.hv-ms-change').textContent).toBe('Down 1.5 kg in 30 days')
    expect(container.querySelector('.hv-ms-nogoal')).toBeNull()
    act(() => root.unmount()); container.remove()
    render({ bodyweight: [{ d: todayISO(), w: 80 }], targetW: 75 })
    expect(container.querySelector('.hv-ms-change')).toBeNull()   // one weigh-in has no change
  })

  it('names the days the weigh-ins span, seen and spoken, not the 90 the chart can show', () => {
    render({ bodyweight: [{ d: ago(200), w: 90 }, { d: ago(3), w: 80 }, { d: todayISO(), w: 81 }] })
    expect(container.querySelector('.hv-ms-change').textContent).toBe('Up 1 kg in 3 days')
    expect(container.querySelector('.chart').getAttribute('aria-label')).toBe('Body weight chart, 81 kg, up 1 kg in 3 days')
    act(() => root.unmount()); container.remove()
    render({ bodyweight: [{ d: ago(1), w: 80 }, { d: todayISO(), w: 80 }] })
    expect(container.querySelector('.hv-ms-change').textContent).toBe('No change in 1 day')
  })

  it('the empty well reads as a tap: a plus and Log your weight', () => {
    render()
    const well = container.querySelector('.hv-ms-empty')
    expect(well.tagName).toBe('BUTTON')
    expect(well.textContent).toBe('No weigh-ins yetLog your weight')
    expect(well.querySelector('.hv-ms-empty-go svg')).toBeTruthy()
    act(() => well.click())
    expect(useUI.getState().sheets).toHaveLength(1)
  })
})
