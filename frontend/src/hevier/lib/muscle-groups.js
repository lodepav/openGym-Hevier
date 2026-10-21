// Muscles in a few big groups (hevier/DECISIONS.md D64), as equipment is (D63). The picker's muscle
// filter files an exercise under Hevy's muscle names (`muscleOf`, hevier/lib/exercise-picker.js),
// the By muscle explorer under the body map's muscles (MUSCLES in lib/muscles.js); a group names
// both. A muscle no group names (a custom exercise's own spelling) falls into Other.
import { musclesOf } from '../../lib/muscles.js'
import { HEADS, HEAD_NAME, HEAD_SLUG, headOf, headOfName, headOfSlug, headShare } from './delt-heads.js'

export const MUSCLE_GROUPS = [
  { id: 'chest', label: 'Chest', names: ['Chest', 'Serratus'], muscles: ['chest', 'serratus'] },
  { id: 'back', label: 'Back', names: ['Lats', 'Upper Back', 'Lower Back', 'Traps'], muscles: ['upper-back', 'lower-back', 'trapezius'] },
  // The heads are D65's, the fork's own sorting of the catalogue's one shoulder muscle.
  { id: 'shoulders', label: 'Shoulders', names: ['Shoulders', ...HEADS.map(h => HEAD_NAME[h])], muscles: ['deltoids', ...HEADS.map(h => HEAD_SLUG[h])] },
  { id: 'arms', label: 'Arms', names: ['Biceps', 'Triceps', 'Forearms'], muscles: ['biceps', 'triceps', 'forearm'] },
  { id: 'core', label: 'Core', names: ['Abdominals', 'Obliques'], muscles: ['abs', 'obliques'] },
  { id: 'legs', label: 'Legs', names: ['Quadriceps', 'Hamstrings', 'Glutes', 'Adductors', 'Abductors', 'Calves', 'Hip Flexors', 'Shins'],
    muscles: ['quadriceps', 'hamstring', 'gluteal', 'adductors', 'hip-flexors', 'calves', 'tibialis'] },
  { id: 'neck', label: 'Neck', names: ['Neck'], muscles: [] },
  { id: 'cardio', label: 'Cardio', names: ['Cardio'], muscles: [] },
  { id: 'other', label: 'Other', names: [], muscles: [] },
]

const BY_NAME = new Map(MUSCLE_GROUPS.flatMap(g => g.names.map(n => [n, g.id])))
const BY_MUSCLE = new Map(MUSCLE_GROUPS.flatMap(g => g.muscles.map(m => [m, g.id])))
export { headOfName }
export const groupOfName = name => BY_NAME.get(name) || 'other'
export const groupOfMuscle = m => BY_MUSCLE.get(m) || 'other'

/** `items` sorted into the groups, in the groups' order, by `of`: [{ id, label, kinds }]; empty groups left out. */
export function groupBy(items, of) {
  const by = new Map(MUSCLE_GROUPS.map(g => [g.id, []]))
  for (const x of items || []) by.get(of(x)).push(x)
  return MUSCLE_GROUPS.map(g => ({ id: g.id, label: g.label, kinds: by.get(g.id) })).filter(g => g.kinds.length)
}

// Shoulders opens on its heads (D65): the picker's names stand for the heads, not Shoulders itself.
const withHeads = names => [...new Set((names || []).flatMap(n => (n === 'Shoulders' ? HEADS.map(h => HEAD_NAME[h]) : [n])))]

/** The body map's muscles in the explorer's groups: Shoulders as its three heads (D65). */
export const explorerMuscles = muscles => (muscles || []).flatMap(m => (m === 'deltoids' ? HEADS.map(h => HEAD_SLUG[h]) : [m]))

/** The picker's muscle names (`muscleOptions`) in their groups, each group's names in the group's order. */
export const nameGroups = names => groupBy(withHeads(names), groupOfName).map(g => {
  const at = n => { const i = MUSCLE_GROUPS.find(x => x.id === g.id).names.indexOf(n); return i < 0 ? 99 : i }
  return { ...g, kinds: [...g.kinds].sort((a, b) => at(a) - at(b) || a.localeCompare(b)) }
})

// A filter value for a whole group, beside a muscle's own name or slug.
const GROUP = 'mgroup:'
export const muscleGroupValue = id => GROUP + id
export const muscleGroupIdOf = v => (typeof v === 'string' && v.startsWith(GROUP) ? v.slice(GROUP.length) : null)
export const muscleGroupLabel = id => MUSCLE_GROUPS.find(g => g.id === id)?.label || ''

/** A muscle filter value's own words: a group's name or the muscle's. */
export const muscleValueLabel = v => { const g = muscleGroupIdOf(v); return g ? muscleGroupLabel(g) : v }

/** A muscle the picker opens on (a swap's): Shoulders is its whole group, since it has heads. */
export const muscleFilterValue = (name, ex) => {
  if (name !== 'Shoulders') return name || ''
  const h = headOf(ex)
  return h ? HEAD_NAME[h] : muscleGroupValue('shoulders')
}

/**
 * Seam S39: the By muscle explorer selects a body-map muscle or a whole group. `has` gives the
 * explorer's own reading of how much an exercise works the selection (1 a primary target, a part
 * a secondary one, undefined none), the group's best muscle for a group.
 */
export function explorerShare(v, ex) {
  const g = muscleGroupIdOf(v)
  const load = musclesOf(ex)
  const head = headOfSlug(v)
  if (head) return headShare(head, ex, load)
  if (!g) return load[v]
  let best
  for (const m of MUSCLE_GROUPS.find(x => x.id === g)?.muscles || []) if (load[m] && !(best >= load[m])) best = load[m]
  return best
}
