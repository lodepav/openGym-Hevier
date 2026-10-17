// @vitest-environment happy-dom
// The import summaries' "Check exercise matches" row (hevier/DECISIONS.md D33).
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { ReviewRow } from './ImportReview.jsx'
import { useUI } from '../../store/useUI.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('hevier import review row (D33)', () => {
  it('counts the titles and the own exercises, and opens the list', () => {
    const parsed = { hvTitles: [{ title: 'Seated Leg Curl (Machine)', source: 'Hevy' }, { title: 'Behind the Back Curl (Cable)', source: 'Hevy' }] }
    const el = document.createElement('div')
    const root = createRoot(el)
    act(() => root.render(<ReviewRow parsed={parsed} />))
    expect(el.textContent).toContain('Check exercise matches')
    expect(el.textContent).toContain('2 exercises · 1 added as your own')
    act(() => el.querySelector('button').click())
    expect(useUI.getState().sheets).toHaveLength(1)
    act(() => root.unmount())
  })
})
