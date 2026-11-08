// The rows a past session shows, each with its mark: W for a warm-up, H for a timed hold (D89),
// else its number. A hold is a work set, but like a warm-up it reads by its letter, so the rep
// sets keep counting 1, 2, 3 around it (user, 2026-11-02: "use H for holds, like W for warm-ups").
//
// The exercise's History reads upstream's exerciseHistory, which keeps one mode per session: a
// reps exercise's session lists its rep sets only, so a set made a hold (D89, `mode: 'time'`)
// was not shown there at all. historyRows puts the holds back in the order they were done.
import { entriesForExercise, metricModeForEntry } from '../../lib/history.js'
import { hasCompletedWork, isWarmupRow, modeForSet } from '../../lib/workout-model.js'
import { isHoldRow, isPairTail } from './hold-set.js'

const objectOf = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

/** Row `i`'s mark in `rows`: 'W', 'H', '' for the R half of an L/R hold pair, else its number
 *  among the work sets that are not holds, an L/R pair one set. */
export function setMark(rows, i) {
  const s = rows?.[i]
  if (!s) return ''
  if (isWarmupRow(s)) return 'W'
  if (isPairTail(rows, i)) return ''
  if (isHoldRow(s)) return 'H'
  let n = 0
  for (let j = 0; j <= i; j++) {
    const x = rows[j]
    if (!isWarmupRow(x) && !isPairTail(rows, j) && !isHoldRow(x)) n++
  }
  return n
}

/**
 * The sets one session of the exercise's History lists: `session` is one of exerciseHistory's
 * (its `sets` already read in the exercise's dumbbell meaning, so they are kept as they are), `w`
 * its saved workout. The holds of a reps session, which exerciseHistory leaves out, go back in
 * where they were done. Returns [{ s, target }], each row with the target to label it by. Without
 * the workout the session's own sets come back unchanged.
 */
export function historyRows(w, exId, session) {
  const own = (session?.sets || []).map(s => ({ s, target: session.target }))
  if (!w || session?.mode !== 'reps') return own
  const queue = [...own]
  const out = []
  for (const en of entriesForExercise(w, exId)) {
    const target = objectOf(en.target || en)
    const entryMode = metricModeForEntry(en)
    for (const s of Array.isArray(en.sets) ? en.sets : []) {
      if (!hasCompletedWork(s) || isWarmupRow(s)) continue
      if (isHoldRow(s)) out.push({ s, target: { ...target, mode: 'time' } })
      else if (entryMode === 'reps' && modeForSet(s, target) === 'reps' && queue.length) out.push(queue.shift())
    }
  }
  // Anything the walk could not place (a session read some other way) still shows, at the end.
  return out.concat(queue)
}
