// Volume as tonnage or as sets per muscle group (hevier/DECISIONS.md D18). Tonnage is upstream's
// (`w.vol`, workoutVolume); this adds the sets count: each ticked work set once, for the exercise's
// main muscle, Hevy's way. Warm-ups are left out; a per-side or drop set is one set. Settings →
// Muscle sets (D42) can count a secondary muscle too, in part, with upstream's load.
import { EXIDX } from '../../lib/exercises.js'
import { loadOf, MUSCLE_NAME } from '../../lib/muscles.js'
import { hasCompletedWork, isWarmupRow } from '../../lib/workout-model.js'
import { muscleOf } from './exercise-picker.js'

/** 'sets' (the default) or 'weight', from Settings → Volume. */
export const volumeMode = S => (S?.hvVolume === 'weight' ? 'weight' : 'sets')

/** 'main' (the default): a set counts once, for its exercise's main muscle; 'share': a secondary
 *  muscle gets its part too, as upstream's Muscle balance counts it (D42). */
export const muscleMode = S => (S?.hvMuscleSets === 'share' ? 'share' : 'main')

const isWorkSet = s => hasCompletedWork(s) && !isWarmupRow(s)

/** Ticked work sets in a workout's (or a session's) entries. */
export const workSets = entries => (entries || []).reduce((n, e) => n + (e.sets || []).filter(isWorkSet).length, 0)

const tenth = v => Math.round(v * 10) / 10

/** Sets per muscle over `entries`, most first (then A to Z): [{ muscle, sets }], `muscle` being
 *  the name shown. Whole sets by main muscle, or with `mode` 'share' upstream's load (a
 *  secondary muscle in part, upstream's muscle names), to one decimal. */
export function muscleSets(entries, mode = 'main') {
  const by = new Map()
  const add = (muscle, n) => by.set(muscle, (by.get(muscle) || 0) + n)
  for (const e of entries || []) {
    const n = (e.sets || []).filter(isWorkSet).length
    if (!n) continue
    if (mode === 'share') {
      const load = loadOf([{ id: e.id, ex: e.exercise || e, sets: n }])
      for (const slug in load) add(MUSCLE_NAME[slug] || slug, load[slug])
    } else {
      // Cardio is no muscle group: its sets are left out of the main-muscle count.
      const ex = EXIDX[e.id]
      const muscle = ex?.tg === 'cardiovascular system' ? '' : muscleOf(ex)
      if (muscle) add(muscle, n)
    }
  }
  return [...by].map(([muscle, sets]) => ({ muscle, sets: tenth(sets) })).filter(r => r.sets > 0)
    .sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle))
}
