// History's feed with a header where each month starts, "November · 3 workouts" (the critique,
// 2026-11-20): the week's numbers left the tab, so the feed says where in time it is.

/** The workouts `ws` (newest first) as Map(index of a month's first workout → { ym, n }), `n` the month's count. */
export function monthHeads(ws) {
  const heads = new Map()
  let at = null
  ws.forEach((w, i) => {
    const ym = String(w?.d || '').slice(0, 7)
    if (ym.length < 7) return
    if (at?.ym === ym) { at.n++; return }
    at = { ym, n: 1 }
    heads.set(i, at)
  })
  return heads
}
