// D123: the accents the fork offers, in this order: OpenBite's green (the default), Hevy's blue, then
// more that sit at least MIN_APART (OKLab) from every meaning colour and from each other
// (meaning-colours.js, proven in accents.test.js). Each is stored in upstream's own synced fields as a
// colour of the user's own (accent 'custom' + accentCustom), so the exact hex reaches the page, the
// notification and the widgets through upstream's accentValue.
import { accentValue } from '../../lib/accent.js'
import { ACCENTS } from '../../lib/format.js'

export const MIN_APART = 0.12
export const DEFAULT_GREEN = '#34d08a'
export const HEVY_BLUE = '#008cff'

// { id, label (English, a t() key), hex }. id is stable: it names the launcher icon alias (accent-icon.js).
export const HV_ACCENTS = [
  { id: 'green', label: 'Green', hex: DEFAULT_GREEN },
  { id: 'blue', label: 'Blue', hex: HEVY_BLUE },
  { id: 'teal', label: 'Teal', hex: '#40c8e0' },
  { id: 'brand', label: 'openGym green', hex: '#a3e635' },
  { id: 'pink', label: 'Pink', hex: '#ff7eb6' },
]

/** The two upstream fields a pick writes. */
export const accentFields = hex => ({ accent: 'custom', accentCustom: hex.toLowerCase() })

/** The hex the profile wears now, whatever stored it (a preset key, custom, a kept old pick). */
export function wornHex(S) {
  const v = accentValue(S)
  return v.startsWith('#') ? v.toLowerCase() : ACCENTS[v]
}

/** The offered accent S wears exactly, or null (a custom colour of the user's own, or a kept old preset). */
export function hvAccentId(S) {
  const hex = wornHex(S)
  return HV_ACCENTS.find(a => a.hex === hex)?.id ?? null
}
