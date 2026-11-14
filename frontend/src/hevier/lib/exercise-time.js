// How long each exercise of a workout took (D88), from the times its sets were ticked (`at`, which
// upstream stamps for the session's end, lib/finish-workout.js). The time up to each tick goes to
// that set's exercise: from the workout's start to the first tick, then from tick to tick, whatever
// exercise came before. So the rest before a set and the setup count, a superset's two exercises
// share its time as they were done, and the exercises add up to the workout up to its last set.
// A timed row (a hold, cardio) counts at least its own length, as it may have been ticked when it
// began. A pause longer than upstream's forgotten-session gap is a break, not the next exercise's;
// a tick before the start or past the end (catching up the log later, a workout logged into the
// past) is left out. A workout with no tick times (imported, or older) has none.
import { entryTimes } from '../../lib/exercise-time.js'
import { entryExcluded } from '../../lib/history.js'

// The per-entry times are upstream's own now; the fork adds the sessions and sections on top.
export { entryTimes }

/**
 * Every timed session of an exercise in `workouts` from `since` (an ISO day, '' for all), one per
 * workout and exercise (an exercise done twice in one workout counts once, its times added):
 * `{ id, gym, ms }`. An entry kept out of progression is left out (D57), after the times are
 * worked out, so its time does not go to the exercise after it.
 */
export function timedSessions(workouts, since = '') {
  const out = []
  for (const w of workouts || []) {
    if (since && !(String(w?.d || '') >= since)) continue
    const times = entryTimes(w)
    if (!times.length) continue
    const byId = new Map()
    w.entries.forEach((e, i) => {
      if (!(times[i] > 0) || entryExcluded(w, e)) return
      const had = byId.get(e.id)
      if (had) had.ms += times[i]
      else byId.set(e.id, { id: e.id, gym: e.hvGym || '', ms: times[i] })
    })
    out.push(...byId.values())
  }
  return out
}

const rowsOf = sessions => {
  const by = new Map()
  for (const s of sessions) {
    const r = by.get(s.id) || by.set(s.id, { id: s.id, sessions: 0, total: 0 }).get(s.id)
    r.sessions++
    r.total += s.ms
  }
  return [...by.values()].map(r => ({ ...r, avg: r.total / r.sessions }))
}

/**
 * The exercise time page's sections: `by` null (one section), 'muscle' (`muscleOf(id)`, '' for
 * none) or 'gym' (the session's gym id, '' for none, always last). Rows by their average, longest
 * first unless `asc`; sections by their total time the same way.
 */
export function timeSections(sessions, { by = null, asc = false, muscleOf = () => '' } = {}) {
  const dir = asc ? 1 : -1
  const sortRows = rows => rows.sort((a, b) => dir * (a.avg - b.avg) || String(a.id).localeCompare(String(b.id)))
  if (!by) return sessions.length ? [{ key: '', rows: sortRows(rowsOf(sessions)), total: 0 }] : []
  const groups = new Map()
  for (const s of sessions) {
    const key = by === 'gym' ? s.gym : muscleOf(s.id) || ''
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(s)
  }
  const out = [...groups].map(([key, list]) => ({ key, rows: sortRows(rowsOf(list)), total: list.reduce((n, s) => n + s.ms, 0) }))
  // An unnamed section (no gym, no muscle) goes last.
  return out.sort((a, b) => (a.key === '') - (b.key === '') || dir * (a.total - b.total) || a.key.localeCompare(b.key))
}

/** The first day of a period ending `today` ('30d', '90d', 'year'; 'all' is ''). */
export function periodSince(period, today) {
  const days = { '30d': 30, '90d': 90, year: 365 }[period]
  if (!days) return ''
  const d = new Date(today + 'T12:00:00')
  d.setDate(d.getDate() - days + 1)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
