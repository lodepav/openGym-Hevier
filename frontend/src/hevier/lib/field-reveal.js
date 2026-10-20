// A workout field being typed into stays in sight (asked 2026-10-20: a set low on the page went
// under the keyboard, and one high up under the workout's header). Upstream's reveal
// (lib/native-keyboard.js) lifts a field above the keyboard on Android 15 only and knows neither
// the workout's sticky header nor the rest timer standing on the keyboard on older Androids; this
// scrolls the page the rest of the way, between the header's foot and whatever covers the bottom.
import { visibleBottom, NATIVE_KEYBOARD_EVENT } from '../../lib/native-keyboard.js'

const MARGIN = 12

/**
 * How far to scroll (positive: down) so that a field spanning `top`..`bottom` sits between `above`
 * (the header's foot) and `below` (the top of the keyboard or the timer). 0 when it is clear. A
 * field taller than the gap keeps its top in sight.
 */
export function clearDelta({ top, bottom }, above, below, margin = MARGIN) {
  const lo = above + margin, hi = below - margin
  let d = bottom > hi ? bottom - hi : 0
  if (top - d < lo) d = top - lo
  return d
}

const isField = el => !!el && /^(INPUT|TEXTAREA)$/.test(el.tagName || '')

// What covers the bottom: the keyboard (visibleBottom) or the rest timer when it stands on it.
function coverTop(win) {
  let below = visibleBottom(win)
  const timer = win.document.getElementById('timer')
  if (timer) {
    const r = timer.getBoundingClientRect()
    if (r.height > 0 && r.top < below && r.bottom > r.top) below = Math.min(below, r.top)
  }
  return below
}

export function revealField(el, win = window) {
  const scope = el?.closest?.('.hv-workout')
  if (!isField(el) || !scope) return 0
  const head = scope.querySelector('.hv-whdr')
  const above = head ? Math.max(0, head.getBoundingClientRect().bottom) : 0
  // The whole set row, so its tick shows too.
  const box = (el.closest('.hv-pair, .hv-row') || el).getBoundingClientRect()
  const delta = clearDelta(box, above, coverTop(win))
  if (delta) win.scrollBy?.(0, delta)
  return delta
}

/** Installed once: on focus, when the keyboard comes or goes, and when the window resizes for it. */
export function initFieldReveal(win = typeof window !== 'undefined' ? window : null) {
  if (!win?.addEventListener) return () => {}
  const timers = []
  const run = () => {
    timers.splice(0).forEach(clearTimeout)
    // Once the keyboard has risen (and upstream's reveal has run), and once more after its animation.
    for (const ms of [60, 350]) timers.push(setTimeout(() => revealField(win.document.activeElement, win), ms))
  }
  const onFocus = e => { if (isField(e.target)) run() }
  win.document.addEventListener('focusin', onFocus)
  win.addEventListener(NATIVE_KEYBOARD_EVENT, run)
  win.visualViewport?.addEventListener?.('resize', run)
  return () => {
    timers.splice(0).forEach(clearTimeout)
    win.document.removeEventListener('focusin', onFocus)
    win.removeEventListener(NATIVE_KEYBOARD_EVENT, run)
    win.visualViewport?.removeEventListener?.('resize', run)
  }
}
