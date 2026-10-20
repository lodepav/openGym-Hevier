// An exercise's rest wheel opens on the default rest (D56). Upstream's "Rest for this exercise"
// sheets (the workout's, the exercise settings', the routine editor's) open at 0:00, which the
// wheel names "Default (1:30)", so the dials sat at zero. Seam S33 hands each duration sheet here
// before it opens: one whose 0:00 is that default opens at the default instead, and Done on the
// default still saves 0, "no rest of its own", so the exercise keeps following the default.
// Upstream's line under the wheel ("0:00 means your default rest") is reworded to say so.
// An exercise with its own rest, and every other wheel, open as upstream's.
import { t } from '../../lib/i18n.js'
import { fmtRest } from '../../lib/duration.js'

const UPSTREAM_FOOT = 'Rest after each set of this exercise. 0:00 means your default rest.'

/** Upstream's "0:00 means your default rest", said as the wheel now works; any other text as it is.
 *  The wheel's sheet (S33) and the exercise settings page's line (S42) both read it. */
export function restFooter(text, restSec) {
  if (text !== t(UPSTREAM_FOOT) || !(restSec > 0)) return text
  return t('Rest after each set of this exercise. Left on your default rest ({0}), it follows the default when you change it.', fmtRest(restSec))
}

/** The sheet's `value`, `onDone` and `footer`, moved onto `restSec` when its 0:00 means the
 *  default rest. */
export function restOpen({ value, off, footer, onDone }, restSec) {
  const def = t('Default ({0})', fmtRest(restSec))
  if (!(restSec > 0) || off !== def) return { value, onDone, footer }
  footer = restFooter(footer, restSec)
  if (value > 0) return { value, onDone, footer }
  return { value: restSec, onDone: v => onDone(v === restSec ? 0 : v), footer }
}
