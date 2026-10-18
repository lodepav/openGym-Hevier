// The x-axis labels of upstream's LineChart without repeats (seam S30). Upstream labels a span
// under a month with three dates, start, middle and end, which read the same day twice when the
// span is a day or two ("16 Oct | 17 Oct | 17 Oct"); and a span over a year with month names alone,
// so April came round twice with nothing to tell the years apart ("Apr | Jul | Oct | Jan | Apr").

const YEAR_MS = 366 * 864e5

/**
 * `ticks` as LineChart builds them ({ t, txt, anchor? }, `anchor` only on the dated ones), for a
 * chart from `t0` to `t1`: a date that repeats the one before is dropped (the end kept over the
 * middle, one left alone in the middle), and over more than a year each month says its year ("Apr '25").
 */
export function chartTicks(ticks, t0, t1) {
  if (!Array.isArray(ticks) || !ticks.length) return ticks
  if (ticks.some(k => k.anchor)) {
    const out = []
    for (const k of ticks) {
      const prev = out.at(-1)
      if (prev?.txt !== k.txt) out.push(k)
      else if (k.anchor === 'end') out[out.length - 1] = k
    }
    if (out.length === 1) return [{ ...out[0], t: (t0 + t1) / 2, anchor: 'middle' }]
    return out
  }
  if (t1 - t0 <= YEAR_MS) return ticks
  return ticks.map(k => ({ ...k, txt: k.txt + " '" + String(new Date(k.t).getFullYear()).slice(2) }))
}
