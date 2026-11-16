// D123: which launcher icon the worn accent gets (plan 3.1). An offered accent has its own; a
// colour within MIN_APART of one takes that one's; anything else keeps the green, since the
// nearest whatever the distance would put a teal icon on a red app.
import { HV_ACCENTS, wornHex } from './accents.js'
import { distance, tooClose } from './meaning-colours.js'

export const DEFAULT_ICON = 'green'
/** Every icon id there is, one per offered accent (each needs a launcher alias). */
export const ICON_IDS = HV_ACCENTS.map(a => a.id)

/** The icon id for a '#rrggbb' accent. */
export function iconFor(hex) {
  const h = String(hex || '').toLowerCase()
  if (!/^#[0-9a-f]{6}$/.test(h)) return DEFAULT_ICON
  // A colour can sit within reach of two offered accents: the nearer one wins.
  const near = HV_ACCENTS.filter(a => tooClose(a.hex, h)).sort((a, b) => distance(a.hex, h) - distance(b.hex, h))
  return near[0]?.id ?? DEFAULT_ICON
}

/** The icon id for the accent S wears. */
export const accentIcon = S => iconFor(wornHex(S))
