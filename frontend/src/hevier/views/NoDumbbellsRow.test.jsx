// @vitest-environment happy-dom
// Upstream's dumbbell sheet without its "I own no dumbbells" switch (seam S49, D16): a gym's
// checklist says whether it has dumbbells (D62). The list of bells stays.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore, DEF } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { dumbbellInventorySheet } from '../../sheets.jsx'
import { hooks } from '../hooks.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, host
function mountTopSheet() {
  const sheet = useUI.getState().sheets.at(-1)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(sheet.render(() => {})))
}

describe('hevier: the dumbbell sheet (S49)', () => {
  beforeEach(() => {
    useUI.setState({ sheets: [] })
    useStore.setState({ S: { ...JSON.parse(JSON.stringify(DEF)), unit: 'kg' }, user: null })
  })
  afterEach(() => { act(() => root.unmount()); host.remove(); hooks.noDumbbellsRowOff = false })

  it('has no "I own no dumbbells" switch with the hook on, the list still there', () => {
    hooks.noDumbbellsRowOff = true
    act(() => dumbbellInventorySheet())
    mountTopSheet()
    expect(host.textContent).not.toContain('I own no dumbbells')
    expect(host.textContent).toContain('No list yet')
  })

  it('shows the switch while a synced "none" is on, so it can be turned off', () => {
    hooks.noDumbbellsRowOff = true
    useStore.getState().update(s => { s.dumbbells = { ...(s.dumbbells || {}), none: { on: true } } })
    act(() => dumbbellInventorySheet())
    mountTopSheet()
    expect(host.textContent).toContain('I own no dumbbells')
  })

  it('is upstream’s with the hook off', () => {
    act(() => dumbbellInventorySheet())
    mountTopSheet()
    expect(host.textContent).toContain('I own no dumbbells')
  })
})
