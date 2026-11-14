// Statistics → Lift trends: each exercise trained in the last three weeks read as D95 reads it for
// OpenBite (strength-signal.js), but without a phase and one exercise at a time: falling after
// worse, then worse again; rising when most sessions were better; else holding. The same exercises
// are left out (bodyweight and assisted lifts, calves and abs, entries kept out of progression),
// and another machine label is another chain (D82). Beside it, the change in exercise details' own
// estimated 1RM over the window and the days since the exercise's last record (D51).
import { exOr } from '../../lib/exercises.js'
import { entryExcluded } from '../../lib/history.js'
import { entryLastKey } from './gym-labels.js'
import { countedS } from '../../lib/counted-log.js'
import { exerciseSummary } from './exercise-summary.js'
import { workoutRecords } from './records.js'
import { WINDOW_DAYS, LEFT_OUT, dayNo, compared, arrows, sessionVerdict, readExercise, muscleGroup } from './strength-signal.js'

const ORDER = { falling: 0, holding: 1, rising: 2 }

// The log with only this chain's sessions of `id`, so the 1RM is the label's own, as details shows it.
const chainS = (S, id, key) => ({
  ...S,
  workouts: (S.workouts || []).map(w => (w?.entries?.some(e => e?.id === id)
    ? { ...w, entries: w.entries.filter(e => e?.id !== id || entryLastKey(e) === key) } : w)),
})

/**
 * The page's rows: `{ id, key, state, sessions, pct, recordDays, sinceDays }`, Falling first, then
 * Holding, then Rising, the largest change first inside each. `state` is 'falling' | 'holding' |
 * 'rising'; `pct` the change of the best estimated 1RM from the first session in the window to the
 * latest, in whole percent (null with fewer than two); `recordDays` the days since the chain's last
 * record (null for none, or with record marks off) and `sinceDays` since its first session ever.
 */
export function liftTrends(S, today) {
  // The arrows are read whatever upstream's switch shows on screen (Compare sets with last time).
  const R = { ...S, setTrend: true }
  const log = (Array.isArray(S?.workouts) ? S.workouts : [])
    .filter(w => w?.d)
    .sort((a, b) => a.d.localeCompare(b.d) || (a.start || 0) - (b.start || 0))
  const todayNo = dayNo(today)
  const chains = new Map()
  for (const w of log) {
    const day = dayNo(w.d)
    if (todayNo - day >= WINDOW_DAYS) continue
    ;(w.entries || []).forEach((e, i) => {
      if (entryExcluded(w, e) || !compared(e.id) || LEFT_OUT.has(muscleGroup(exOr(e.id)))) return
      const verdict = sessionVerdict(arrows(R, w, i))
      if (verdict == null) return
      const key = entryLastKey(e)
      const k = e.id + '|' + key
      if (!chains.has(k)) chains.set(k, { id: e.id, key, sessions: [] })
      chains.get(k).sessions.push({ day, verdict })
    })
  }

  const counted = countedS(S)
  const rows = []
  for (const { id, key, sessions } of chains.values()) {
    const read = readExercise(sessions)
    if (!read.judged) continue
    const pts = (exerciseSummary(chainS(counted, id, key), id).series.e1rm || []).filter(p => todayNo - dayNo(p.d) < WINDOW_DAYS)
    const first = pts[0]?.y, last = pts[pts.length - 1]?.y
    const pct = pts.length >= 2 && first > 0 ? Math.round((last - first) / first * 100) : null
    let recordDay = null, firstDay = null
    for (const w of log) {
      const mine = (w.entries || []).some(e => e?.id === id && entryLastKey(e) === key && !entryExcluded(w, e))
      if (!mine) continue
      if (firstDay == null) firstDay = dayNo(w.d)
      if (workoutRecords(S, w).some(r => r.id === id && entryLastKey(w.entries[r.i]) === key)) recordDay = dayNo(w.d)
    }
    rows.push({
      id, key, sessions: sessions.length, pct,
      // A chain that ends falling is falling, however many better sessions came before it.
      state: read.falling ? 'falling' : read.rising ? 'rising' : 'holding',
      recordDays: recordDay == null ? null : todayNo - recordDay,
      sinceDays: firstDay == null ? null : todayNo - firstDay,
    })
  }
  const size = r => (r.pct == null ? -1 : Math.abs(r.pct))
  return rows.sort((a, b) => ORDER[a.state] - ORDER[b.state] || size(b) - size(a) || String(a.id).localeCompare(String(b.id)))
}
