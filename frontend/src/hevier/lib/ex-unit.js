// A weight unit per exercise (hevier/DECISIONS.md D41, closed at the 1.4.4 merge): one exercise
// shown and typed in lb while the profile is in kg (a machine with lb plates), or the other way
// round. Display only: every weight stays stored in the profile's unit, so the progression, sync,
// stats and backups see one unit. Since upstream 1.4.4 the choice is upstream's own pin (#657,
// `S.exUnit`, lib/ex-unit.js), so upstream's screens and the fork's show the same unit; the fork's
// `S.hvExUnit` moves into it once (migrateExUnits). The exercise's load step is kept in its own
// unit (45 → 50 → 55 lb) in upstream's per-exercise `inc`, from which the step is read back.
// The fork's own rounding of a shown weight (`shown`) stays until its screens read upstream's view.
import { LB_TO_KG } from '../../lib/recovery.js'
import { exUnitPin, withExUnit } from '../../lib/ex-unit.js'
import { defaultIncrement } from '../../lib/exercises.js'

const other = u => (u === 'lb' ? 'kg' : 'lb')

/** The steps offered in a unit, smallest first. */
export const STEPS = { lb: [2.5, 5, 10], kg: [1.25, 2.5, 5] }

/** The exercise's choice, `{ u, step }`, or null when it follows the profile: upstream's pin, and
 *  the step its configs' `inc` gives in that unit (null when none sets one). */
export function exUnitChoice(S, exId) {
  const u = exUnitPin(S, exId)
  if (!u || u === (S?.unit || 'kg')) return null
  const inc = configs(S, exId).map(c => c.inc).find(v => v > 0)
  const x = inc > 0 ? convert(inc, S.unit, u) : null
  const step = x == null ? null : STEPS[u].find(st => Math.abs(st - x) < 0.01) ?? null
  return { u, step }
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
  if (!s) return []
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
  const back = !unit || unit === s.unit
  const inc = back ? null : convert(step, unit, s.unit)
  // The step this set before, from the configs' `inc`: one of the offered steps in the pinned unit,
  // which is still the pin after the profile switched to that unit (upstream converted the `inc`).
  const pin = exUnitPin(s, exId)
  const prev = pin ? configs(s, exId).map(c => c.inc).find(v => v > 0) : null
  const prevIn = prev > 0 ? convert(prev, s.unit, pin) : null
  const wasInc = prevIn != null && STEPS[pin].some(st => Math.abs(st - prevIn) < 0.01) ? prev : null
  for (const c of configs(s, exId)) {
    const ours = wasInc != null && Math.abs((c.inc || 0) - wasInc) < 1e-9
    if (!(c.inc > 0) || ours) {
      if (inc != null) c.inc = inc
      else if (ours) delete c.inc
    }
  }
  // Upstream's pin, stamped; the way back is a stamped null (withExUnit), so it wins a sync.
  s.exUnit = withExUnit(s.exUnit, exId, back ? null : unit)
}

/**
 * Moves the fork's units (`S.hvExUnit`, `{ [exId]: { u } }`, before 1.4.4) into upstream's pin on
 * the store draft `s`, once: an exercise upstream already pins keeps upstream's choice. The configs'
 * `inc` the fork wrote stays as it is. Returns whether anything changed.
 */
export function migrateExUnits(s) {
  const old = s?.hvExUnit
  if (!old || typeof old !== 'object') return false
  for (const [id, c] of Object.entries(old)) {
    if (exUnitPin(s, id) || !c || (c.u !== 'kg' && c.u !== 'lb') || c.u === (s.unit || 'kg')) continue
    s.exUnit = withExUnit(s.exUnit, id, c.u)
  }
  delete s.hvExUnit
  return true
}

export function initExUnits(store) {
  const run = () => { if (store.get()?.hvExUnit) store.update(migrateExUnits) }
  run()
  store.watch(['hvExUnit'])?.(run)
}

/** The units an exercise can pick between: the profile's and the other one, with its steps. */
export const unitChoices = profile => ({ profile, alt: other(profile), steps: STEPS[other(profile)] })
