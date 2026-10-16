// Volume as tonnage or as sets per muscle group (hevier/DECISIONS.md D18). Tonnage is upstream's
// (`w.vol`, workoutVolume); this adds the sets count: each ticked work set once, for the exercise's
// main muscle, Hevy's way. Warm-ups are left out; a per-side or drop set is one set.
import { EXIDX } from '../../lib/exercises.js'
import { hasCompletedWork, isWarmupRow } from '../../lib/workout-model.js'
import { muscleOf } from './exercise-picker.js'

/** 'sets' (the default) or 'weight', from Settings → Volume. */
export const volumeMode = S => (S?.hvVolume === 'weight' ? 'weight' : 'sets')

const isWorkSet = s => hasCompletedWork(s) && !isWarmupRow(s)

/** Ticked work sets in a workout's (or a session's) entries. */
export const workSets = entries => (entries || []).reduce((n, e) => n + (e.sets || []).filter(isWorkSet).length, 0)

/** Sets per main muscle over `entries`, most first (then A to Z): [{ muscle, sets }]. */
export function muscleSets(entries) {
  const by = new Map()
  for (const e of entries || []) {
    const muscle = muscleOf(EXIDX[e.id])
    const n = (e.sets || []).filter(isWorkSet).length
    if (muscle && n) by.set(muscle, (by.get(muscle) || 0) + n)
  }
  return [...by].map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle))
}
