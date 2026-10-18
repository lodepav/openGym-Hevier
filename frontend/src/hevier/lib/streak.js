// How long you have been training (D59): a week streak that one week off does not break, and once
// that run of training is a year long, years, which only two months off break. Shown on the
// Calendar page and Home's streak widget.
import { workoutDay } from '../../lib/history.js'
import { startOfWeek, weekStartOf, todayISO, MONDAY } from '../../lib/format.js'
import { t, dateLocale } from '../../lib/i18n-core.js'

const DAY = 86400000
const at = iso => new Date(iso + 'T12:00:00')
const dayNo = iso => Math.round(at(iso).getTime() / DAY)
const weekNo = (iso, ws) => Math.round(startOfWeek(iso, ws).getTime() / DAY / 7)

// The same day two calendar months on, the last day of that month when it is shorter (31 Dec → 28 Feb).
function twoMonthsOn(iso) {
  const d = at(iso), day = d.getDate()
  d.setDate(1); d.setMonth(d.getMonth() + 2)
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
  return d.getTime()
}

/** The training days up to `today`, oldest first, each once. */
function daysOf(workouts, today) {
  const set = new Set()
  for (const w of workouts || []) { const d = workoutDay(w); if (d && d <= today) set.add(d) }
  return [...set].sort()
}

/**
 * The current streak, or null with none.
 *  - weeks: the weeks from the first to the last trained week of the run, the weeks off inside it
 *    counted; a run ends at two weeks in a row with no workout, and it is still alive while the
 *    weeks since its last trained one are at most one (this week may still be trained).
 *  - years: the run of training that no two months off broke (a workout more than two calendar
 *    months after the one before starts a new run; still alive until two months after the last).
 *    Once it spans a year, it is shown instead of the weeks, in years to a tenth, rounded down.
 * Returns { unit: 'weeks' | 'years', n }.
 */
export function trainingStreak(workouts, today, ws = MONDAY) {
  const days = daysOf(workouts, today)
  if (!days.length) return null
  const last = days.at(-1)

  if (at(today).getTime() <= twoMonthsOn(last)) {
    let i = days.length - 1
    while (i > 0 && at(days[i]).getTime() <= twoMonthsOn(days[i - 1])) i--
    const span = dayNo(last) - dayNo(days[i])
    if (span >= 365) return { unit: 'years', n: Math.max(1, Math.floor(span / 365.2425 * 10) / 10) }
  }

  const weeks = [...new Set(days.map(d => weekNo(d, ws)))]
  const lastW = weeks.at(-1)
  if (weekNo(today, ws) - lastW > 2) return { unit: 'weeks', n: 0 }
  let j = weeks.length - 1
  while (j > 0 && weeks[j] - weeks[j - 1] <= 2) j--
  return { unit: 'weeks', n: lastW - weeks[j] + 1 }
}

/** The streak line: "12 week streak", "1.6 year streak". */
export function streakLabel(S, today = todayISO()) {
  const s = trainingStreak(S?.workouts, today, weekStartOf(S)) || { unit: 'weeks', n: 0 }
  if (s.unit === 'weeks') return t('{0} week streak', s.n)
  return t('{0} year streak', s.n.toLocaleString(dateLocale(), { maximumFractionDigits: 1 }))
}
