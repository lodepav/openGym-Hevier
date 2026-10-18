// Equipment in a few big groups (hevier/DECISIONS.md D63). The catalogue names 33 kinds of
// equipment, from body weight (2,246 exercises) to a stepmill (1); the picker's filter and a gym's
// checklist show the groups, each opening on its kinds. A kind no group names (a catalogue update,
// clubbell before it has exercises) falls into Other, so nothing is ever unreachable.

export const EQUIP_GROUPS = [
  { id: 'bw', label: 'Body weight', kinds: ['body weight', 'weighted', 'suspension trainer'] },
  { id: 'free', label: 'Free weights', kinds: ['dumbbell', 'kettlebell', 'weight plate', 'medicine ball', 'sandbag', 'clubbell', 'macebell'] },
  { id: 'bar', label: 'Barbells', kinds: ['barbell', 'olympic barbell', 'ez barbell', 'trap bar', 'landmine'] },
  { id: 'machine', label: 'Machines', kinds: ['leverage machine', 'smith machine', 'sled machine', 'assisted'] },
  { id: 'cable', label: 'Cables', kinds: ['cable'] },
  { id: 'band', label: 'Bands', kinds: ['band', 'resistance band'] },
  { id: 'ball', label: 'Balls & rollers', kinds: ['stability ball', 'bosu ball', 'roller', 'wheel roller'] },
  { id: 'cardio', label: 'Cardio machines', kinds: ['stationary bike', 'elliptical machine', 'skierg machine', 'stepmill machine', 'upper body ergometer'] },
  // The accessories a gym ticks (upstream's ACCESSORIES): no exercise names them as its equipment.
  { id: 'acc', label: 'Bench & bar', kinds: ['bench', 'pull-up bar'] },
  { id: 'other', label: 'Other', kinds: ['rope', 'tire', 'hammer'] },
]

const NAMED = new Map(EQUIP_GROUPS.flatMap(g => g.kinds.map(k => [k, g.id])))
export const groupOf = kind => NAMED.get(kind) || 'other'

/**
 * `kinds` (in their own order) sorted into the groups, in the groups' order: [{ id, label, kinds }],
 * a group with none of them left out. A group's kinds keep the order they were given in.
 */
export function groupKinds(kinds) {
  const by = new Map(EQUIP_GROUPS.map(g => [g.id, []]))
  for (const k of kinds || []) by.get(groupOf(k)).push(k)
  return EQUIP_GROUPS.map(g => ({ id: g.id, label: g.label, kinds: by.get(g.id) })).filter(g => g.kinds.length)
}

// The picker's filter value for a whole group, beside a kind's own name.
const GROUP = 'group:'
export const groupValue = id => GROUP + id
export const groupIdOf = v => (typeof v === 'string' && v.startsWith(GROUP) ? v.slice(GROUP.length) : null)

/** Whether exercise `ex` falls under the filter value `v` ('' any, a kind, or a group's value). */
export function eqMatches(v, ex) {
  if (!v) return true
  const g = groupIdOf(v)
  return g ? !!ex?.eq && groupOf(ex.eq) === g : ex?.eq === v
}

/** A group's state among the ticked `have`: 'all', 'some' or 'none'. */
export function groupState(kinds, have) {
  const n = kinds.filter(k => have.has(k)).length
  return n === 0 ? 'none' : n === kinds.length ? 'all' : 'some'
}

/** `have` with a group toggled as one: all on when any is off, else all off. */
export function toggleGroup(have, kinds) {
  const next = new Set(have)
  const on = groupState(kinds, have) !== 'all'
  for (const k of kinds) on ? next.add(k) : next.delete(k)
  return next
}

/** The filter value `v` while the list holds `kinds`: kept when something falls under it, else '' (issue #71's rule). */
export function eqOnAmong(v, kinds) {
  const g = groupIdOf(v)
  if (g) return (kinds || []).some(k => groupOf(k) === g) ? v : ''
  return (kinds || []).includes(v) ? v : ''
}
