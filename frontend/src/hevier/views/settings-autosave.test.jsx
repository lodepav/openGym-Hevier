// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { EXDB } from '../../lib/exercises.js'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { exConfigSheet } from '../../sheets.jsx'
import { hooks } from '../hooks.js'

// D92: the live workout's Exercise settings save as they close, and only what changed.
const ex = EXDB.find(e => e.id === '0009')
const config = { sets: 3, reps: 10, weight: 40, mode: 'reps' }
let root, host

function open(onSave, opts = { autosave: true }) {
  exConfigSheet(ex, config, onSave, null, null, null, null, undefined, opts)
  const sheet = useUI.getState().sheets.at(-1)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(sheet.render(() => act(() => root.unmount()))))
}
const note = text => act(() => {
  const area = host.querySelector('textarea')
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(area, text)
  area.dispatchEvent(new Event('input', { bubbles: true }))
})
const button = label => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === label)

describe('exercise settings save as they close (D92)', () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    hooks.settingsAutosave = true
    useUI.setState({ sheets: [] })
    useStore.setState(s => ({ S: { ...s.S, unit: 'kg', restSec: 120 } }))
  })
  afterEach(() => { hooks.settingsAutosave = false; host?.remove() })

  it('saves a change when the sheet goes away without its button', () => {
    const onSave = vi.fn()
    open(onSave)
    note('seat on 4')
    act(() => root.unmount())
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0]).toMatchObject({ note: 'seat on 4', sets: 3, reps: 10 })
  })

  it('saves once through Done', () => {
    const onSave = vi.fn()
    open(onSave)
    note('seat on 4')
    act(() => button('Done').click())
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('saves nothing when nothing changed, so the rows are not rebuilt', () => {
    const onSave = vi.fn()
    open(onSave)
    act(() => button('Done').click())
    expect(onSave).not.toHaveBeenCalled()
  })

  it('keeps the Save button and discards on close without the fork, and outside a workout', () => {
    hooks.settingsAutosave = false
    const onSave = vi.fn()
    open(onSave)
    expect(button('Save')).toBeTruthy()
    note('seat on 4')
    act(() => root.unmount())
    expect(onSave).not.toHaveBeenCalled()
    hooks.settingsAutosave = true
    open(onSave, {})
    expect(button('Save')).toBeTruthy()
    note('seat on 4')
    act(() => root.unmount())
    expect(onSave).not.toHaveBeenCalled()
  })
})
