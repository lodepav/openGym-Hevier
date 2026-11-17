// D123: the meaning colours (cardio, deload, a drop set, warm-up, failure, superset, record, note)
// step aside when the accent, or another meaning, sits too close. Too close is an OKLab distance under MIN_APART:
// contrast cannot tell two hues of the same lightness apart. Done and "better than last time"
// always wear the accent, so they are not here.
import { MIN_APART, HEVY_BLUE } from './accents.js'

export const LABEL = 'var(--label)'
const VIOLET = '#bf5af2'
const YELLOW = '#efab03'

// [first, backup]: theme.css's --green, --yellow, --blue and upstream's --orange, --purple; fail is
// lighter than --red, so the F reads at 4.5:1 on a done set's band and on the open row.
export const MEANINGS = {
  cardio: ['#2fbf5b', HEVY_BLUE],
  deload: ['#ff9f0a', VIOLET],
  drop: [HEVY_BLUE, VIOLET],
  warmup: [YELLOW, LABEL],
  fail: ['#ec5a45', LABEL],
  superset: [VIOLET, LABEL],
  record: [YELLOW, LABEL],
  note: [YELLOW, LABEL],
}

const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }

/** '#rrggbb' as OKLab [L, a, b] (Björn Ottosson's matrices). */
export function oklab(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = lin(n >> 16), g = lin((n >> 8) & 255), b = lin(n & 255)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ]
}

/** OKLab distance of two '#rrggbb' colours. */
export function distance(a, b) {
  const x = oklab(a), y = oklab(b)
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
}

/** Whether two colours read as the same one. The text colour is never too close to anything. */
export const tooClose = (a, b) => a !== LABEL && b !== LABEL && distance(a, b) < MIN_APART

// Extra hues for a meaning whose first and backup are both taken (the teal, lime and pink accents):
// each reads on black (contrast 4.5+) and sits MIN_APART from the others and from every MEANINGS colour.
const POOL = ['#40c8e0', '#ff7eb6', '#a3e635']
// The meanings that must differ from each other, in the order they claim a colour: warm-up before
// deload, since their firsts (yellow, orange) are too close and warm-up is on every set row.
const DISTINCT = ['warmup', 'fail', 'drop', 'superset', 'cardio', 'deload']

/**
 * Each meaning's colour beside `accentHex`, apart from the accent and from each other: its first
 * value, its backup, a POOL hue, or the text colour. Firsts that are free claim first, then the
 * displaced ones pick, so one clash does not move a meaning that was fine.
 */
export function meaningColours(accentHex) {
  const acc = String(accentHex || '').toLowerCase()
  const taken = /^#[0-9a-f]{6}$/.test(acc) ? [acc] : []
  const free = c => c !== LABEL && !taken.some(t => tooClose(c, t))
  const out = {}
  for (const k of DISTINCT) if (free(MEANINGS[k][0])) taken.push(out[k] = MEANINGS[k][0])
  for (const k of DISTINCT) if (!out[k]) {
    out[k] = [MEANINGS[k][1], ...POOL].find(free) ?? LABEL
    if (out[k] !== LABEL) taken.push(out[k])
  }
  // record and note have always shared the warm-up's colour, so they take its result.
  out.record = out.note = out.warmup
  return out
}
