// The one muscle an exercise is filed and counted under (hevier/DECISIONS.md D74): the picker's
// muscle filter, the sets per muscle (D18), exercise details' Primary line. The catalogue's
// target (`tg`) is often not the muscle the lift is known for: every squat, lunge and leg press
// says glutes, a high row upper back, a twist abs. Upstream draws its body maps from its own
// muscle model (lib/muscles.js, the catalogue's `primaries`), which is left as it is; this only
// picks the main one, in this order: a custom exercise's own primary muscle, the name rules
// below, the target (upstream's `primaries` lists its main muscles unordered, so it is read only
// when there is no target). A shoulder exercise is then one of
// D65's heads when its name says which. Nothing is stored.
import { matchExercise, matchHevyTitle } from '../../lib/import-csv.js'
import { EXIDX, isCustomEx, smOf } from '../../lib/exercises.js'
import { muscleWeightsOf } from '../../lib/muscles.js'
import { headOf, HEAD_NAME } from './delt-heads.js'

// Hevy's muscle names over the catalogue's `tg` spellings, upstream's muscle slugs (a custom
// exercise's `primaries`, the catalogue's muscle model) and the ones a custom exercise stores.
const LABEL = {
  abs: 'Abdominals', obliques: 'Obliques', abductors: 'Abductors', adductors: 'Adductors',
  biceps: 'Biceps', calves: 'Calves', 'cardiovascular system': 'Cardio',
  pectorals: 'Chest', chest: 'Chest', forearms: 'Forearms', forearm: 'Forearms',
  glutes: 'Glutes', gluteal: 'Glutes', hamstrings: 'Hamstrings', hamstring: 'Hamstrings',
  lats: 'Lats', spine: 'Lower Back', 'lower-back': 'Lower Back', 'levator scapulae': 'Neck',
  quads: 'Quadriceps', quadriceps: 'Quadriceps', delts: 'Shoulders', deltoids: 'Shoulders',
  traps: 'Traps', trapezius: 'Traps', triceps: 'Triceps', 'upper back': 'Upper Back',
  'upper-back': 'Upper Back', 'serratus anterior': 'Serratus', serratus: 'Serratus',
  'hip-flexors': 'Hip Flexors', tibialis: 'Shins',
  // Secondary spellings exercise details shows (`sm`).
  shoulders: 'Shoulders', 'rear deltoids': 'Rear Delts', 'latissimus dorsi': 'Lats', rhomboids: 'Upper Back',
  'lower back': 'Lower Back', 'hip flexors': 'Hip Flexors', core: 'Abdominals', abdominals: 'Abdominals',
}
export const muscleLabel = tg => (typeof tg === 'string' ? LABEL[tg] || tg : '')

// Each rule: the targets it may change, the name it reads, the muscle it gives. The first that
// matches wins, so the narrower come first (a glute-dominant step-up before step-ups).
const LEGS = ['glutes', 'quads', 'hamstrings', 'spine']
const BACK = ['lats', 'upper back', 'traps']
const RULES = [
  [LEGS, /hamstring|bridge curl|glute[- ]ham raise|romanian|\brdl\b|stiff[- ]leg|straight[- ]legs? deadlift|good ?morning|(single|one)[- ]leg (romanian )?deadlift|kickstand|leg curl|hamstring curl|nordic/i, 'Hamstrings'],
  [LEGS, /hip thrust|glute(?![- ]ham)|bridge|kick ?back|donkey|clam|hip extension|pull[- ]?through|reverse hyper|reverse leg extension|fire hydrant|rear kick|curt?s[e]?y|sumo\b.*squat|lunge|step[- ]?up/i, 'Glutes'],
  [LEGS, /squat|leg press|hack|sissy|leg extension|wall sit/i, 'Quadriceps'],
  [BACK, /rear delt/i, HEAD_NAME.rear],
  // A shrug that moves the shoulder blades back or down rather than up is the upper back's: a
  // Kelso (chest-supported, squeezed together), a horizontal one, and the body-weight ones that
  // hang or dip (the scapular pull-up's and the scapula dip's movement).
  [BACK, /kelso|retraction shrug|horizontal shrug|hanging scapular shrug|inverted shrug|shrug \(on parallel bars\)/i, 'Upper Back'],
  [BACK, /shrug/i, 'Traps'],
  [BACK, /scapul/i, 'Upper Back'],
  [BACK, /high row|lats? focused|kayak|pull[- ]?down|pull[- ]?ups?\b|chin[- ]?up|pull[- ]?over|straight[- ]arm|lat pushdown|muscle[- ]?up/i, 'Lats'],
  [BACK, /\brow\b/i, 'Upper Back'],
  [['biceps'], /wrist curl/i, 'Forearms'],
  [['traps'], /\bneck\b/i, 'Neck'],
  [['abs'], /oblique|twist|side bend|russian|wood ?chop|windmill|side plank|side bridge|side crunch|side jackknife/i, 'Obliques'],
]

