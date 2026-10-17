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

/**
 * Where the exercises just added sit, for "Add superset": the index of the first, when the
 * `ids.length` items ending at `end` are those exercises in that order; else -1, and nothing is
 * linked (the caller placed them some other way).
 */
export function addedRun(items, end, ids) {
  const first = end - ids.length + 1
  if (ids.length < 2 || first < 0 || end >= (items?.length || 0)) return -1
  return ids.every((id, k) => items[first + k]?.id === id) ? first : -1
}

// D36 (hevier/DECISIONS.md): the brand labels of machine exercises (D28) are searchable. "Life Fitness", "lifefitness"
// and "life fit" all reach a leg press labelled Life Fitness; words that are not part of a brand
// then narrow by the exercise's name with upstream's search, so "life fitness press" keeps the
// presses. Two letters at least make a brand word, so a stray "a" does not match every brand.
const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '')

/** `{ [exId]: [brand, …] }`: every brand an exercise carries, as a default or on a logged set. */
export function brandsByExercise(S) {
  const out = {}
  const add = (id, b) => { if (id && b && !(out[id] ||= []).includes(b)) out[id].push(b) }
  for (const [id, byGym] of Object.entries(S?.hvMachines || {})) for (const b of Object.values(byGym || {})) add(id, b)
  for (const w of S?.workouts || []) for (const e of w?.entries || []) add(e?.id, e?.hvBrand)
  return out
}

/**
 * The exercises of `list` a query reaches through a brand, in `list`'s order, with the brand that
 * matched: `[{ ex, brand }]`. `search(list, q)` is upstream's name search, for the other words.
 */
export function brandMatches(list, brands, q, search) {
  const words = String(q || '').trim().split(/\s+/).map(norm).filter(Boolean)
  const whole = norm(q)
  if (whole.length < 2) return []
  const out = []
  for (const ex of list) {
    for (const brand of brands[ex.id] || []) {
      const b = norm(brand)
      if (b.includes(whole)) { out.push({ ex, brand }); break }
      const rest = words.filter(w => w.length < 2 || !b.includes(w))
      if (rest.length === words.length) continue
      if (!rest.length || search([ex], rest.join(' ')).length) { out.push({ ex, brand }); break }
    }
  }
  return out
}
