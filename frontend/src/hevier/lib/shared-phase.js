// OpenBite's phase on a saved workout (hevier/DECISIONS.md D93). OpenBite, the fork's nutrition app,
// shares whether you are cutting, maintaining or bulking; it keeps no history of it, so Save Workout
// writes the phase of the day on the record, and the record is the history. It is for reading the
// log back only: nothing that decides a set or a progression reads it.

export const PHASES = ['cutting', 'maintaining', 'bulking']
export const PHASE_LABEL = { cutting: 'Cutting', maintaining: 'Maintaining', bulking: 'Bulking' }

// OpenBite refreshes its row each time its Home loads. A row older than this is an app no longer in use.
const STALE_MS = 14 * 24 * 3600 * 1000

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** What a workout saved now should carry for OpenBite's row: { p, r?, k? }, or null for no phase. */
export function phaseFromRow(row, now = Date.now()) {
  if (!row || !PHASES.includes(row.phase)) return null
  const at = num(row.updated_at)
  if (at == null || now - at > STALE_MS) return null
  const r = num(row.rate_kg_per_week)
  const k = num(row.target_kcal)
  return { p: row.phase, ...(r != null ? { r } : {}), ...(k != null ? { k } : {}) }
}

/** The saved workout `w` with `phase` on it (`w` itself without one). */
export const withPhase = (w, phase) => (w && phase ? { ...w, hvPhase: phase } : w)

/** The phase a saved workout was done in, or null: before OpenBite shared one, or an import. */
export function workoutPhase(w) {
  const p = w?.hvPhase?.p
  return PHASES.includes(p) ? p : null
}

/**
 * The current phase of a log sorted oldest first: `{ phase, run }`, the phase of the latest workout
 * that has one and that phase's workouts back to one done in another phase, or null when no workout
 * has a phase. A workout without one (a backfill, a finish without Save Workout) is not in the run
 * and does not end it.
 */
export function phaseRun(log) {
  const list = Array.isArray(log) ? log : []
  let i = list.length - 1
  while (i >= 0 && !workoutPhase(list[i])) i--
  if (i < 0) return null
  const phase = workoutPhase(list[i])
  const run = []
  for (; i >= 0; i--) {
    const p = workoutPhase(list[i])
    if (p === phase) run.push(list[i])
    else if (p) break
  }
  return { phase, run: run.reverse() }
}

/** The phases the log has workouts in, in PHASES' order. */
export function phasesIn(workouts) {
  const seen = new Set((Array.isArray(workouts) ? workouts : []).map(workoutPhase))
  return PHASES.filter(p => seen.has(p))
}

const byS = new WeakMap()

/**
 * `S` with only the workouts done in `phase`. `S` itself for no phase, or for one the log has no
 * workouts in, so a filter left on a phase whose last workout went reads as All. Kept per copy of S
 * and phase, so a page's memos hold.
 */
export function phasedS(S, phase) {
  if (!phase || !S || typeof S !== 'object') return S
  let perPhase = byS.get(S)
  if (!perPhase) byS.set(S, perPhase = {})
  if (phase in perPhase) return perPhase[phase]
  const list = Array.isArray(S.workouts) ? S.workouts : []
  const workouts = list.filter(w => workoutPhase(w) === phase)
  return (perPhase[phase] = workouts.length ? { ...S, workouts } : S)
}
