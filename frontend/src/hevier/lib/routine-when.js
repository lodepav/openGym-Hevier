// The routines list's date line (hevier/DECISIONS.md D130): a routine's next planned day, read from
// the same days as next-planned.js (D124), else when it was last done.
import { effectiveRoutineIds } from '../../lib/history.js'
import { workoutsOn } from '../../lib/backfill.js'
import { isoOf } from '../../lib/format.js'
import { fmtDate } from './dates.js'
import { t } from '../../lib/i18n.js'
import { nextPlanned } from './next-planned.js'

const AHEAD = 28  // next-planned.js's horizon
const idsOf = w => (Array.isArray(w?.routineIds) ? w.routineIds : w?.routineId ? [w.routineId] : [])

/**
 * `{ next, text }`: `next` the routine ids of the next planned session (nextPlanned's), `text` a
 * Map from routine id to its line: the next day it is planned on ("Today", "Tue 17 Nov"), else
 * "last done 7 Nov"; a routine neither planned nor done has none.
 */
export function routineWhen(S, today) {
  const planned = new Map()
  for (let i = 0; i < AHEAD; i++) {
    const d = new Date(today + 'T12:00:00')
    d.setDate(d.getDate() + i)
    const iso = isoOf(d)
    if (workoutsOn(S, iso).length) continue
    for (const id of effectiveRoutineIds(S, iso, today)) if (!planned.has(id)) planned.set(id, iso)
  }
  const last = new Map()
  for (const w of S.workouts || []) {
    if (!w?.d) continue
    for (const id of idsOf(w)) if (!(last.get(id) >= w.d)) last.set(id, w.d)
  }
  const text = new Map()
  for (const r of S.routines || []) {
    const p = planned.get(r.id), l = last.get(r.id)
    if (p) text.set(r.id, p === today ? t('Today') : fmtDate(p, true))
    else if (l) text.set(r.id, t('last done {0}', fmtDate(l, false, l.slice(0, 4) !== today.slice(0, 4))))
  }
  return { next: nextPlanned(S, today)?.ids || [], text }
}
