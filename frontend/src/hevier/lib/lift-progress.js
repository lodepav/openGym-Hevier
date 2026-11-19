// Where each lift on Lifts is going (hevier/DECISIONS.md D140): over a window (12 weeks, the current
// OpenBite phase, or all), the estimated 1RM of each machine label as exercise details reads it
// (exercise-summary.js), its change as the median of the first sessions against the median of the
// last, and rising, holding or falling as D95 reads it (strength-signal.js), here for every lift,
// calves and abs too. Entries kept out of progression stay out (counted-log.js, D57).
import { countedS } from '../../lib/counted-log.js'
import { entryExcluded, metricRowsForEntry } from '../../lib/history.js'
import { entryLastKey } from './gym-labels.js'
import { exerciseSummary } from './exercise-summary.js'
import { workoutPhase } from './shared-phase.js'
import { dayNo, compared, arrows, sessionVerdict, readExercise } from './strength-signal.js'

const DAY = 24 * 3600 * 1000

/** The window switch's values, kept in S.hvLiftsWindow. */
export const WINDOWS = ['12w', 'phase', 'all']

/** The window picked on Lifts: '12w' unless another known one was. */
export const liftsWindow = S => (WINDOWS.includes(S?.hvLiftsWindow) ? S.hvLiftsWindow : '12w')

// The log oldest first, as strength-signal.js orders it.
const sorted = workouts => (Array.isArray(workouts) ? workouts : [])
  .filter(w => w?.d)
  .sort((a, b) => a.d.localeCompare(b.d) || (a.start || 0) - (b.start || 0))

/**
 * The phase of the latest workout and the first day of the unbroken run of workouts done in it:
 * `{ phase, since }`, or null when the latest workout has no phase.
 */
export function currentPhase(S) {
  const log = sorted(S?.workouts)
  const phase = workoutPhase(log.at(-1))
  if (!phase) return null
  let from = log.length - 1
  while (from > 0 && workoutPhase(log[from - 1]) === phase) from--
  return { phase, since: log[from].d }
}

/** The window's first day as an ISO date, null for 'all'. 12 weeks counts today as one of 84 days. */
export function windowFrom(S, win, today) {
  if (win === 'all') return null
  const twelve = new Date((dayNo(today) - 83) * DAY + 12 * 3600 * 1000).toISOString().slice(0, 10)
  return (win === 'phase' && currentPhase(S)?.since) || twelve
}

const median = list => {
  const s = [...list].sort((a, b) => a - b), m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** The whole-percent change of a series: the median of its first k points against its last k, k up to 3. */
export function medianChange(points) {
  const n = points?.length || 0
  if (n < 2) return null
  const k = Math.min(3, Math.floor(n / 2))
  const first = median(points.slice(0, k).map(p => p.y))
  if (!first) return null
  return Math.round((median(points.slice(-k).map(p => p.y)) - first) / first * 100) || 0   // never -0
}

// The log with only this label's entries of `id`, so the 1RM is the label's own, as details shows it.
const chainS = (S, workouts, id, key) => ({
  ...S,
  workouts: workouts.map(w => (w?.entries?.some(e => e?.id === id)
    ? { ...w, entries: w.entries.filter(e => e?.id !== id || entryLastKey(e) === key) } : w)),
})

const stateOf = sessions => {
  const read = readExercise(sessions)
  if (!read.judged) return null
  // A label that ends falling is falling, however many better sessions came before it.
  return read.falling ? 'falling' : read.rising ? 'rising' : 'holding'
}

/**
 * Map exercise id → `{ state, pct, lines }` for every exercise done in the window (from `from`, an
 * ISO date, or all of the log for null; it ends with the log). `lines` holds one
 * `{ key, points, state, pct }` per machine label with an estimated 1RM in the window, the most
 * recently used first; `points` are `{ d, y }` oldest first. The exercise's `state` and `pct` are its most recently used label's: `state`
 * 'rising' | 'holding' | 'falling', or null with fewer than two sessions to compare; `pct` the
 * median change (medianChange), null without two estimates. A bodyweight or assisted lift has none.
 */
export function liftProgress(S, { from = null } = {}) {
  const counted = countedS(S) || {}
  // The arrows are read whatever upstream's switch shows on screen (Compare sets with last time), and
  // against the whole log: the first session in the window is still held against the one before it.
  const R = { ...counted, setTrend: true }
  const log = sorted(counted.workouts)
  const inside = log.filter(w => from == null || w.d >= from)

  // Per exercise, per label in the order of last use: the sessions' verdicts.
  const byEx = new Map()
  for (const w of inside) {
    const day = dayNo(w.d)
    ;(w.entries || []).forEach((e, i) => {
      if (!e?.id || !metricRowsForEntry(e).length) return
      const key = entryLastKey(e)
      if (!byEx.has(e.id)) byEx.set(e.id, new Map())
      const labels = byEx.get(e.id)
      const l = labels.get(key) || { sessions: [] }
      labels.delete(key)   // re-inserted, so the Map's order is the order of last use
      labels.set(key, l)
      // A deload routine's entries are counted (counted-log.js) but are no worse session.
      if (!compared(e.id) || entryExcluded(w, e)) return
      const verdict = sessionVerdict(arrows(R, w, i))
      if (verdict != null) l.sessions.push({ day, verdict })
    })
  }

  const out = new Map()
  const windowS = { ...counted, workouts: inside }
  for (const [id, labels] of byEx) {
    // A bodyweight lift's estimate is the added load's alone, and an assisted one's the help's.
    if (!compared(id)) { out.set(id, { state: null, pct: null, lines: [] }); continue }
    const keys = [...labels.keys()].reverse()
    const lines = keys.map(key => {
      const s = keys.length > 1 ? chainS(windowS, inside, id, key) : windowS
      const points = (exerciseSummary(s, id).series.e1rm || []).map(p => ({ d: p.d, y: p.y }))
      return { key, points, state: stateOf(labels.get(key).sessions), pct: medianChange(points) }
    })
    // The lift's read is its most recent label's, with an estimate or not (sets over 12 reps have none).
    const head = lines[0]
    out.set(id, { state: head.state, pct: head.pct, lines: lines.filter(l => l.points.length) })
  }
  return out
}

/** The percent a row shows beside its state: none when it points against it (↓ +3%), so the two never disagree. */
export const shownPct = (state, pct) => ((state === 'rising' && pct < 0) || (state === 'falling' && pct > 0) ? null : pct ?? null)

/** How many lifts are rising, holding and falling; a lift without a state is not counted. */
export function progressTotals(map) {
  const n = { rising: 0, holding: 0, falling: 0 }
  for (const p of map?.values?.() || []) if (p?.state in n) n[p.state]++
  return n
}
