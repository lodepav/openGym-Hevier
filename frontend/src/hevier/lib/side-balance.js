// Left against right for an exercise logged per side (set.sides = { L, R }), one line on exercise
// details' Summary. Each session holds its sides' best estimated 1RM (upstream's estimate1RM, the
// formula the Summary's own 1RM uses) against each other, so a session on another machine (D82)
// is only ever held against itself. `sessions` are exerciseSummary's: counted (D57), newest first.
// shortcut: the second side is done tired and this is not corrected, revisit if the line misleads
import { estimate1RM } from '../../lib/onerm.js'
import { isSideSet } from '../../lib/workout-model.js'
import { isAssisted } from '../../lib/exercises.js'

const bestOf = sides => sides.filter(p => p?.done === true)
  .reduce((best, p) => Math.max(best, estimate1RM(p.w, p.r, undefined, p.rir ?? null) || 0), 0)

/**
 * { even, side: 'L' | 'R', pct, n } over the last `last` sessions with both sides estimated, the
 * stronger side's lead in whole percent (even within `within`); null under `min` such sessions.
 */
export function sideBalance(sessions, exId, { last = 5, min = 3, within = 3 } = {}) {
  // An assistance machine's load is help, no strength to compare (onerm.js bestSetOf).
  if (isAssisted(exId)) return null
  const ratios = []
  for (const s of sessions || []) {
    if (ratios.length >= last) break
    if (s?.mode !== 'reps') continue
    const rows = (s.sets || []).filter(isSideSet)
    const L = bestOf(rows.map(x => x.sides.L)), R = bestOf(rows.map(x => x.sides.R))
    if (L > 0 && R > 0) ratios.push(R / L)
  }
  if (ratios.length < min) return null
  const r = ratios.reduce((a, b) => a + b, 0) / ratios.length
  const pct = Math.round(((r >= 1 ? r : 1 / r) - 1) * 100)
  return { even: pct <= within, side: r >= 1 ? 'R' : 'L', pct, n: ratios.length }
}
