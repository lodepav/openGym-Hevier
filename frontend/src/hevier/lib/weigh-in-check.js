// Seam S72 in sheets.jsx BwSheet (the tenth critique, 2026-11-22): a new weigh-in far off the last one
// asks before it is saved, as D90 asks before a mistyped set is ticked: 805 for 80.5 landed in the
// chart, the goal gap and OpenBite's feedback. Fix it keeps the sheet open to correct; Save saves as
// typed; a tap outside saves nothing. Weights are in the profile's unit, as upstream stores them, so
// the share needs no conversion. Off in upstream's build (HEVIER), so its own tests save as before.
import { HEVIER } from '../flag.js'
import { t } from '../../lib/i18n.js'
import { fmtNum } from '../../lib/format.js'

const ODD = 0.15

/** The share `n` is off `last` (0.18 for 18 %) when it is more than 15 %, else null; null without a last weigh-in. */
export function weighInOff(n, last) {
  const a = Number(n), b = Number(last)
  if (!(a > 0) || !(b > 0)) return null
  const off = Math.abs(a - b) / b
  return off > ODD ? off : null
}

/** confirmSheet's options asking about `n` against the last weigh-in, `onSave` saving it as typed; null when it looks right. */
export function weighInAsk(n, last, unit, onSave, on = HEVIER) {
  const off = on ? weighInOff(n, last) : null
  if (off == null) return null
  const w = x => fmtNum(x) + ' ' + unit
  return {
    title: t('Is that right?'),
    message: t('{0} is {1}% off your last weigh-in, {2}. Save it?', w(n), Math.round(off * 100), w(last)),
    confirmText: t('Fix it'), cancelText: t('Save'), onCancel: onSave,
  }
}
