// The value columns of the Hevy workout table (components/HevyExerciseBlock.jsx), in upstream's
// set fields (views/Workout.jsx col1–col3) and Hevy's order: KG · REPS, KG · TIME for a timed hold,
// TIME · speed (· incline) for cardio. A column is { f: the set's field, hd: its header, label:
// for screen readers, dec: takes decimals, dur: a clock (D53), opt: may stay empty, view / store:
// the shown value from the stored one and back }.
import { t } from '../../lib/i18n.js'
import { weightDecimals } from '../../lib/format.js'
import { toSpeed, fromSpeed } from '../../lib/speed.js'
import { clampIncline, hasIncline, inclineFits } from '../../lib/incline.js'
import { shown, convert } from './ex-unit.js'

/**
 * `unit` is the profile's, `exUnit` the one this exercise is shown and typed in (D41); `perStack`
 * a cable on two stacks, typed per stack (D43); `ex` and `sets` decide cardio's incline column.
 */
export function setColumns({ mode, bw, perStack, unit, exUnit = unit, speedUnit, ex, sets = [] }) {
  const weight = {
    f: 'w', dec: true, hd: (bw ? '+' : '') + exUnit.toUpperCase() + (perStack ? ' ×2' : ''),
    label: perStack ? t('Weight per stack ({0})', exUnit) : t('Weight ({0})', exUnit),
    ...(exUnit !== unit ? { view: v => shown(v, unit, exUnit), store: v => convert(v, exUnit, unit) } : {}),
  }
  if (mode === 'time') return [weight, { f: 'sec', dur: true, hd: t('TIME'), label: t('Time') }]
  if (mode !== 'cardio') return [weight, { f: 'r', dec: false, hd: t('REPS'), label: t('Reps') }]
  const mph = speedUnit === 'mph'
  return [
    { f: 'min', dur: true, hd: t('TIME'), label: t('Time') },
    { f: 'speed', dec: true, hd: mph ? t('MPH') : t('KM/H'), label: mph ? t('Speed (mph)') : t('Speed (km/h)'),
      view: v => toSpeed(v, speedUnit), store: v => fromSpeed(v, speedUnit) },
    (inclineFits(ex) || sets.some(hasIncline)) && { f: 'incline', dec: true, opt: true, hd: t('INCL %'), label: t('Incline (%)'), store: clampIncline },
  ].filter(Boolean)
}

/** A column's number as it is shown: cardio speed is stored in km/h and shown in the profile's unit. */
export const viewOf = (col, v) => (col.view && v != null && v !== '' ? col.view(v) : v)

/** A column's number in its box. A weight shown in the exercise's other unit (D41) goes to the
 *  places PREVIOUS shows (fmtNum's), so 50 kg reads 110.2 lb in both, not 110.23 (the sixth audit,
 *  2026-11-22). A `typed` weight keeps its places. Display only. */
export function boxOf(col, v, typed, places = weightDecimals()) {
  const x = viewOf(col, v)
  if (col.f !== 'w' || !col.view || typed || x == null || x === '' || !Number.isFinite(Number(v))) return x
  const p = 10 ** places
  return Math.round(Number(x) * p) / p
}

/** A stored weight past the hundredth, as one typed in the other unit is (to four, upstream's
 *  storedWeight): the routine editor's sign of a typed weight, which keeps no other mark. */
// shortcut: a two-place lb weight whose kg lands on the hundredth reads rounded in the editor; mark typed routine weights if that is seen.
export const pastHundredth = v => Number.isFinite(Number(v)) && Math.abs(Number(v) * 100 - Math.round(Number(v) * 100)) > 1e-6
