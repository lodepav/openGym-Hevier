// The Finish sheet's "Show them" (D132): the live workout's first set row not ticked yet, in the
// order the page draws them. A row is not ticked while it holds an unchecked tick, or the effort
// button in its place; drop and burst lines have neither, so they never count.
const UNTICKED = '.hv-ex .hv-row:not(.done) > .hv-chk:not(.on), .hv-ex .hv-row:not(.done) > .hv-eff-tick'

/** The first unticked set row under `root`, or null. */
export const firstUntickedRow = root => root?.querySelector(UNTICKED)?.closest('.hv-row') || null

/** Scrolls `row` to the middle of the screen, gliding unless the user asked for less motion, and focuses its tick. */
export function showRow(row, win = window) {
  if (!row) return
  const reduced = !!win.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  row.scrollIntoView?.({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
  // A screen reader goes on from the set, not from wherever focus fell when the sheet closed.
  row.querySelector('.hv-chk, .hv-eff-tick')?.focus?.({ preventScroll: true })
}
