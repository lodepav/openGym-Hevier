// When the live workout's header shows its details, the gym and the workout note (hevier/DECISIONS.md
// D127, changed 2026-11-17): open at the top or bottom of the page, and at the start or near the end
// of the session; closed in between. A tap on the name's chevron holds until that rule next changes.

// Scroll bands in px. Opening the details (about 100 px) moves the page by that much, so each band
// closes well past where it opens: the move alone never flips it back (no flicker at the edge).
export const TOP_OPEN = 8
export const TOP_CLOSE = 240
export const END_OPEN = 48
export const END_CLOSE = 240

/**
 * The scroll zone after `prev` (`{ top, end }`, or null at first): `top` is the page's scroll offset,
 * `gap` what is left below the screen, `detailsH` the height of the open details (0 when closed).
 * Each edge opens at its OPEN mark and lets go only past CLOSE.
 */
export function scrollZone(prev, top, gap, detailsH = 0) {
  // The gap as if the details were closed: opening them, however tall a note, never moves it.
  const g = gap - detailsH
  // Closing at the top lets scroll anchoring pull the page up by the details' height (and opening
  // push it down by as much), so the top lets go only well past that height.
  const topClose = Math.max(TOP_CLOSE, detailsH + 60)
  return {
    top: top <= (prev?.top ? topClose : TOP_OPEN),
    end: g <= (prev?.end ? END_CLOSE : END_OPEN),
  }
}

/**
 * True when session `A` is just started (no set ticked, warm-ups included; or no exercise yet) or
 * near its end (every set ticked, or the set opened next, `open` from open-set.js, is in the last exercise).
 */
export function progressOpen(A, open) {
  const E = A?.entries || []
  const sets = E.flatMap(e => e.sets || [])
  if (!sets.some(s => s?.done)) return true
  if (sets.every(s => s?.done)) return true
  return !!open && open.idx === E.length - 1
}

/**
 * The details shown for the automatic value `auto` and the last tap `manual` (`{ auto, open }`, the
 * automatic value when tapped and what the tap chose). `manual` is null again once `auto` has moved,
 * so a tap never comes back after the rule changed twice.
 */
export function resolveOpen(auto, manual) {
  if (!manual || manual.auto !== auto) return { open: auto, manual: null }
  return { open: manual.open, manual }
}
