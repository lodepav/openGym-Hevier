// Drag to reorder for rows of different heights: routine cards, folders, and the routine
// editor's exercise blocks. The same contract as upstream's lib/use-list-reorder.js (a handle per
// row, `data-reorder-row` children of `listRef`, arrow keys on the handle, onMove(from, to)), but
// the rows that make way move by the held row's own height, and the page scrolls while the held
// row is near the top or bottom edge, so a long routine can be reordered end to end.
// As in Hevy, a row is also picked up by a long press anywhere on it (`press(i)`); the handle stays
// for the keyboard and screen readers.
import { useEffect, useRef, useState } from 'react'

// The edge zone is wide and its slowest speed is not a crawl: on a phone the gesture bar takes the
// bottom few millimetres, so a finger rarely gets deep into the zone.
const EDGE = 96
const MIN_STEP = 4
const MAX_STEP = 18
const speed = depth => Math.round(MIN_STEP + (MAX_STEP - MIN_STEP) * Math.min(1, depth / EDGE))
const LONG_PRESS = 400   // ms held still before a row lifts
const SLOP = 8           // px a finger may wander while it is held
const scrollTop = () => window.scrollY || document.scrollingElement?.scrollTop || 0

export function useDragReorder(count, onMove) {
  const listRef = useRef(null)
  const gesture = useRef(null)
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove
  const [drag, setDrag] = useState(null)   // { from, to, dy, shift } while a row is held
  const pending = useRef(null)             // a long press not yet long enough
  const swallowClick = useRef(false)       // the click a long-press drag ends with

  const stopScroll = () => { const g = gesture.current; if (g?.raf) cancelAnimationFrame(g.raf); if (g) g.raf = 0 }
  const cancelPress = () => { if (pending.current) clearTimeout(pending.current.timer); pending.current = null }
  useEffect(() => () => { stopScroll(); cancelPress(); gesture.current = null }, [])
  // While a row is held, the finger drags it rather than the page (touch-action can't change mid-touch).
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const hold = e => { if (gesture.current) e.preventDefault() }
    el.addEventListener('touchmove', hold, { passive: false })
    return () => el.removeEventListener('touchmove', hold)
  }, [listRef])

  const rowsOf = () => [...(listRef.current?.children || [])].filter(el => el.hasAttribute('data-reorder-row'))
  // Where the held row is now, in page coordinates, and the slot that puts it at.
  const track = () => {
    const g = gesture.current
    if (!g) return
    const dy = g.y - g.y0 + (scrollTop() - g.s0)
    const held = g.rects[g.from]
    const mid = held.top + held.height / 2 + dy
    g.to = g.rects.reduce((n, r, k) => n + (k !== g.from && r.top + r.height / 2 < mid ? 1 : 0), 0)
    setDrag({ from: g.from, to: g.to, dy, shift: g.shift })
  }
  const scrollLoop = () => {
    const g = gesture.current
    if (!g) return
    const vh = window.visualViewport?.height || window.innerHeight
    const step = g.y < EDGE ? -speed(EDGE - g.y) : g.y > vh - EDGE ? speed(g.y - vh + EDGE) : 0
    if (step) { window.scrollBy?.(0, step); track() }
    g.raf = step ? requestAnimationFrame(scrollLoop) : 0
  }
  const end = commit => {
    const g = gesture.current
    if (!g) return
    stopScroll()
    gesture.current = null
    try { g.el.releasePointerCapture?.(g.id) } catch { /* already released */ }
    setDrag(null)
    if (commit && g.to !== g.from) onMoveRef.current(g.from, g.to)
  }

  // Lifts row i under the pointer `id`, held at clientY `y`.
  const begin = (i, id, el, y) => {
    const rows = rowsOf()
    if (!rows[i]) return false
    const s0 = scrollTop()
    const rects = rows.map(row => { const r = row.getBoundingClientRect(); return { top: r.top + s0, height: r.height } })
    const gap = rects.length > 1 ? Math.max(0, rects[1].top - (rects[0].top + rects[0].height)) : 0
    gesture.current = { id, el, from: i, to: i, y0: y, y, s0, rects, shift: rects[i].height + gap, raf: 0 }
    try { el.setPointerCapture?.(id) } catch { /* unsupported, or the pointer is gone */ }
    setDrag({ from: i, to: i, dy: 0, shift: gesture.current.shift })
    return true
  }
  const move = e => {
    const g = gesture.current
    if (!g || e.pointerId !== g.id) return
    e.preventDefault()
    g.y = e.clientY
    track()
    if (!g.raf) g.raf = requestAnimationFrame(scrollLoop)
  }

  const handle = i => ({
    'data-reorder-handle': '',
    onPointerDown: e => {
      if (e.button != null && e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      begin(i, e.pointerId, e.currentTarget, e.clientY)
    },
    onPointerMove: move,
    onPointerUp: e => { if (gesture.current && e.pointerId === gesture.current.id) end(true) },
    onPointerCancel: () => end(false),
    onClick: e => e.stopPropagation(),
    onKeyDown: e => {
      const d = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
      if (!d) return
      e.preventDefault()
      const to = i + d
      if (to >= 0 && to < count) onMoveRef.current(i, to)
    },
  })

  // Long press anywhere on the row: a press that moves first is a scroll or a tap, not a drag.
  const press = i => ({
    onPointerDown: e => {
      swallowClick.current = false   // a drag that ended without a click leaves nothing to swallow
      if ((e.button != null && e.button !== 0) || gesture.current || count < 2) return
      cancelPress()
      const el = e.currentTarget, id = e.pointerId
      const p = { id, x0: e.clientX, y0: e.clientY, y: e.clientY }
      p.timer = setTimeout(() => {
        pending.current = null
        if (begin(i, id, el, p.y)) { swallowClick.current = true; navigator.vibrate?.(10) }
      }, LONG_PRESS)
      pending.current = p
    },
    onPointerMove: e => {
      const p = pending.current
      if (p && p.id === e.pointerId) {
        p.y = e.clientY
        if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) > SLOP) cancelPress()
      } else move(e)
    },
    onPointerUp: e => { cancelPress(); if (gesture.current && e.pointerId === gesture.current.id) end(true) },
    onPointerCancel: () => { cancelPress(); end(false) },
    onContextMenu: e => { if (pending.current || gesture.current || swallowClick.current) e.preventDefault() },
    onClickCapture: e => { if (swallowClick.current) { swallowClick.current = false; e.preventDefault(); e.stopPropagation() } },
  })

  const rowStyle = i => {
    if (!drag) return undefined
    if (i === drag.from) return { transform: `translateY(${drag.dy}px)`, zIndex: 3, position: 'relative', transition: 'none' }
    if (drag.from < drag.to && i > drag.from && i <= drag.to) return { transform: `translateY(${-drag.shift}px)` }
    if (drag.to < drag.from && i >= drag.to && i < drag.from) return { transform: `translateY(${drag.shift}px)` }
    return { transform: 'translateY(0)' }
  }

  return { listRef, drag, handle, press, rowStyle }
}
