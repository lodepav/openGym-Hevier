// @vitest-environment happy-dom
// The export to Hevy's key sheet and status line (hevier/DECISIONS.md D34).
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const enable = vi.fn()
vi.mock('../lib/hevy-export-sync.js', () => ({
  enableExport: (...a) => enable(...a),
  loadExport: async () => ({ on: false }), disableExport: async () => {}, sendToHevy: async () => {}, onExportChange: () => () => {},
}))
const { KeySheet, statusOf } = await import('./HevyExportSection.jsx')
const { useUI } = await import('../../store/useUI.js')

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, el
afterEach(() => { act(() => root.unmount()); enable.mockReset() })
const draw = node => {
  el = document.createElement('div')
  root = createRoot(el)
  act(() => root.render(node))
}
const type = (input, v) => {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  set.call(input, v)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('hevier export to Hevy settings (D34)', () => {
  it('turns the export on with the typed key and closes; a refused key keeps the sheet open', async () => {
    const toasts = []
    useUI.setState({ toast: m => toasts.push(m) })
    const close = vi.fn()
    draw(<KeySheet close={close} />)
    const input = el.querySelector('input')
    expect(input.type).toBe('password')
    expect(el.querySelector('button').disabled).toBe(true)
    enable.mockResolvedValueOnce({ ok: false, reason: 'auth' })
    act(() => type(input, ' key-1 '))
    await act(async () => { el.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
    expect(enable.mock.calls[0][0]).toBe(' key-1 ')
    expect(close).not.toHaveBeenCalled()
    expect(toasts).toEqual(['That Hevy API key was refused'])
    enable.mockResolvedValueOnce({ ok: true })
    await act(async () => { el.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
    expect(close).toHaveBeenCalled()
    expect(toasts[1]).toBe('Sending to Hevy is on')
  })

  it('says what was last sent, or why not', () => {
    expect(statusOf({ last: null })).toMatch(/while the app is open/)
    expect(statusOf({ last: { at: Date.now(), sent: 2, refused: 1, error: null } })).toMatch(/^Last sent .* · Sent: 2 · Refused by Hevy: 1$/)
    expect(statusOf({ last: { at: 1, error: 'offline' } })).toBe('Not sent: no connection. It is tried again later')
    expect(statusOf({ last: { at: 1, error: 'auth' } })).toMatch(/refused the key/)
    expect(statusOf({ last: { at: 1, error: 'nokey' } })).toMatch(/key is gone/)
  })
})
