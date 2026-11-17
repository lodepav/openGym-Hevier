// D123: puts the meaning colours that step aside from the worn accent on the page root, for
// hevier.css, and keeps the accent for the boot screen, which draws before the store loads.
import { readableIn } from '../../lib/accent.js'
import { wornHex } from './accents.js'
import { meaningColours } from './meaning-colours.js'
import { accentInk } from './accent-ink.js'

export const ACCENT_KEY = 'hevier_accent'

/** Sets --hv-cardio, --hv-deload, …, and --hv-acc-ink (the accent as text) on `root` for the accent S wears, and saves that accent. */
export function applyMeaningColours(S, root = document.documentElement) {
  const hex = wornHex(S)
  // Compared with the accent as the page draws it: the fork is always dark, and a dark custom colour is lifted there.
  for (const [k, v] of Object.entries(meaningColours(readableIn(hex, 'dark')))) root.style.setProperty(`--hv-${k}`, v)
  root.style.setProperty('--hv-acc-ink', accentInk(hex))
  try { localStorage.setItem(ACCENT_KEY, hex) } catch { /* private mode: the boot screen draws the default */ }
}

/** At launch (hevier/index.js): now, and whenever the accent changes. */
let started = false
export function initMeaningColours(store) {
  if (started) return
  started = true
  applyMeaningColours(store.get())
  store.watch(['accent', 'accentCustom'])(() => applyMeaningColours(store.get()))
}
