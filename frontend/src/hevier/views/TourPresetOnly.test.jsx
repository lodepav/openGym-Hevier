// @vitest-environment happy-dom
// Seam S53 (D97, D100): the fork's first-run card asks only how much app, and the tour, whose stops
// are on upstream's screens, is then recorded done and never offered.
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { openTour, tourState, readTour } from '../../lib/tour.js'
import Tour from '../../components/Tour.jsx'
import { hooks } from '../hooks.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, host
beforeEach(() => {
  localStorage.clear()
  useStore.setState({ S: { ...JSON.parse(JSON.stringify(DEF)), modules: undefined }, user: null })
  hooks.tourPresetOnly = true
})
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); hooks.tourPresetOnly = false })

describe('hevier: the first-run card without the tour (S53)', () => {
  it('asks how much app, offers no tour, and Continue records the tour done', async () => {
    await act(async () => { openTour({ kind: 'offer' }) })
    host = document.createElement('div'); document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => { root.render(<MemoryRouter><Tour /></MemoryRouter>) })
    const card = host.querySelector('[role="dialog"]')
    expect(card.textContent).toContain('How much app do you want?')
    expect(card.textContent).not.toContain('Want a 1-minute tour?')
    expect(card.getAttribute('aria-labelledby')).toBe('tour-m')
    const radios = [...card.querySelectorAll('[role="radio"]')]
    await act(async () => { radios[0].click() })
    expect(useStore.getState().S.modules.body).toBe(false)   // Just training
    const buttons = [...card.querySelectorAll('button')].filter(b => !b.getAttribute('role'))
    expect(buttons.map(b => b.textContent)).toEqual(['Continue'])
    await act(async () => { buttons[0].click() })
    expect(tourState()).toBe(null)
    expect(readTour().done).toBeGreaterThan(0)
  })
})
