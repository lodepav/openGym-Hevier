// @vitest-environment happy-dom
// The import summaries' "Check exercise matches" row (hevier/DECISIONS.md D33).
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { ReviewRow } from './ImportReview.jsx'
import { useUI } from '../../store/useUI.js'
import { useStore } from '../../store/useStore.js'
import { chooseCable } from '../lib/import-review.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('hevier import review row (D33)', () => {
  it('counts the titles and the own exercises, and opens the list', () => {
    const parsed = { hvTitles: [{ title: 'Seated Leg Curl (Machine)', source: 'Hevy' }, { title: 'Qwerty Zorb (Cable)', source: 'Hevy' }] }
    const el = document.createElement('div')
    const root = createRoot(el)
    act(() => root.render(<ReviewRow parsed={parsed} />))
    expect(el.textContent).toContain('Check exercise matches')
    expect(el.textContent).toContain('2 exercises · 1 added as your own')
    act(() => el.querySelector('button').click())
    expect(useUI.getState().sheets).toHaveLength(1)
    act(() => root.unmount())
  })

  it('lists the cable exercises to confirm their setup, untagged ones taken as 1:1 (D43)', () => {
    useUI.setState({ sheets: [] })
    useStore.setState({ S: { ...useStore.getState().S, hvImportCable: undefined } })
    const parsed = { hvTitles: [
      { title: 'Lat Pulldown (Cable)', source: 'Hevy', cable: '' },
      { title: 'Seated Cable Row - V Grip (Cable)', source: 'Hevy', cable: 'x2' },
      { title: 'Seated Leg Curl (Machine)', source: 'Hevy', cable: '' },
    ] }
    const el = document.createElement('div')
    const root = createRoot(el)
    act(() => root.render(<ReviewRow parsed={parsed} />))
    const row = el.querySelector('.hv-cable-row')
    expect(row.textContent).toContain('2 cable exercises · 1 taken as 1:1')
    act(() => row.click())
    const sheet = useUI.getState().sheets.at(-1)
    const div = document.createElement('div')
    const r = createRoot(div)
    act(() => r.render(sheet.render(() => {})))
    const items = [...div.querySelectorAll('.hv-cable-item')]
    expect(items.map(b => b.textContent)).toEqual([
      expect.stringContaining('Cable 1:1 · assumed'), expect.stringContaining('Cable ×2 · from the title')])
    expect(items[1].disabled).toBe(true)
    act(() => useStore.getState().update(s => chooseCable(s, 'Hevy|lat pulldown (cable)', '2:1')))
    expect(el.querySelector('.hv-cable-row').textContent).toContain('2 cable exercises')
    expect(el.querySelector('.hv-cable-row').textContent).not.toContain('taken as')
    act(() => { r.unmount(); root.unmount() })
  })
})
