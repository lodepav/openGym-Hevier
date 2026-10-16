// Drag to reorder for rows of different heights: routine cards, folders, and the routine
// editor's exercise blocks. The same contract as upstream's lib/use-list-reorder.js (a handle per
// row, `data-reorder-row` children of `listRef`, arrow keys on the handle, onMove(from, to)), but
// the rows that make way move by the held row's own height, and the page scrolls while the held
// row is near the top or bottom edge, so a long routine can be reordered end to end.
import { useEffect, useRef, useState } from 'react'

// The edge zone is wide and its slowest speed is not a crawl: on a phone the gesture bar takes the
// bottom few millimetres, so a finger rarely gets deep into the zone.
const EDGE = 96
const MIN_STEP = 4
const MAX_STEP = 18
const speed = depth => Math.round(MIN_STEP + (MAX_STEP - MIN_STEP) * Math.min(1, depth / EDGE))
const scrollTop = () => window.scrollY || document.scrollingElement?.scrollTop || 0

export function useDragReorder(count, onMove) {
  const listRef = useRef(null)
  const gesture = useRef(null)
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove
  const [drag, setDrag] = useState(null)   // { from, to, dy, shift } while a row is held

  const stopScroll = () => { const g = gesture.current; if (g?.raf) cancelAnimationFrame(g.raf); if (g) g.raf = 0 }
  useEffect(() => () => { stopScroll(); gesture.current = null }, [])

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

  const handle = i => ({
    'data-reorder-handle': '',
    onPointerDown: e => {
      if (e.button != null && e.button !== 0) return
      const rows = rowsOf()
      if (!rows[i]) return
      e.preventDefault()
      e.stopPropagation()
      const s0 = scrollTop()
      const rects = rows.map(row => { const r = row.getBoundingClientRect(); return { top: r.top + s0, height: r.height } })
      const gap = rects.length > 1 ? Math.max(0, rects[1].top - (rects[0].top + rects[0].height)) : 0
      gesture.current = { id: e.pointerId, el: e.currentTarget, from: i, to: i, y0: e.clientY, y: e.clientY, s0, rects, shift: rects[i].height + gap, raf: 0 }
      try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* unsupported */ }
      setDrag({ from: i, to: i, dy: 0, shift: gesture.current.shift })
    },
    onPointerMove: e => {
      const g = gesture.current
      if (!g || e.pointerId !== g.id) return
      e.preventDefault()
      g.y = e.clientY
      track()
      if (!g.raf) g.raf = requestAnimationFrame(scrollLoop)
    },
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

  const rowStyle = i => {
    if (!drag) return undefined
    if (i === drag.from) return { transform: `translateY(${drag.dy}px)`, zIndex: 3, position: 'relative', transition: 'none' }
    if (drag.from < drag.to && i > drag.from && i <= drag.to) return { transform: `translateY(${-drag.shift}px)` }
    if (drag.to < drag.from && i >= drag.to && i < drag.from) return { transform: `translateY(${drag.shift}px)` }
    return { transform: 'translateY(0)' }
  }

  return { listRef, drag, handle, rowStyle }
}
