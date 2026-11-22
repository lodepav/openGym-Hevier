// Exercise time's rows without a time ("Ticked all at once", "Too few sets") after the timed ones,
// under one folded heading, so the real numbers are not lost among them (the tenth critique, 2026-11-22).

/** timeSections' sections split: `timed`, each section with its timed rows only (a section left
 *  with none goes), and `untimed`, every row without a time from all sections, in their order, an
 *  exercise once: by gym it can be in two sections, its sessions added and "ticked all at once" if either was. */
export function untimedApart(sections) {
  const byId = new Map()
  for (const r of sections.flatMap(sec => sec.rows.filter(r => r.avg == null))) {
    const had = byId.get(r.id)
    byId.set(r.id, had ? { ...had, sessions: had.sessions + r.sessions, quick: had.quick || r.quick } : r)
  }
  const untimed = [...byId.values()]
  const timed = sections.map(sec => ({ ...sec, rows: sec.rows.filter(r => r.avg != null) })).filter(sec => sec.rows.length)
  return { timed, untimed }
}
