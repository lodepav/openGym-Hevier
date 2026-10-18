// @vitest-environment happy-dom
// The long press that lifts a routine card or an exercise block (D13, D15): held still it lifts and
// reorders, a finger that wanders first is a scroll, and the click a drag ends with is swallowed.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDragReorder } from './useDragReorder.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const H = 50   // each row's height, no gap
let root, container, moves, clicks

function List() {
  const { listRef, press, rowStyle } = useDragReorder(3, (from, to) => moves.push([from, to]))
  return <div ref={listRef}>
    {[0, 1, 2].map(i => <div key={i} data-reorder-row="" style={rowStyle(i)} {...press(i)} onClick={() => clicks.push(i)}>row {i}</div>)}
  </div>
}
const rows = () => [...container.firstChild.children]
const pointer = (el, type, y, x = 10) => act(() => {
  el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, button: 0, clientX: x, clientY: y }))
})

beforeEach(() => {
  vi.useFakeTimers()
  moves = []; clicks = []
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<List />))
  rows().forEach((r, i) => { r.getBoundingClientRect = () => ({ top: i * H, height: H, bottom: (i + 1) * H, left: 0, right: 300, width: 300, x: 0, y: i * H }) })
})
afterEach(() => {
  act(() => root.unmount())
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('hevier: useDragReorder long press', () => {
  it('a row held still lifts, follows the finger and drops in its new place', () => {
    const r0 = rows()[0]
    pointer(r0, 'pointerdown', 25)
    act(() => vi.advanceTimersByTime(450))
    expect(r0.style.transform).toBe('translateY(0px)')   // lifted: the held row carries its offset
    pointer(r0, 'pointermove', 35 + 2 * H)
    expect(rows()[1].style.transform).toBe(`translateY(${-H}px)`)
    pointer(r0, 'pointerup', 35 + 2 * H)
    expect(moves).toEqual([[0, 2]])
  })

  it('a finger that wanders past the slop before the press is long is a scroll, not a drag', () => {
    const r0 = rows()[0]
    pointer(r0, 'pointerdown', 25)
    pointer(r0, 'pointermove', 40)          // 15 px, more than the 8 px a held finger may wander
    act(() => vi.advanceTimersByTime(450))
    expect(r0.style.transform).toBe('')
    pointer(r0, 'pointermove', 25 + 2 * H)
    pointer(r0, 'pointerup', 25 + 2 * H)
    expect(moves).toEqual([])
  })

  it('a short tap is a click, and the click a drag ends with is swallowed', () => {
    const r1 = rows()[1]
    pointer(r1, 'pointerdown', 75)
    pointer(r1, 'pointerup', 75)
    act(() => r1.click())
    expect(clicks).toEqual([1])

    pointer(r1, 'pointerdown', 75)
    act(() => vi.advanceTimersByTime(450))
    pointer(r1, 'pointerup', 75)
    act(() => r1.click())
    expect(clicks).toEqual([1])             // the long press opened nothing
    expect(moves).toEqual([])               // dropped where it was: no move

    pointer(r1, 'pointerdown', 75)
    pointer(r1, 'pointerup', 75)
    act(() => r1.click())
    expect(clicks).toEqual([1, 1])          // and the next tap is a click again
  })
})
