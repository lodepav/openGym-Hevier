// The ↑ = ↓ beside a set against the same set last time (D66, upstream's #907 since 1.4.4): Workout
// Detail's sets and the workout's ticked rows. `v` is 1, 0, -1 or null (no mark).
import { t } from '../../lib/i18n.js'

const TREND = { 1: ['up', '↑', 'Better than last time'], 0: ['eq', '=', 'Same as last time'], '-1': ['down', '↓', 'Less than last time'] }

/** The words a trend is read out as, '' for none. */
export const trendWords = v => (v == null ? '' : t(TREND[v][2]))

export default function TrendMark({ v, hidden = false }) {
  if (v == null) return null
  const [cls, glyph, label] = TREND[v]
  return hidden
    ? <span className={'hv-trend ' + cls} aria-hidden="true">{glyph}</span>
    : <span className={'hv-trend ' + cls} role="img" aria-label={t(label)} title={t(label)}>{glyph}</span>
}
