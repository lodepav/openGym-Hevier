// The Lifts tab (hevier/DECISIONS.md D135): every exercise the log holds, with its last set and its
// best, the most recently trained first or grouped by muscle group. The sets are upstream's
// bestSetFor (lib/exercise-history.js): the last set is the best of the last session, the best the
// best of all of them. A new best is a record the last session set (records.js, the feed's trophies).
import { currentDbLoad } from '../../lib/dumbbells.js'
import { metricRowsForEntry, metricModeForEntry, workoutAt, workoutDay } from '../../lib/history.js'
import { bestSetFor } from '../../lib/exercise-history.js'
import { groupBy, groupOfName } from './muscle-groups.js'
import { workoutRecords } from './records.js'

/** The list's order, kept in S.hvLiftsBy: 'recent' unless 'muscle' was picked. */
export const liftsBy = S => (S?.hvLiftsBy === 'muscle' ? 'muscle' : 'recent')

/**
 * One row per exercise with a done set, most recently trained first:
 * `{ id, d, mode, target, last, best, newBest }`. `last` and `best` are sets in the mode the
 * exercise was last logged in; `newBest` when the last session set a record for it.
 */
export function liftRows(S) {
  const by = new Map()
  for (const w of S?.workouts || []) {
    const t = workoutAt(w)
    const at = Number.isFinite(t) ? t : -Infinity
    for (const e of w?.entries || []) {
      if (!e?.id || !metricRowsForEntry(e).length) continue
      const x = by.get(e.id) || by.set(e.id, { ws: [], w: null, e: null, at: -Infinity }).get(e.id)
      if (x.ws.at(-1) !== w) x.ws.push(w)
      if (at >= x.at) Object.assign(x, { w, e, at })
    }
  }
  const rows = []
  for (const [id, x] of by) {
    const mode = metricModeForEntry(x.e)
    const as = currentDbLoad(S, id)   // a dumbbell's weight as it is counted now, as the exercise's page reads it
    const last = bestSetFor({ workouts: [x.w] }, id, mode, as)?.set || null
    const best = bestSetFor({ workouts: x.ws }, id, mode, as)?.set || null
    const newBest = workoutRecords(S, x.w).some(r => x.w.entries[r.i]?.id === id)
    rows.push({ id, d: workoutDay(x.w), at: x.at, mode, target: x.e.target || null, last, best, newBest })
  }
  return rows.sort((a, b) => b.at - a.at || String(a.id).localeCompare(String(b.id)))
}

/**
 * The rows in sections: one ('recent', titled Recently trained) or, `by` 'muscle', one per muscle
 * group in the groups' order, the most recent first in each. `keep` (a Set of ids) is a search's
 * hits; `muscleOf(id)` the exercise's main muscle by name. Sections with no row are left out.
 */
export function liftSections(rows, { by = 'recent', keep = null, muscleOf = () => '' } = {}) {
  const list = keep ? rows.filter(r => keep.has(r.id)) : rows
  if (!list.length) return []
  if (by !== 'muscle') return [{ key: 'recent', label: 'Recently trained', rows: list }]
  return groupBy(list, r => groupOfName(muscleOf(r.id))).map(g => ({ key: g.id, label: g.label, rows: g.kinds }))
}
