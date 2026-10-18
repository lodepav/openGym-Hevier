// An exercise's rest wheel opens on the default rest (D56). Upstream's "Rest for this exercise"
// sheets (the workout's, the exercise settings', the routine editor's) open at 0:00, which the
// wheel names "Default (1:30)", so the dials sat at zero. Seam S33 hands each duration sheet here
// before it opens: one whose 0:00 is that default opens at the default instead, and Done on the
// default still saves 0, "no rest of its own", so the exercise keeps following the default.
// An exercise with its own rest, and every other wheel, open as upstream's.
import { t } from '../../lib/i18n.js'
import { fmtRest } from '../../lib/duration.js'

/** The sheet's `value` and `onDone`, moved onto `restSec` when its 0:00 means the default rest. */
export function restOpen({ value, off, onDone }, restSec) {
  if (value > 0 || !(restSec > 0) || off !== t('Default ({0})', fmtRest(restSec))) return { value, onDone }
  return { value: restSec, onDone: v => onDone(v === restSec ? 0 : v) }
}
