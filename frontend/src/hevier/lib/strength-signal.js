// What Go Hevier tells OpenBite about strength in the current phase (hevier/DECISIONS.md D95). The
// test is D66's "than last time", chained: an exercise is falling after worse, then worse again,
// with any number of the same in between. One exercise never counts. A muscle counts when more
// than half of its exercises compared at least twice in the period do, and needs two to judge. One falling muscle is a
// warning, two or more a clear sign. Nothing here reads a live workout or decides what you lift.
import { EXIDX, isAssisted, exOr } from '../../lib/exercises.js'
import { entryExcluded } from '../../lib/history.js'
import { exerciseNameFor } from '../../lib/i18n.js'
import { isWarmupRow } from '../../lib/workout-model.js'
import { entryLastKey } from './gym-labels.js'
import { mainMuscleOf } from './main-muscle.js'
import { workoutTrends } from './set-trend.js'
import { workoutPhase } from './shared-phase.js'
import { workSets } from './volume.js'

const DAY = 24 * 3600 * 1000
const WINDOW_DAYS = 21     // the three weeks of "drop, repeat, drop"
const GAP_DAYS = 14        // sessions this far apart restart the chain: a skipped stretch is not a drop
const WEEKS_DAYS = 14      // how long a phase runs before "rising" or "not rising" can be said

// The muscle as the user speaks of it: the main muscle splits back and shoulders finer than "all
// back", and split up, a back day's exercises would each be alone in their group.
const GROUP = { Lats: 'Back', 'Upper Back': 'Back', 'Lower Back': 'Back', Traps: 'Back',
  'Front Delts': 'Shoulders', 'Side Delts': 'Shoulders', 'Rear Delts': 'Shoulders' }
export const muscleGroup = ex => { const m = mainMuscleOf(ex); return GROUP[m] || m }

// Left out at the user's word: these rarely move much, so "not rising" there says little about food.
const LEFT_OUT = new Set(['Calves', 'Abdominals', 'Obliques'])

const dayNo = d => Math.floor(Date.parse(d + 'T12:00:00Z') / DAY)
const tenth = v => Math.round(v * 10) / 10

/** One session's verdict from its sets' arrows, by majority: 1 better, -1 worse, 0 same, null none. */
export function sessionVerdict(trends) {
  const marked = (trends || []).filter(v => v === 1 || v === 0 || v === -1)
  if (!marked.length) return null
  const up = marked.filter(v => v === 1).length
  const down = marked.filter(v => v === -1).length
  return Math.sign(up - down)
}

/**
 * Whether one exercise's sessions, oldest first as [{ day, verdict }], end falling: at least two
 * worse with only the same between them, and nothing better since. `days` is how long that has run.
 */
export function fallingChain(sessions) {
  let worse = 0, first = null, lastDay = null
  for (const { day, verdict } of sessions) {
    if (lastDay != null && day - lastDay >= GAP_DAYS) { worse = 0; first = null }
    lastDay = day
    if (verdict === 1) { worse = 0; first = null } else if (verdict === -1) {
      if (!worse) first = day
      worse++
    }
  }
  return worse >= 2 ? { falling: true, days: lastDay - first } : { falling: false, days: 0 }
}

/** An exercise's read over the period: falling, notRising and rising (the last two only by count). */
export function readExercise(sessions) {
  const { falling, days } = fallingChain(sessions)
  const n = sessions.length
  const better = sessions.filter(s => s.verdict === 1).length
  const span = n ? sessions[n - 1].day - sessions[0].day : 0
  return { judged: n >= 2, falling, days, rising: n >= 2 && better * 2 > n, notRising: span >= WEEKS_DAYS && better * 2 < n }
}

/** Whether most of a muscle's exercises done in the period (at least two) meet `test`. */
const mostOf = (list, test) => list.length >= 2 && list.filter(test).length * 2 > list.length

// Only loaded lifts: a bodyweight or assisted exercise changes with the weight a cut takes off.
const compared = id => !isAssisted(id) && (EXIDX[id]?.eq || '') !== 'body weight'

