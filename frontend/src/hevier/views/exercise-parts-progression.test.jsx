// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { EXDB } from '../../lib/exercises.js'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { exConfigSheet } from '../../sheets.jsx'
import { hooks } from '../hooks.js'

// Seam S58 (D114): with Progression off, a rule the exercise climbs a rep range by, or a Step that
// blocks Save, still shows its fields, so the rep target stays editable and Save can be unblocked.
const ex = EXDB.find(e => e.id === '0009')
let root, host
function open(config) {
  exConfigSheet(ex, config, () => {}, null, null, null, null, undefined, {})
  const sheet = useUI.getState().sheets.at(-1)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(sheet.render(() => act(() => root.unmount()))))
}
const labels = () => host.textContent
const save = () => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === 'Save')

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  useUI.setState({ sheets: [] })
  useStore.setState(s => ({ S: { ...s.S, unit: 'kg', restSec: 120 } }))
  hooks.exPart = p => p !== 'progression'
})
afterEach(() => { hooks.exPart = null; act(() => root?.unmount()); host?.remove() })

it('a plain exercise shows no progression fields with the part off', () => {
  open({ sets: 3, reps: 10, weight: 40, mode: 'reps' })
  expect(labels()).not.toContain('Reps up to')
  expect(labels()).toContain('Reps')
})

it('a rep-range rule keeps Reps from and Reps up to with the part off', () => {
  open({ sets: 3, reps: 12, repsMin: 8, weight: 40, mode: 'reps', prog: 'double' })
  expect(labels()).toContain('Reps from')
  expect(labels()).toContain('Reps up to')
})

it('an invalid Step stays in view with the part off, so Save can be unblocked', () => {
  open({ sets: 3, reps: 10, weight: 40, mode: 'reps', prog: 'linear', inc: 0 })
  expect(save().disabled).toBe(true)
  expect(labels()).toContain('Step')
})
