// How long ago, on one scale (the tenth critique, 2026-11-22): upstream's fmtDaysAgo goes from weeks
// to months at 35 days, so "4 weeks ago" (33 days) stood beside "last month" (36). Weeks run on to
// 8 weeks here; from 63 days on, months as upstream counts them.
import { fmtDaysAgo, sep } from './dates.js'
import { dateLocale } from '../../lib/i18n-core.js'

const at = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))

/** "3 days ago", "4 weeks ago", "8 weeks ago", "2 months ago"; a year back or more, its date. */
export function daysAgo(iso, today) {
  const days = Math.round((at(today) - at(iso)) / 86400000)
  if (!(days >= 35 && days < 63)) return fmtDaysAgo(iso, today)
  try { return sep(new Intl.RelativeTimeFormat(dateLocale(), { numeric: 'auto' }).format(-Math.floor(days / 7), 'week')) }
  catch { return fmtDaysAgo(iso, today) }
}
