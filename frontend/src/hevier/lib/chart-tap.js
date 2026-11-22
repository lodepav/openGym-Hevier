// Which point of upstream's LineChart a tap picked, read from what the chart drew: its readout's
// vertical line (`.cvl`, x1) against its polyline's points. LineChart takes no tap handler, and its
// own padding is not repeated here, so a tap never opens a session other than the one its readout names.
// shortcut: tied to LineChart's markup (one polyline, the .cvl line); if that changes, a tap opens nothing; upgrade with an onPick prop upstream.

/** The index of the drawn point at x `x` among the polyline's "x,y x,y" `points`, or null.
 *  A single point is drawn twice (LineChart), so it is index 0. */
export function tappedIndex(x, points) {
  const xs = String(points || '').trim().split(/\s+/).filter(Boolean).map(p => Number(p.split(',')[0]))
  if (!xs.length || !Number.isFinite(x) || xs.some(v => !Number.isFinite(v))) return null
  if (xs.length === 2 && xs[0] === xs[1]) return 0
  let best = 0
  xs.forEach((v, i) => { if (Math.abs(v - x) < Math.abs(xs[best] - x)) best = i })
  // The polyline rounds to a tenth; the readout's line does not.
  return Math.abs(xs[best] - x) <= 0.1 ? best : null
}

/** The same, read from a chart's element: null when it shows no readout. */
export function chartTapIndex(el) {
  const line = el?.querySelector?.('.cvl')
  const poly = el?.querySelector?.('polyline')
  if (!line || !poly) return null
  return tappedIndex(Number(line.getAttribute('x1')), poly.getAttribute('points'))
}
