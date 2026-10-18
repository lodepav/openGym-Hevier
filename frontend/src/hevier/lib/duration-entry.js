// Hevy's duration entry (hevier/DECISIONS.md D53): digits fill a clock from the right, as on a
// microwave, "1234" is 12:34 and "13000" 1:30:00. Up to six digits, h:mm:ss.

/** The digits typed in `text`, leading zeros dropped, at most six. */
export const digitsIn = text => String(text ?? '').replace(/\D/g, '').replace(/^0+/, '').slice(0, 6)

const split = d => {
  const p = String(d).padStart(6, '0')
  return [Number(p.slice(0, 2)), Number(p.slice(2, 4)), Number(p.slice(4, 6))]
}

/** Seconds the digits stand for: "1234" → 754, "90" → 90 (a minute and a half). */
export function fromDigits(d) {
  if (!d) return 0
  const [h, m, s] = split(d)
  return h * 3600 + m * 60 + s
}

/** The digits as the field shows them while typing: "5" → "0:05", "1234" → "12:34", "13000" → "1:30:00". */
export function showDigits(d) {
  if (!d) return ''
  const [h, m, s] = split(d)
  const ss = String(s).padStart(2, '0')
  return h ? h + ':' + String(m).padStart(2, '0') + ':' + ss : m + ':' + ss
}
