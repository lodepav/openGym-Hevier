// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { EXDB } from '../../lib/exercises.js'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { exConfigSheet } from '../../sheets.jsx'
import { hooks } from '../hooks.js'

// Seam S58 (D114): the Exercise settings module's parts hide the sheet's categories.
const ex = EXDB.find(e => e.id === '0009')
let root, host
const heads = () => [...host.querySelectorAll('h4.sec')].map(h => h.textContent)

function open(config) {
  exConfigSheet(ex, config, () => {}, null, null, null, null, undefined, {})
  const sheet = useUI.getState().sheets.at(-1)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(sheet.render(() => act(() => root.unmount()))))
}

describe('Exercise settings categories (S58, D114)', () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    useUI.setState({ sheets: [] })
    useStore.setState(s => ({ S: { ...s.S, unit: 'kg', restSec: 120 } }))
  })
  afterEach(() => { hooks.exPart = null; act(() => root?.unmount()); host?.remove() })

  it('without the hook every category shows', () => {
    open({ sets: 3, reps: 10, weight: 40, mode: 'reps' })
    expect(heads()).toEqual(expect.arrayContaining(['Drop-set / rest-pause', 'Weight unit', 'Plate loading']))
  })

  it('hides a category that is off, but not what the exercise already uses', () => {
    hooks.exPart = () => false
    open({ sets: 3, reps: 10, weight: 40, mode: 'reps' })
    for (const h of ['Drop-set / rest-pause', 'Weight unit', 'Plate loading']) expect(heads()).not.toContain(h)
    expect(host.textContent).not.toContain('Pyramid sets')
    act(() => root.unmount()); host.remove()
    open({ sets: 3, reps: 10, weight: 40, mode: 'reps', intensifier: { type: 'dropset', count: 1, pct: 20 } })
    expect(heads()).toContain('Drop-set / rest-pause')
  })
})
