// @vitest-environment happy-dom
// D123: the fork's Accent row: one swatch per offered accent, the one worn marked, and a colour of
// the user's own, each writing upstream's two synced fields.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

import { DEF, useStore } from '../../store/useStore.js'
import { HV_ACCENTS, accentFields } from '../lib/accents.js'
import AccentRow from './AccentRow.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
let root, host

function render(extra = {}) {
  useStore.setState({ S: Object.assign(clone(DEF), extra, { _ts: 1 }), user: null })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(<AccentRow />))
}
const swatches = () => [...host.querySelectorAll('button[aria-pressed]')]
const pressed = () => swatches().filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.textContent)
const picked = S => ({ accent: S.accent, accentCustom: S.accentCustom })

afterEach(() => { act(() => root.unmount()); host.remove() })

describe('hevier: the Accent row (D123)', () => {
  it('draws one labelled swatch per offered accent, in order, then Your own and the hint', () => {
    render()
    expect(swatches().map(b => b.textContent)).toEqual(HV_ACCENTS.map(a => a.label))
    expect(host.querySelector('label').textContent).toBe('Your own')
    expect(host.textContent).toContain('The home-screen icon changes when you leave the app.')
    for (const b of swatches()) expect(b.style.minHeight).toBe('44px')
  })

  it('a swatch writes the fields upstream’s row writes for that colour, and is marked after', () => {
    render()
    expect(pressed()).toEqual([])   // upstream's old green is not one the fork offers
    const last = HV_ACCENTS.at(-1)
    act(() => swatches().at(-1).click())
    expect(picked(useStore.getState().S)).toEqual(accentFields(last.hex))
    expect(useStore.getState().S.edited.accent).toBeGreaterThan(1)
    expect(pressed()).toEqual([last.label])
  })

  it('marks the accent worn, from the stored fields', () => {
    render(accentFields(HV_ACCENTS[0].hex))
    expect(pressed()).toEqual([HV_ACCENTS[0].label])
    expect(host.querySelector('.swatch-own').classList.contains('on')).toBe(false)
  })

  it('Your own writes the colour picked once the picker closes, and shows it marked', () => {
    render(accentFields(HV_ACCENTS[0].hex))
    const input = host.querySelector('input[type="color"]')
    act(() => { input.value = '#123456'; input.dispatchEvent(new Event('change', { bubbles: true })) })
    expect(picked(useStore.getState().S)).toEqual(accentFields('#123456'))
    expect(pressed()).toEqual([])
    expect(host.querySelector('.swatch-own').classList.contains('on')).toBe(true)
  })
})
