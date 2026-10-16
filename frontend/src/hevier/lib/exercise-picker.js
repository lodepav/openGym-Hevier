// The Hevy Add Exercise picker's list (hevier/PLAN.md M3; reference/SCREENS.md §8): one search,
// an equipment and a muscle filter, Recent Exercises on top. The search and the ranking are
// upstream's (lib/exercises.js searchExercises, lib/favourites.js); this only decides which
// exercises a filter keeps and what the muscle filter calls them.

// Hevy's muscle list over the catalogue's `tg` spellings and the ones a custom exercise stores
// (MUSCLES in lib/muscles.js). These labels are the filter's keys and its English text.
const MUSCLE_LABEL = {
  abs: 'Abdominals', obliques: 'Obliques', abductors: 'Abductors', adductors: 'Adductors',
  biceps: 'Biceps', calves: 'Calves', 'cardiovascular system': 'Cardio',
  pectorals: 'Chest', chest: 'Chest', forearms: 'Forearms', forearm: 'Forearms',
  glutes: 'Glutes', gluteal: 'Glutes', hamstrings: 'Hamstrings', hamstring: 'Hamstrings',
  lats: 'Lats', spine: 'Lower Back', 'lower-back': 'Lower Back', 'levator scapulae': 'Neck',
  quads: 'Quadriceps', quadriceps: 'Quadriceps', delts: 'Shoulders', deltoids: 'Shoulders',
  traps: 'Traps', trapezius: 'Traps', triceps: 'Triceps', 'upper back': 'Upper Back',
  'upper-back': 'Upper Back', 'serratus anterior': 'Serratus', serratus: 'Serratus',
  'hip-flexors': 'Hip Flexors', tibialis: 'Shins',
}

/** The muscle an exercise is filed under, '' when it has no target. */
export const muscleOf = ex => {
  const tg = ex && typeof ex.tg === 'string' ? ex.tg : ''
  return MUSCLE_LABEL[tg] || tg
}

/** The muscle filter's options: every muscle `list` has an exercise for, A to Z. */
export const muscleOptions = list => [...new Set(list.map(muscleOf).filter(Boolean))].sort()

/** The last `n` distinct exercises logged, newest first (upstream keeps `S.workouts` oldest first). */
export function recentIds(S, n = 10) {
  const out = []
  const ws = S?.workouts || []
  for (let i = ws.length - 1; i >= 0 && out.length < n; i--) {
    for (const e of ws[i].entries || []) {
      if (!out.includes(e.id)) out.push(e.id)
      if (out.length >= n) break
    }
  }
  return out
}

/**
 * What the filters keep: a muscle ('' = all), an equipment ('' = all) and `avail`, the active
 * equipment profile's test (null = show everything).
 */
export const filterPicker = (list, { muscle = '', eq = '', avail = null } = {}) => list.filter(e =>
  (!muscle || muscleOf(e) === muscle) && (!eq || e.eq === eq) && (!avail || avail(e)))
