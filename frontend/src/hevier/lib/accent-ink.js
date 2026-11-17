// The accent as words on the fork's surfaces. Upstream's --acc-ink is tuned for its own card
// (#1c1c1e) and is plain --acc for a kept old preset, so a dark pick like #007aff reads at 4.19:1 on
// --surface-3. Fills, ticks and bars keep the pick; text gets this, lifted just to 4.5:1.
import { cleanHex, contrast, readableIn } from '../../lib/accent.js'

// --surface-3, the lightest surface accent text sits on; --surface and the page are darker, so they pass too.
export const INK_ON = '#1f1d19'
export const INK_MIN = 4.5

/** The text shade of accent `hex` (as --acc draws it): itself when it reads at 4.5:1 on INK_ON, else lighter at its hue. null for junk. */
export function accentInk(hex) {
  const c = cleanHex(hex)
  if (!c) return null
  const acc = readableIn(c, 'dark')
  // readableIn lifts in HSL lightness against upstream's own backgrounds; raising its bar step by step lands on ours.
  for (let bar = INK_MIN; bar <= 21; bar += 0.05) {
    const ink = readableIn(acc, 'dark', bar)
    if (contrast(ink, INK_ON) >= INK_MIN) return ink
  }
  return '#ffffff'
}
