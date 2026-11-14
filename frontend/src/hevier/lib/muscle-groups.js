// Muscles in a few big groups (hevier/DECISIONS.md D64), as equipment is (D63). The picker's muscle
// filter files an exercise under Hevy's muscle names (`muscleOf`, hevier/lib/exercise-picker.js).
// The By muscle explorer has upstream's own groups since 1.4.5 (lib/muscle-filter.js). A muscle
// no group names (a custom exercise's own spelling) falls into Other.
import { HEADS, HEAD_NAME, headOf, headOfName } from './delt-heads.js'

export const MUSCLE_GROUPS = [
  { id: 'chest', label: 'Chest', names: ['Chest', 'Serratus'] },
  { id: 'back', label: 'Back', names: ['Lats', 'Upper Back', 'Lower Back', 'Traps'] },
  // The heads are upstream's since 1.4.5 (#638); Shoulders itself is a custom exercise's plain shoulder.
  { id: 'shoulders', label: 'Shoulders', names: ['Shoulders', ...HEADS.map(h => HEAD_NAME[h])] },
  { id: 'arms', label: 'Arms', names: ['Biceps', 'Triceps', 'Forearms'] },
  { id: 'core', label: 'Core', names: ['Abdominals', 'Obliques'] },
  { id: 'legs', label: 'Legs', names: ['Quadriceps', 'Hamstrings', 'Glutes', 'Adductors', 'Abductors', 'Calves', 'Hip Flexors', 'Shins'] },
  { id: 'neck', label: 'Neck', names: ['Neck'] },
  { id: 'cardio', label: 'Cardio', names: ['Cardio'] },
  { id: 'other', label: 'Other', names: [] },
]

const BY_NAME = new Map(MUSCLE_GROUPS.flatMap(g => g.names.map(n => [n, g.id])))
export { headOfName }
export const groupOfName = name => BY_NAME.get(name) || 'other'

/** `items` sorted into the groups, in the groups' order, by `of`: [{ id, label, kinds }]; empty groups left out. */
export function groupBy(items, of) {
  const by = new Map(MUSCLE_GROUPS.map(g => [g.id, []]))
  for (const x of items || []) by.get(of(x)).push(x)
  return MUSCLE_GROUPS.map(g => ({ id: g.id, label: g.label, kinds: by.get(g.id) })).filter(g => g.kinds.length)
}

// Shoulders opens on its heads (D65): the picker's names stand for the heads, not Shoulders itself.
const withHeads = names => [...new Set((names || []).flatMap(n => (n === 'Shoulders' ? HEADS.map(h => HEAD_NAME[h]) : [n])))]

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
