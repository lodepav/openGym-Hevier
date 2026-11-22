// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLargeText } from './useLargeText.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, host, big
function Probe() { big = useLargeText(); return null }
const mount = px => {
  const real = window.getComputedStyle
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el, ...rest) => (el.style?.fontSize === '16px' ? { fontSize: px } : real(el, ...rest)))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(<Probe />))
}
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks() })

describe('hevier useLargeText', () => {
  it('reads the phone’s text size from a 16 px probe, and leaves no probe behind', () => {
    mount('24px')
    expect(big).toBe(true)
    expect(document.body.children).toHaveLength(1)
  })
  it('is false at the usual size', () => {
    mount('16px')
    expect(big).toBe(false)
  })
})
