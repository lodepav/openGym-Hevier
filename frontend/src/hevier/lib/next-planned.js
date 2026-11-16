// Home's rotation line names the day the Calendar shows next (D124). Upstream's queueView knows
// nothing of a day planned for a session the pass already did, so it named a later session
// while the Calendar showed the planned one; here the line reads the days themselves.
import { effectiveRoutineIds } from '../../lib/history.js'
import { workoutsOn } from '../../lib/backfill.js'
import { fmtDate, isoOf } from '../../lib/format.js'
import { t } from '../../lib/i18n.js'

const AHEAD = 28  // days looked at; past four weeks upstream's line stays

/** The first day from `today` on with nothing logged and something to train: `{ iso, ids }` or null. */
export function nextPlanned(S, today) {
  for (let i = 0; i < AHEAD; i++) {
    const d = new Date(today + 'T12:00:00')
    d.setDate(d.getDate() + i)
    const iso = isoOf(d)
    if (workoutsOn(S, iso).length) continue
    const ids = effectiveRoutineIds(S, iso, today)
    if (ids.length) return { iso, ids }
  }
  return null
}

/** QueueRow's status line (seam S66), or null to keep upstream's: a complete or waiting round keeps it. */
export function queueStatus(S, today, v) {
  if (!v || v.complete || v.waiting) return null
  const day = nextPlanned(S, today)
  if (!day) return null
  const names = day.ids.map(id => S.routines.find(r => r.id === id)?.name ?? id).join(' + ')
  return day.iso === today ? t('Next: {0}, today', names) : t('Next: {0}', names + ' · ' + fmtDate(day.iso, true))
}
