// What the Finish sheet says about the workout before it is saved (hevier/DECISIONS.md D132): the
// sets, the new best sets, the sets left unticked, and what the workout would change in its
// routines, which the sheet's "Update the routine too" box keeps (D129). The routine comparison is
// routine-update.js's, the one the old "Update routine?" pop-up used.
import { setsDoneActive, setUnitsTotal } from '../../lib/history.js'
import { workSets } from './volume.js'
import { liveRecords } from './records.js'
import { routineUpdates, summaryParts } from './routine-update.js'

/**
 * `{ sets, best, unticked, none, updates, changed }` for the session `A` of profile `S`: ticked
 * work sets (a per-side set once, as Workout Detail counts), sets holding a new record, sides and
 * sets not ticked, whether nothing is ticked, the routine updates and their summed summary (null
 * when the workout left its routines as they are).
 */
export function finishFacts(S, A = S?.active) {
  const done = setsDoneActive(A)
  const best = new Set(liveRecords(S, A).filter(r => r.set >= 0).map(r => r.i + ':' + r.set)).size
  const updates = routineUpdates(S, A)
  return {
    sets: workSets(A?.entries),
    best,
    unticked: Math.max(0, setUnitsTotal(A?.entries) - done),
    none: !done,
    updates,
    changed: updates.length ? summaryParts(updates) : null,
  }
}

/** "1 added · 1 swapped · 2 changed · new order", `tr` translating each part. */
export function changedText(n, tr = (s, ...a) => a.reduce((x, v, k) => x.replace('{' + k + '}', v), s)) {
  if (!n) return ''
  return [
    n.added && tr('{0} added', n.added),
    n.removed && tr('{0} removed', n.removed),
    n.swapped && tr('{0} swapped', n.swapped),
    n.changed && tr('{0} changed', n.changed),
    n.moved && tr('new order'),
  ].filter(Boolean).join(' · ')
}
