// "Don't count for progression" keeps an exercise out of the statistics too (D57). Upstream's
// switch (an exercise's ⋮, the workout's Settings, or a routine's own setting) stamps the logged
// entry `noProg`, or the whole workout `excludeFromProgression` (history.js `entryExcluded`), and
// only progression and "last time" read it. The fork's statistics read the log through
// `countedS`: every such entry left out, a workout with nothing left left out as a whole, and the
// volume of one that lost an entry worked out again. The workout's own pages (the live workout,
// Save Workout, Workout Detail, the feed card's numbers), the History tab of exercise details, the
// Calendar and the recovery map read the log as it is.
import { entryExcluded, workoutVolume } from '../../lib/history.js'

const byList = new WeakMap()
const byS = new WeakMap()

/** `workouts` without the entries kept out of progression (the same array when none is). */
export function countedWorkouts(workouts) {
  if (!Array.isArray(workouts)) return []
  if (byList.has(workouts)) return byList.get(workouts)
  let changed = false
  const out = []
  for (const w of workouts) {
    const entries = Array.isArray(w?.entries) ? w.entries : []
    const kept = entries.filter(e => !entryExcluded(w, e))
    if (kept.length === entries.length) { out.push(w); continue }
    changed = true
    if (!kept.length) continue
    out.push({ ...w, entries: kept, ...(Number.isFinite(w.vol) ? { vol: workoutVolume({ entries: kept }) } : {}) })
  }
  const res = changed ? out : workouts
  byList.set(workouts, res)
  return res
}

/** `S` with its workouts counted, the same object while nothing is kept out. Kept per copy of S. */
export function countedS(S) {
  if (!S || typeof S !== 'object') return S
  if (byS.has(S)) return byS.get(S)
  const ws = countedWorkouts(S.workouts)
  const res = ws === S.workouts ? S : { ...S, workouts: ws }
  byS.set(S, res)
  return res
}