function arrows(S, w, i) {
  const e = w.entries[i]
  return workoutTrends(S, w, i).map((v, k) => {
    const s = e.sets?.[k]
    return s && Number(s.w) > 0 && !isWarmupRow(s) ? v : null
  })
}

/**
 * The row OpenBite reads, or null for nothing to share: no phase on the latest workout, or no
 * exercise to judge in the period. Only the workouts of the current phase count, each still held
 * against the session before it, whichever phase that was in.
 */
export function strengthSignal(S, today, now = Date.now()) {
  const log = (Array.isArray(S?.workouts) ? S.workouts : [])
    .filter(w => w?.d)
    .sort((a, b) => a.d.localeCompare(b.d) || (a.start || 0) - (b.start || 0))
  if (!log.length) return null
  const last = log[log.length - 1]
  const phase = workoutPhase(last)
  if (!phase) return null
  let from = log.length - 1
  while (from > 0 && workoutPhase(log[from - 1]) === phase) from--
  const run = log.slice(from)
  const todayNo = dayNo(today)
  const phaseDays = todayNo - dayNo(run[0].d)

  const byExercise = new Map()
  for (const w of run) {
    const day = dayNo(w.d)
    if (todayNo - day >= WINDOW_DAYS) continue
    ;(w.entries || []).forEach((e, i) => {
      if (entryExcluded(w, e) || !compared(e.id)) return
      const verdict = sessionVerdict(arrows(S, w, i))
      if (verdict == null) return
      const key = e.id + '|' + entryLastKey(e)   // another machine is another chain (D82)
      if (!byExercise.has(key)) byExercise.set(key, { id: e.id, sessions: [] })
      byExercise.get(key).sessions.push({ day, verdict })
    })
  }
  if (!byExercise.size) return null

  const byMuscle = new Map()
  const reads = []
  for (const { id, sessions } of byExercise.values()) {
    const muscle = muscleGroup(exOr(id))
    if (LEFT_OUT.has(muscle)) continue
    const read = { id, ...readExercise(sessions) }
    reads.push(read)
    // An exercise compared only once has no chain to show, so it cannot be most of anything.
    if (!muscle || !read.judged) continue
    if (!byMuscle.has(muscle)) byMuscle.set(muscle, [])
    byMuscle.get(muscle).push(read)
  }
  if (!reads.length) return null
  const groups = test => [...byMuscle].filter(([, list]) => mostOf(list, test))
  const falling = groups(r => r.falling)
  const notRising = phase === 'bulking' && phaseDays >= WEEKS_DAYS ? groups(r => r.notRising) : []
  const rising = phaseDays >= WEEKS_DAYS ? groups(r => r.rising) : []

  const [trend, shown, test] = falling.length ? ['falling', falling, r => r.falling]
    : notRising.length ? ['not_rising', notRising, r => r.notRising]
      : rising.length ? ['rising', rising, r => r.rising]
        : ['holding', [], () => false]
  const warns = trend === 'falling' || trend === 'not_rising'

  const inLast = n => run.filter(w => todayNo - dayNo(w.d) < n)
  const sets = ws => ws.reduce((t, w) => t + workSets((w.entries || []).filter(e => !entryExcluded(w, e))), 0)
  const weeks = phaseDays >= 7 ? phaseDays / 7 : null

  return {
    trend,
    level: warns ? (shown.length >= 2 ? 'clear' : 'warning') : null,
    muscles: shown.map(([m]) => m).join(','),
    detail: JSON.stringify(shown.map(([muscle, list]) => ({
      muscle,
      done: list.length,
      exercises: list.filter(test).map(r => exerciseNameFor(exOr(r.id))),
    }))),
    exercises_tracked: reads.length,
    exercises_falling: reads.filter(r => r.falling).length,
    chain_days: Math.max(0, ...reads.map(r => r.days)),
    sets_7d: sets(inLast(7)),
    sets_week_avg: weeks ? tenth(sets(run) / weeks) : null,
    sessions_7d: inLast(7).length,
    sessions_week_avg: weeks ? tenth(run.length / weeks) : null,
    phase,
    phase_days: phaseDays,
    last_workout_at: last.end || last.start || null,
    updated_at: now,
  }
}
