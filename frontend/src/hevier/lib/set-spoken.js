// A set as TalkBack should say it: "80 kg × 8" is read as letters and a sign, so the plain weight
// and reps set becomes "80 kilograms, 8 reps" (the ninth audit, 2026-11-22). Drops, bands, timed,
// cardio and "each" sets keep their written form; each line of a per-side set is read on its own.
import { t } from '../../lib/i18n.js'

const PLAIN = /^([LR] )?(\+)?(\d[\d.,]*) (kg|lb) × (\d+)$/
const REPS = /^([LR] )?× (\d+)$/

const reps = n => (n === 1 ? t('{0} rep', 1) : t('{0} reps', n))
const weight = (w, unit) => (unit === 'lb' ? (w === '1' ? t('{0} pound', w) : t('{0} pounds', w))
  : w === '1' ? t('{0} kilogram', w) : t('{0} kilograms', w))

/** "80 kg × 8" → "80 kilograms, 8 reps", "+10 kg × 12" → "plus 10 kilograms, 12 reps", "× 10" →
 *  "10 reps"; anything else as written. Lines ("\n") come back joined with ", ". */
export function spokenSet(text) {
  return String(text).split('\n').map(line => {
    const m = PLAIN.exec(line)
    if (m) return (m[1] || '') + (m[2] ? t('plus {0}', weight(m[3], m[4])) : weight(m[3], m[4])) + ', ' + reps(Number(m[5]))
    const r = REPS.exec(line)
    return r ? (r[1] || '') + reps(Number(r[2])) : line
  }).join(', ')
}

/** 1RM spelt out for TalkBack: "Best 1RM" → "Best one rep max". */
export const spoken1rm = text => String(text).replace(/\b1RM\b/g, t('one rep max'))
