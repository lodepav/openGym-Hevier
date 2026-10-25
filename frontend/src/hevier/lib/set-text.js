// A logged set as Hevy's Workout Detail writes it: "60kg × 8 reps", where upstream's setLabel
// writes "60×8". Only that plain form is rewritten; every other one (body weight "+10 × 12",
// dumbbells "20 each × 8", drops, bursts, timed and cardio sets) keeps upstream's words.

import { setLabel } from '../../lib/history.js'
import { isSideSet } from '../../lib/workout-model.js'
import { fmtNum } from '../../lib/format.js'
import { elapsedClock } from './elapsed.js'
import { isHoldRow } from './hold-set.js'

const PLAIN = /^(\d[\d.,]*)×(\d+)( .+)?$/

/**
 * "60×8" → "60kg × 8 reps", "60×8 F" → "60kg × 8 reps F", "300×1" → "300kg × 1 rep"; anything else
 * unchanged. `reps(n)` writes the count with its word, translated by the caller.
 */
export function hevySetText(label, unit, reps = n => n + (n === 1 ? ' rep' : ' reps')) {
  const m = PLAIN.exec(String(label))
  if (!m) return label
  return `${m[1]}${unit} × ${reps(Number(m[2]))}${m[3] || ''}`
}

const CARDIO = /^(\d[\d.]*) min @ /

/**
 * Upstream's setLabel with a cardio set's time as a clock (D53): "12.5666… min @ 8 km/h" reads
 * "12:34 @ 8 km/h", "20 min @ 8 km/h" "20:00 @ 8 km/h", and with no speed the clock alone. Every other set reads as upstream writes it.
 */
export function hevySetLabel(id, s, cfg, speedUnit) {
  const label = setLabel(id, s, cfg, speedUnit)
  // No speed logged (a bike, an import) reads "15:18", not "15:18 @ 0 km/h".
  const text = label.replace(CARDIO, (_, min) => elapsedClock(Math.round(Number(min) * 60)) + ' @ ')
  return Number(s?.speed) > 0 ? text : text.replace(/ @ [^·]*?(?= · |$)/, '')
}

/**
 * The workout's PREVIOUS cell for last time's set `p`, or for one side of it (`side`): "60kg × 8",
 * "+10kg × 8" or "× 12" on body weight, '–' for none. A weight is written in the exercise's own
 * unit (`unit`, `show` converting a stored weight to it, D41). A timed, cardio or per-side set
 * (without `side`) reads as Workout Detail writes it.
 */
export function previousText(p, { side, mode, bw, unit, show = w => w, id, target, speedUnit }) {
  const weightReps = x => (bw ? (x.w > 0 ? `+${fmtNum(show(x.w))}${unit} × ` : '× ') + (x.r || 0)
    : `${fmtNum(show(x.w || 0))}${unit} × ${x.r || 0}`)
  if (side) {
    const one = p && isSideSet(p) ? p.sides[side] : null
    return one ? weightReps(one) : '–'
  }
  if (!p) return '–'
  if (mode !== 'reps' || isSideSet(p) || isHoldRow(p)) return hevySetLabel(id, p, target, speedUnit)
  return weightReps(p)
}
