// "Don't count for progression" keeps an exercise out of the statistics too (D57). Upstream's
// switch (an exercise's ⋮, the workout's Settings, or a routine's own setting) stamps the logged
// entry `noProg`, or the whole workout `excludeFromProgression` (history.js `entryExcluded`), and
// only progression and "last time" read it. The fork's statistics read the log through
// `countedS`: every such entry left out, a workout with nothing left left out as a whole, and the
// volume of one that lost an entry worked out again. The workout's own pages (the live workout,
// Save Workout, Workout Detail, the feed card's numbers), the History tab of exercise details, the
// Calendar and the recovery map read the log as it is. A deload routine stamps `noProg` on every
// exercise it starts (session-start.js), but its workouts count (D57): an entry whose routine is
// still a deload routine is kept.
import { entryExcluded, entryRoutineId, workoutVolume } from '../../lib/history.js'

const byS = new WeakMap()

/**
 * `workouts` without the entries kept out of progression (the same array when none is).
 * `routines` tells a deload routine's entries apart, which are counted.
 */
export function countedWorkouts(workouts, routines = []) {
  if (!Array.isArray(workouts)) return []
  const deloads = new Set((routines || []).filter(r => r?.excludeFromProgression === true).map(r => r.id))
  const kept = (w, e) => !entryExcluded(w, e) || deloads.has(entryRoutineId(w, e))
  let changed = false
  const out = []
  for (const w of workouts) {
    const entries = Array.isArray(w?.entries) ? w.entries : []
    const left = entries.filter(e => kept(w, e))
    if (left.length === entries.length) { out.push(w); continue }
    changed = true
    if (!left.length) continue
    out.push({ ...w, entries: left, ...(Number.isFinite(w.vol) ? { vol: workoutVolume({ entries: left }) } : {}) })
  }
  return changed ? out : workouts
}

/** `S` with its workouts counted, the same object while nothing is kept out. Kept per copy of S. */
export function countedS(S) {
  if (!S || typeof S !== 'object') return S
  if (byS.has(S)) return byS.get(S)
  const ws = countedWorkouts(S.workouts, S.routines)
  const res = ws === S.workouts ? S : { ...S, workouts: ws }
  byS.set(S, res)
  return res
}
