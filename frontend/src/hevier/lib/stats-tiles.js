// The numbers on Statistics' tiles and cards (hevier/DECISIONS.md D142), each from the reader its
// card uses, so a tile and its card never disagree: exercise time from exercise-time.js (this week on the
// tile, the Exercise time page's first period, 90 days, on the card), sets and hours from the weekly
// chart's series for this week, the month from muscle-sets.js's periods, effort from upstream's effort.js. Nothing is stored.
import { workoutDay } from '../../lib/history.js'
import { isoOf, fmtNum } from '../../lib/format.js'
import { t } from '../../lib/i18n.js'
import { isWarmupRow, hasCompletedWork } from '../../lib/workout-model.js'
import { rirOf, toScale, MIN_RATED } from '../../lib/effort.js'
import { timedSessions, timeSections, periodSince } from './exercise-time.js'
import { weeklySeries, inWeek } from './weekly-series.js'
import { periodOf } from './muscle-sets.js'

export const TIME_PERIOD = '90d'
const DAY = 86400000

/** This week's exercise time: the timed exercises of this week's workouts added up, in ms (0 with none),
 *  over the weeks the weekly chart and the other tiles use. */
export function weekExerciseTime(workouts, today, weekStart) {
  const week = weeklySeries([], 'duration', { today, weeks: 1, weekStart })[0].week
  return timedSessions((workouts || []).filter(w => inWeek(w, week, weekStart))).reduce((n, s) => n + s.ms, 0)
}

/** The `n` exercises that take longest a session over the last 90 days: `[{ id, avg, … }]`. */
export const longestExercises = (workouts, today, n = 3) =>
  (timeSections(timedSessions(workouts, periodSince(TIME_PERIOD, today)))[0]?.rows || []).slice(0, n)

const back = (iso, days) => isoOf(new Date(Date.parse(iso + 'T12:00:00') - days * DAY))

/** The latest weigh-in and its change from the last one 28 to 56 days before it: `{ w, d, change }`
 *  (change null with none in that span, as an older one would not be "in 4 weeks"), or null with
 *  no weigh-in. */
export function bodyWeightNow(bodyweight) {
  const list = (bodyweight || []).filter(b => Number.isFinite(b?.w) && b.d)
  const last = list.at(-1)
  if (!last) return null
  const from = back(last.d, 28), oldest = back(last.d, 56)
  const base = list.filter(b => b.d <= from && b.d >= oldest).at(-1)
  return { w: last.w, d: last.d, change: base ? Math.round((last.w - base.w) * 10) / 10 : null }
}

/** The weigh-ins of the last 12 weeks up to `today`, as upstream's LineChart takes them. */
export const bodyWeightPoints = (bodyweight, today) => {
  const from = back(today, 12 * 7)
  return (bodyweight || []).filter(b => Number.isFinite(b?.w) && b.d >= from)
    .map(b => ({ t: b.t || Date.parse(b.d + 'T12:00:00'), y: b.w, d: b.d }))
}

/** This week's work sets and time trained (ms), as the weekly chart's last bar counts them. */
export function thisWeek(workouts, today, weekStart) {
  const one = kind => weeklySeries(workouts, kind, { today, weeks: 1, weekStart })[0].value
  return { sets: one('sets'), ms: one('duration') }
}

/** Training time as its tile writes it: whole minutes under an hour, "2 min", then hours to one
 *  decimal, "4.5 h" (fmtNum drops a ".0": "1 h"). */
export function trainingTime(ms) {
  const min = Math.round((Number(ms) || 0) / 60000)
  return min < 60 ? t('{0} min', min) : t('{0} h', fmtNum(Math.round(min / 6) / 10))
}

/** Workouts logged in the month `today` is in. */
export function workoutsThisMonth(workouts, today) {
  const { from, to } = periodOf('month', today)
  return (workouts || []).filter(w => { const d = workoutDay(w); return d && d >= from && d <= to }).length
}

/** The average RPE of this week's rated work sets (an RIR rating read as RPE, effort.js):
 *  `{ rpe, n }`, rpe null below upstream's MIN_RATED, where an average is noise. */
export function weekRpe(workouts, today, weekStart) {
  const week = weeklySeries([], 'sets', { today, weeks: 1, weekStart })[0].week
  const rirs = (workouts || []).filter(w => inWeek(w, week, weekStart))
    .flatMap(w => (w.entries || []).flatMap(e => e.sets || []))
    .filter(s => hasCompletedWork(s) && !isWarmupRow(s)).map(rirOf).filter(v => v != null)
  const n = rirs.length
  return { rpe: n >= MIN_RATED ? toScale('rpe', rirs.reduce((a, b) => a + b, 0) / n) : null, n }
}

/** A week tile's number against last week's, `{ dir, text }`: "↑ 3 vs last week", "= vs last week";
 *  `fmt` writes the change in the tile's own unit. null with neither week trained. */
export function weekChange(now, before, fmt = fmtNum) {
  const a = Number(now) || 0, b = Number(before) || 0
  if (!a && !b) return null
  const dir = Math.sign(a - b)
  return { dir, text: t('{0} vs last week', dir === 0 ? '=' : (dir > 0 ? '↑ ' : '↓ ') + fmt(Math.abs(a - b))) }
}
