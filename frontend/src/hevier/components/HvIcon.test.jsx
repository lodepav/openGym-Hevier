// @vitest-environment happy-dom
// The fork's glyphs (D17, step 4): its own where Hevy's differ, upstream's otherwise.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import HvIcon, { HV_ICON_NAMES } from './HvIcon.jsx'
import { ICON_NAMES } from '../../components/Icon.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, container

function render(el) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(el))
  return container.querySelector('svg')
}
afterEach(() => { act(() => root.unmount()); container.remove() })

describe('hevier: HvIcon', () => {
  it("draws the fork's own glyph like upstream's icons", () => {
    const svg = render(<HvIcon name="alarm" size={20} />)
    expect(svg.dataset.icon).toBe('alarm')
    expect(svg.getAttribute('class')).toBe('icn ')
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(svg.style.width).toBe('20px')
  })

  it("falls back to upstream's icon for every other name", () => {
    const svg = render(<HvIcon name="dumbbell" className="x" />)
    expect(svg.dataset.icon).toBe('dumbbell')
    expect(svg.getAttribute('class')).toBe('icn x')
  })

  it("never shadows an upstream name, so upstream's icon stays the same everywhere", () => {
    for (const n of HV_ICON_NAMES) expect(ICON_NAMES).not.toContain(n)
  })
})
