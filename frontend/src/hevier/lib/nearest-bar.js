// The weekly chart's bars are a few pixels wide at 26 and 52 weeks, so a tap on the bars area
// picks the week whose bar centre is nearest (components/WeeklyChart.jsx).

/** The index in `centres` (x positions) nearest to `x`, the earlier one on a tie; -1 when there is none or x is not a number. */
export function nearestIndex(x, centres) {
  if (!Number.isFinite(x) || !centres?.length) return -1
  let best = 0
  for (let i = 1; i < centres.length; i++) if (Math.abs(centres[i] - x) < Math.abs(centres[best] - x)) best = i
  return best
}
