// A finished workout's day, start time and length as the fork's cards and Workout Detail show
// them: "Sat 17 Oct · 18:05" and "45 min", or "40s" for one under a minute. Imported history
// without a clock (no end after its start) keeps upstream's day alone and a dash.
import { fmtDate, fmtDur } from '../../lib/format.js'
import { fmtDuration } from '../../lib/duration.js'
import { dateLocale } from '../../lib/i18n-core.js'

const lengthOf = w => Math.max(0, (Number(w?.end) || 0) - (Number(w?.start) || 0))
/** True when the workout has a clock: an end after its start. */
export const hasClock = w => Number(w?.start) > 0 && lengthOf(w) > 0

/** "Sat 17 Oct · 18:05", or the day alone without a clock. */
export function workoutWhenText(w) {
  const day = fmtDate(w.d, true)
  if (!hasClock(w)) return day
  return day + ' · ' + new Date(w.start).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
}

/** "45 min", "1h 5m", "40s", or "–" without a clock. */
export function workoutTimeText(w) {
  const ms = hasClock(w) ? lengthOf(w) : 0
  if (ms >= 60000) return fmtDur(ms)
  return ms > 0 ? fmtDuration(Math.max(1, Math.round(ms / 1000))) : '–'
}
