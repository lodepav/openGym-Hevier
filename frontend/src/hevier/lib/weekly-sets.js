// Weekly sets per muscle against a target range, counted the fork's way (hevier/DECISIONS.md D99).
// The ranges and their editor are upstream 1.4.4's (lib/muscle-targets.js: ten groups, defaults from
// hypertrophy research, S.muscleTargets); the sets held against them are the fork's own count
// (D18, D42): each work set for its exercise's main muscle (D74), or a secondary muscle in part when
// Settings → Muscle sets says so. The fork's muscles fold into upstream's groups; a muscle with no
// group (forearms, lower back, neck…) has no range, as upstream's.
import { TARGET_MUSCLES, targetOf, statusOf, roundSets, mostRoom } from '../../lib/muscle-targets.js'
import { MUSCLE_NAME } from '../../lib/muscles.js'
import { weekKey, weekStartOf, todayISO } from '../../lib/format.js'
import { muscleSets, muscleMode } from './volume.js'

// The fork's main-muscle names (D74, Hevy's) in upstream's groups.
export const GROUP_OF = {
  Chest: 'chest', 'Upper Back': 'upper-back', Lats: 'upper-back', Traps: 'upper-back',
  Shoulders: 'deltoids', 'Front Delts': 'deltoids', 'Side Delts': 'deltoids', 'Rear Delts': 'deltoids',
  Biceps: 'biceps', Triceps: 'triceps', Quadriceps: 'quadriceps', Hamstrings: 'hamstring',
  Glutes: 'gluteal', Calves: 'calves', Abdominals: 'abs', Obliques: 'abs',
}
// With secondaries counted in part (D42), the names are upstream's muscle model's, so its own slug.
const SLUG_OF_NAME = Object.fromEntries(Object.entries(MUSCLE_NAME).map(([slug, name]) => [name, slug]))
const groupOf = (name, mode) => (mode === 'share' ? (TARGET_MUSCLES.includes(SLUG_OF_NAME[name]) ? SLUG_OF_NAME[name] : null) : GROUP_OF[name] || null)

/**
 * This week's sets per group against its range, as upstream's weeklyMuscleSets answers it:
 * `[{ slug, name, sets, lo, hi, status }]` in upstream's body order. `S` is the log the page reads
 * (the counted one, D57, and the phase's, D93).
 */
export function forkWeeklySets(S, today = todayISO()) {
  const ws = weekStartOf(S)
  const wk = weekKey(today, ws)
  const entries = (S?.workouts || []).filter(w => w && weekKey(w.d, ws) === wk).flatMap(w => w.entries || [])
  const mode = muscleMode(S)
  const by = {}
  for (const r of muscleSets(entries, mode)) {
    const g = groupOf(r.muscle, mode)
    if (g) by[g] = (by[g] || 0) + r.sets
  }
  return TARGET_MUSCLES.map(slug => {
    const [lo, hi] = targetOf(S, slug)
    const sets = roundSets(by[slug] || 0)
    return { slug, name: MUSCLE_NAME[slug], sets, lo, hi, status: statusOf(sets, [lo, hi]) }
  })
}

export { mostRoom }