// `anyTarget`: for a custom exercise with no muscles, whose name alone is to go by.
const ruleFor = (ex, anyTarget = false) => {
  const n = String(ex.n || ex.name || '')
  for (const [tgs, re, muscle] of RULES) if ((anyTarget || tgs.includes(ex.tg)) && re.test(n)) return muscle
  return ''
}

// A custom exercise made with no muscles (an import's) is filed as the catalogue exercise its
// name finds, its brand bracket left out; one that finds none is filed by the name rules alone
// (a "Kelso Shrug"), else has no main muscle.
const guessed = new Map()
const byName = ex => {
  const n = String(ex.n || '')
  if (!guessed.has(n)) {
    const bare = n.replace(/\s*\([^)]*\)\s*$/, '')
    const id = matchHevyTitle(n) || matchExercise(n) || (bare !== n ? matchHevyTitle(bare) || matchExercise(bare) : null)
    const hit = id && EXIDX[id]
    guessed.set(n, hit && !isCustomEx(hit) ? mainMuscleOf(hit) : ruleFor(ex, true))
  }
  return guessed.get(n)
}

const first = xs => (Array.isArray(xs) && xs.length ? xs[0] : '')

/** The main muscle of `ex` under Hevy's names ('Quadriceps', 'Side Delts', …), '' when none. */
export function mainMuscleOf(ex) {
  if (!ex || typeof ex !== 'object') return ''
  const custom = ex.custom || isCustomEx(ex)
  const muscle = custom
    ? muscleLabel(first(ex.primaries) || ex.tg) || byName(ex)
    : ruleFor(ex) || muscleLabel(ex.tg) || muscleLabel(first(ex.primaries))
  if (muscle !== 'Shoulders') return muscle
  const head = headOf({ ...ex, tg: 'delts' })
  return head ? HEAD_NAME[head] : muscle
}

const isHead = m => /Delts$/.test(m)
const same = (main, m) => m === main || (isHead(main) && m === 'Shoulders')

/**
 * Exercise details' Primary and Secondary lines (Hevy's): the main muscle, then the other muscles
 * upstream's model lists for the exercise, its other main ones first, at most three, each once
 * (as upstream's detailTags lists them).
 * Names the fork has none for are left to the caller (`other`, upstream's own wording).
 */
export function musclesShown(ex, other = s => s) {
  const primary = mainMuscleOf(ex)
  const name = s => LABEL[s] || other(s)
  const mains = Array.isArray(ex?.primaries) && ex.primaries.length ? ex.primaries : [ex?.tg].filter(Boolean)
  const helpers = Array.isArray(ex?.secondaries) && ex.secondaries.length ? ex.secondaries : smOf(ex)
  // A muscle upstream's model weighs at 0 (a leg press's calves) is not trained by it.
  const weights = muscleWeightsOf(ex)
  const secondary = []
  for (const s of [...mains, ...helpers].filter(s => weights[s] !== 0)) {
    const m = name(s)
    if (m && !same(primary, m) && !secondary.includes(m) && secondary.length < 3) secondary.push(m)
  }
  return { primary, secondary }
}
