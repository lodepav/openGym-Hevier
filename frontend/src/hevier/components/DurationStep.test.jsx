// @vitest-environment happy-dom
// D48: with the flag on, the duration wheel's seconds go in Hevy's 5 s steps (seam S28).
import React, { act, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import DurationWheel from '../../components/DurationWheel.jsx'
import { hooks } from '../hooks.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, container, read

function Wheel({ value }) {
  const r = useRef(null)
  read = r
  return <DurationWheel value={value} onChange={() => {}} readRef={r} />
}
const render = value => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<Wheel value={value} />))
}
const seconds = () => container.querySelectorAll('.dw-col')[1]

beforeEach(() => { hooks.secondsStep = 5 })
afterEach(() => { hooks.secondsStep = null; act(() => root.unmount()); container.remove() })

describe('hevier rest and timer wheels (D48)', () => {
  it('offers the seconds in 5 s steps', () => {
    render(90)
    expect(seconds().getAttribute('aria-valuemax')).toBe('11')
    expect(seconds().getAttribute('aria-valuenow')).toBe('6')
    expect(read.current()).toBe(90)
  })

  it('a stored 1:06 is read as 1:05', () => {
    render(66)
    expect(seconds().getAttribute('aria-valuenow')).toBe('1')
    expect(read.current()).toBe(65)
  })

  it('without the hook, upstream’s second-by-second wheel', () => {
    hooks.secondsStep = null
    render(66)
    expect(seconds().getAttribute('aria-valuemax')).toBe('59')
    expect(read.current()).toBe(66)
  })
})
