// A logged set as the fork writes it: upstream's setLabel words ("+10 × 12", "20 each × 8", drops,
// bursts, timed and cardio sets) with the sign spaced, "80 × 8", and the unit once where no column
// header names it, "80 kg × 8" (setFormat). The share cards keep Hevy's "60kg × 8 reps" (hevySetText).

import { setLabel } from '../../lib/history.js'
import { isSideSet } from '../../lib/workout-model.js'
import { fmtNum } from '../../lib/format.js'
import { elapsedClock } from './elapsed.js'
import { isHoldRow } from './hold-set.js'
import { setBandsOf } from '../../lib/bands.js'
import { mapSetWeights } from '../../lib/units.js'

const PLAIN = /^(\d[\d.,]*)×(\d+)( .+)?$/
const TIGHT = /(\d)×(?=\d)/g
// A weight is the number before a "×" with reps after it: "80 × 8", "+10 × 12", "20 each × 8";
// a band set's "15 × Red" is reps, so it has none.
const WEIGHT = /(\d[\d.,]*)( each| total)? × (?=\d)/g
// A timed or carried set's load behind its time or distance: "1:15 · 20", "40 m · 32 F".
const LOAD_AFTER = / · (\d[\d.,]*)(?=( F)?$)/

/**
 * The fork's one set format (the owner, 2026-11-17): upstream's "80×8" spaced as "80 × 8", and with
 * `unit` (where no KG/LB column header names it) the unit once after each weight: "80 kg × 8",
 * "+10 kg × 12", "1:15 · 20 kg". '' leaves the unit out.
 */
export function setFormat(text, unit = '') {
  const spaced = String(text).replace(TIGHT, '$1 × ')
  if (!unit) return spaced
  return spaced.replace(WEIGHT, `$1 ${unit}$2 × `).replace(LOAD_AFTER, ` · $1 ${unit}`)
}

/** A logged set in the fork's format: hevySetLabel's words, setFormat's spacing and unit. No weight
 *  entered reads "× 10", as previousText writes it, not "0 kg × 10". */
export const setText = (id, s, cfg, speedUnit, unit = '') => setFormat(hevySetLabel(id, s, cfg, speedUnit).replace(/^0×(?=\d)/, '× '), unit)

/** Sets in a row, each as text, as one line: each run in turn, its count leading, "3 × 60 × 8" or
 *  "2 × 80 × 8, 80 × 7", and a run without weight "3 × 10", not "3 × × 10" (the critique, 2026-11-20). */
export function setRuns(texts, lead = (n, v) => (v.startsWith('× ') ? n + ' ' + v : n + ' × ' + v)) {
  const runs = []
  for (const v of texts) {
    if (runs.at(-1)?.v === v) runs.at(-1).n++
    else runs.push({ v, n: 1 })
  }
  return runs.map(x => (x.n < 2 ? x.v : lead(x.n, x.v))).join(', ')
}

/**
 * Share cards' long form (the cards keep Hevy's words): "60×8" → "60kg × 8 reps", "60×8 F" → "60kg × 8 reps F", "300×1" → "300kg × 1 rep"; anything else
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
 * The workout's PREVIOUS cell for last time's set `p`, or for one side of it (`side`), in setFormat's
 * form: "60 kg × 8", "+10 kg × 8", or "× 12" on body weight or with no weight entered, "60 × 8" with `unit` '' (a table whose
 * header names it), '–' for none. A weight is written in the exercise's own unit (`unit`, `show`
 * converting a stored weight to it, D41). A timed, cardio, band or per-side set (without `side`)
 * reads as Workout Detail writes it, and so does a hold, for a side too.
 */
export function previousText(p, { side, mode, bw, unit, show = w => w, id, target, speedUnit }) {
  // No weight entered reads "× 10", as Today writes it, not "0 × 10".
  const weightReps = x => setFormat((!(x.w > 0) ? '× ' : bw ? `+${fmtNum(show(x.w))} × ` : `${fmtNum(show(x.w))} × `) + (x.r || 0), unit)
  const label = x => setText(id, mapSetWeights(x, w => show(w)), target, speedUnit, unit)
  if (side) {
    // A hold last time (D89): a per-side one is an L/R pair, its R carried on `hvPairR`.
    if (isHoldRow(p)) return label(side === 'R' && p.hvPairR ? p.hvPairR : p)
    const one = p && isSideSet(p) ? p.sides[side] : null
    return one ? weightReps(one) : '–'
  }
  if (!p) return '–'
  // A band set keeps its bands: "20 × 15 + Red" (upstream's words).
  if (mode !== 'reps' || isSideSet(p) || isHoldRow(p) || setBandsOf(p).length) return label(p)
  return weightReps(p)
}

/** Set `x` without its effort, a per-side set's sides too: for a page that shows effort apart. */
export const noEffort = x => {
  if (!x || typeof x !== 'object') return x
  const { rir, rpe, ...rest } = x
  return rest.sides ? { ...rest, sides: { L: noEffort(rest.sides.L), R: noEffort(rest.sides.R) } } : rest
}

/**
 * The live workout's PREVIOUS column (D127): previousText without the effort, so last time reads on
 * one line where it can, and a per-side set read whole as two lines, "L 15 × 15" over "R 15 × 15".
 */
export function previousCell(p, opts) {
  const text = previousText(noEffort(p), opts)
  return !opts.side && p && isSideSet(p) && !isHoldRow(p) ? text.replace(' · ', '\n') : text
}

