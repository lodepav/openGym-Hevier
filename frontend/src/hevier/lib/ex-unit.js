// A weight unit per exercise (hevier/DECISIONS.md D41): one exercise shown and typed in lb while
// the profile is in kg (a machine with lb plates), or the other way round. Display only: every
// weight stays stored in the profile's unit, converted unrounded from what is typed, so the
// progression, sync, stats and backups see one unit. The exercise's load step is kept in its own
// unit (45 → 50 → 55 lb) by writing it, converted, into upstream's per-exercise `inc`.
import { LB_TO_KG } from '../../lib/recovery.js'
import { defaultIncrement } from '../../lib/exercises.js'

const other = u => (u === 'lb' ? 'kg' : 'lb')

/** The steps offered in a unit, smallest first. */
export const STEPS = { lb: [2.5, 5, 10], kg: [1.25, 2.5, 5] }

/** The exercise's choice, `{ u, step, inc }`, or null when it follows the profile. */
export function exUnitChoice(S, exId) {
  const c = S?.hvExUnit?.[exId]
  return c && c.u && c.u !== S.unit ? c : null
}

/** The unit an exercise is shown and typed in. */
export const exUnitOf = (S, exId) => exUnitChoice(S, exId)?.u || S?.unit || 'kg'

/** A weight in `from` as `to`, unrounded. */
export function convert(v, from, to) {
  if (v == null || v === '' || from === to) return v
  const n = Number(v)
  return from === 'lb' ? n * LB_TO_KG : n / LB_TO_KG
}

// The plate grid a shown weight snaps onto: the smallest step offered in the unit.
const GRID = { lb: 2.5, kg: 1.25 }

/** A stored weight as the exercise shows it: to the hundredth, and onto the unit's plate grid
 *  where it is within a progression's rounding to a tenth of the profile's unit (45 lb stored
 *  as 20.4 kg reads 45, not 44.97; 20 kg still reads 44.09 lb). */
export function shown(v, profile, unit) {
  if (v == null || v === '' || profile === unit) return v
  const x = convert(v, profile, unit)
  const g = GRID[unit]
  const on = Math.round(x / g) * g
  return Math.abs(x - on) <= convert(0.05, profile, unit) + 1e-9 ? on : Math.round(x * 100) / 100
}

/** The step offered first when an exercise switches to `unit`: 5 lb (2.5 for a small lift), or
 *  2.5 kg (1.25). */
export function defaultStep(exId, unit) {
  const heavy = defaultIncrement(exId, other(unit)) >= (unit === 'lb' ? 5 : 10)
  return unit === 'lb' ? (heavy ? 5 : 2.5) : (heavy ? 2.5 : 1.25)
}

// Every config of the exercise that carries an `inc`: the open session's targets and the
// routines' exercises.
function configs(s, exId) {
  const out = []
  for (const e of s.active?.entries || []) if (e?.id === exId && e.target) out.push(e.target)
  for (const r of s.routines || []) for (const c of r.ex || []) if (c?.id === exId) out.push(c)
  return out
}

/**
 * Sets an exercise's unit and step on the state draft `s`: `unit` the profile's (or null) puts it
 * back. The step goes into each config's `inc` that is unset or that this did set before, never
 * over one the user chose in upstream's exercise settings.
 */
export function setExUnit(s, exId, unit, step) {
  const was = s.hvExUnit?.[exId]
  const back = !unit || unit === s.unit
  const inc = back ? null : convert(step, unit, s.unit)
  for (const c of configs(s, exId)) {
    const ours = was?.inc != null && Math.abs((c.inc || 0) - was.inc) < 1e-9
    if (!(c.inc > 0) || ours) {
      if (inc != null) c.inc = inc
      else if (ours) delete c.inc
    }
  }
  if (back) {
    if (s.hvExUnit) delete s.hvExUnit[exId]
    return
  }
  s.hvExUnit = { ...(s.hvExUnit || {}), [exId]: { u: unit, step, inc } }
}

/** The units an exercise can pick between: the profile's and the other one, with its steps. */
export const unitChoices = profile => ({ profile, alt: other(profile), steps: STEPS[other(profile)] })
