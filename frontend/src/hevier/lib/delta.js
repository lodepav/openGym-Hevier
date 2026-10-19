// One way to write a change: "+3", "−2" with a true minus (U+2212), nothing for none.
import { fmtNum } from '../../lib/format.js'

/** { up, text } for a signed change `n`, its size written by `fmt`; null when it is zero. */
export function signed(n, fmt = fmtNum) {
  const v = Number(n) || 0
  if (!v) return null
  return { up: v > 0, text: (v > 0 ? '+' : '−') + fmt(Math.abs(v)) }
}
