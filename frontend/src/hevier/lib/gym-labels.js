// Gyms and machine labels (hevier/DECISIONS.md D28). A gym is one of upstream's equipment profiles
// (S.equipProfiles); a machine or cable exercise carries a brand label per gym, remembered in
// S.hvMachines. A finished workout keeps both on each logged exercise as `hvGym` and `hvBrand`,
// fields upstream ignores and its editor carries through, so the label goes where the sets go.
//
// In a live session the workout's gym is S.active.hvGym once it was changed ('' = no gym), else
// the active profile. An exercise's brand is its own `hvBrand` once changed ('' = none), else what
// that exercise last had at that gym. The editor of a saved workout reads only what was saved.
//
// A cable exercise also has a setup (D43), kept the same way: `hvCable` on the entry, the default
// per exercise and gym in S.hvCables, 1:1 when nothing says otherwise. Two stacks (×2) are logged
// per stack, stamped as upstream's dumbbells logged per bell (`target.dbLoad = 'each'`,
// lib/dumbbells.js), so volume counts both and records compare like with like.
import { exOr } from '../../lib/exercises.js'
import { hasCompletedWork } from '../../lib/workout-model.js'

export const MACHINE_EQ = new Set(['cable', 'leverage machine', 'smith machine', 'sled machine', 'assisted'])
export const BRAND_MAX = 40

/** Whether an exercise (id) gets a brand line: machines and cables only, not free weights. */
export const isMachine = exId => MACHINE_EQ.has(exOr(exId).eq)

/** The gyms: upstream's equipment profiles, as { id, name }. */
export const gymsOf = S => (S?.equipProfiles || []).filter(p => p?.id != null).map(p => ({ id: p.id, name: p.name || '' }))

/** A gym's name, or null for no gym. A profile deleted since is still a gym, just unnamed. */
export function gymName(S, id) {
  if (!id) return null
  const g = gymsOf(S).find(p => p.id === id)
  return g ? g.name : ''
}

const list = v => (Array.isArray(v) ? v : [])
const editingOf = A => A?.editingWorkoutId != null

/** The session's gym id, or null. */
export function workoutGym(S, A) {
  if (!A) return null
  if (typeof A.hvGym === 'string') return A.hvGym || null
  if (editingOf(A)) return list(A.entries).find(e => e?.hvGym)?.hvGym || null
  return gymsOf(S).some(g => g.id === S.activeEquipId) ? S.activeEquipId : null
}

/** A saved workout's gym id, or null: the gym its exercises were tagged with. */
export const savedGym = w => list(w?.entries).find(e => e?.hvGym)?.hvGym || null

/** The brand an exercise last had at a gym (null: none remembered). */
export const brandDefault = (S, exId, gymId) => S?.hvMachines?.[exId]?.[gymId || ''] || null

// The exercises a label was ever logged on, per log (an exercise found by its label, D36).
const labelledMemo = new WeakMap()
const labelledIn = workouts => {
  if (!labelledMemo.has(workouts)) {
    const ids = new Set()
    for (const w of workouts) for (const e of list(w?.entries)) if (e?.hvBrand) ids.add(e.id)
    labelledMemo.set(workouts, ids)
  }
  return labelledMemo.get(workouts)
}

/**
 * Whether the session's exercise `idx` has a label line: a machine or cable always; any other
 * exercise once it has a label, given in this session, remembered, or logged before ("Achilles
 * Rehab" on a dumbbell calf raise, D28).
 */
export function hasLabel(S, A, idx) {
  const e = A?.entries?.[idx]
  if (!e) return false
  if (isMachine(e.id) || e.hvBrand) return true
  if (typeof e.hvBrand === 'string') return false
  if (Object.values(S?.hvMachines?.[e.id] || {}).some(Boolean)) return true
  return Array.isArray(S?.workouts) && labelledIn(S.workouts).has(e.id)
}

/** The brand of the session's exercise `idx`, or null. */
export function entryBrand(S, A, idx) {
  const e = A?.entries?.[idx]
  if (!e || !hasLabel(S, A, idx)) return null
  if (typeof e.hvBrand === 'string') return e.hvBrand || null
  return editingOf(A) ? null : brandDefault(S, e.id, workoutGym(S, A))
}

/**
 * Sets the session's gym (null: no gym), on the session and on each exercise, so the editor of a
 * saved workout saves it through upstream's own path. In a live session the gym also becomes the
 * active profile, the gym you are at. Mutates the store draft `s`.
 */
export function setWorkoutGym(s, gymId) {
  const A = s.active
  if (!A) return
  A.hvGym = gymId || ''
  for (const e of list(A.entries)) {
    if (!e) continue
    if (gymId) e.hvGym = gymId
    else delete e.hvGym
  }
  if (gymId && !editingOf(A)) s.activeEquipId = gymId
}

/**
 * Sets the brand of the session's exercise `idx` (empty: none). In a live session it is also what
 * the exercise has at this gym from now on; editing a saved workout changes only that workout.
 */
export function setEntryBrand(s, idx, brand) {
  const A = s.active
  const e = A?.entries?.[idx]
  if (!e) return
  const b = String(brand || '').trim().slice(0, BRAND_MAX)
  if (editingOf(A)) {
    if (b) e.hvBrand = b
    else delete e.hvBrand
    return
  }
  e.hvBrand = b
  const key = workoutGym(s, A) || ''
  const byGym = { ...(s.hvMachines?.[e.id] || {}) }
  if (b) byGym[key] = b
  else delete byGym[key]
  const all = { ...(s.hvMachines || {}) }
  if (Object.keys(byGym).length) all[e.id] = byGym
  else delete all[e.id]
  s.hvMachines = all
}

/** Every brand typed so far, any exercise or gym, A–Z: the quick picks of the label sheet. */
export function knownBrands(S) {
  const seen = new Set()
  for (const byGym of Object.values(S?.hvMachines || {})) for (const b of Object.values(byGym || {})) if (b) seen.add(b)
  for (const w of list(S?.workouts)) for (const e of list(w?.entries)) if (e?.hvBrand) seen.add(e.hvBrand)
  return [...seen].sort((a, b) => a.localeCompare(b))
}

// ---------- cable setup (D43)

/** A cable's setups: a single pulley (1:1), a double pulley (2:1), two stacks at once (×2). */
export const CABLES = ['1:1', '2:1', 'x2']
const cableOf = v => (CABLES.includes(v) ? v : null)
/** A setup as the label line shows it. */
export const cableText = c => (c === 'x2' ? '×2' : c)

/** Whether an exercise (id) has a cable setup: cable exercises only. */
export const isCable = exId => exOr(exId).eq === 'cable'

/** The setup an exercise last had at a gym (null: none remembered). */
export const cableDefault = (S, exId, gymId) => cableOf(S?.hvCables?.[exId]?.[gymId || ''])

/** A logged entry's setup: its own, else 1:1 (a cable logged before D43, or imported untagged). */
export const savedCable = e => (e && isCable(e.id) ? cableOf(e.hvCable) || '1:1' : null)

/** The setup of the session's exercise `idx`, or null for one that is not a cable. */
export function entryCable(S, A, idx) {
  const e = A?.entries?.[idx]
  if (!e || !isCable(e.id)) return null
  if (cableOf(e.hvCable) || editingOf(A)) return savedCable(e)
  return cableDefault(S, e.id, workoutGym(S, A)) || '1:1'
}

/** Whether entry `e`'s weights are stamped per stack, as `cable` needs; else stamps them. */
export const cableStamped = (e, cable) => (e?.target?.dbLoad === 'each') === (cable === 'x2')
export function stampCable(e, cable) {
  if (!e || cableStamped(e, cable)) return
  if (cable === 'x2') e.target = { ...(e.target || {}), dbLoad: 'each' }
  else { const { dbLoad: _, ...rest } = e.target; e.target = rest }
}

/**
 * Sets the setup of the session's exercise `idx`. In a live session it is also what the exercise
 * has at this gym from now on; editing a saved workout changes only that workout.
 */
export function setEntryCable(s, idx, cable) {
  const A = s.active
  const e = A?.entries?.[idx]
  if (!e || !isCable(e.id) || !cableOf(cable)) return
  e.hvCable = cable
  stampCable(e, cable)
  if (editingOf(A)) return
  const key = workoutGym(s, A) || ''
  s.hvCables = { ...(s.hvCables || {}), [e.id]: { ...(s.hvCables?.[e.id] || {}), [key]: cable } }
}

/**
 * What a live session's finish should write on the saved record: { hvGym?, hvBrand? } for each
 * exercise with a logged set, in order, which is the order upstream's finish keeps them in.
 */
export function labelsAtFinish(S, A) {
  const gym = workoutGym(S, A)
  return list(A?.entries).map((e, i) => [e, i]).filter(([e]) => list(e?.sets).some(hasCompletedWork)).map(([, i]) => {
    const brand = entryBrand(S, A, i)
    const cable = entryCable(S, A, i)
    return { ...(gym ? { hvGym: gym } : {}), ...(brand ? { hvBrand: brand } : {}), ...(cable ? { hvCable: cable } : {}) }
  })
}

/** The saved workout `w` with `labels` written onto its exercises (a copy; `w` when nothing to write). */
export function withLabels(w, labels) {
  if (!w || !list(labels).some(l => l && Object.keys(l).length)) return w
  return { ...w, entries: list(w.entries).map((e, i) => (labels[i] && Object.keys(labels[i]).length ? { ...e, ...labels[i] } : e)) }
}

// ---------- exercise details

// A gym is only where a session was done (D28): statistics and records are told apart
// by the brand and, on a cable, the setup, never by the gym.

/** A label's key: the brand, '' for none, and a cable setup other than 1:1. */
export const labelKey = (b, c) => (b || '') + (c && c !== '1:1' ? '|' + c : '')
/** The label a logged entry was done with, as a key. */
export const entryLabelKey = e => labelKey(e?.hvBrand, savedCable(e))

/**
 * The labels an exercise was done with, newest first: [{ key, brand, cable, n }]. Only labels that
 * tell sessions apart: an exercise never labelled, or always the same, has nothing to choose.
 */
export function labelsFor(S, exId) {
  const byKey = new Map()
  const ws = [...list(S?.workouts)].sort((a, b) => (b?.start || 0) - (a?.start || 0) || String(b?.d).localeCompare(String(a?.d)))
  for (const w of ws) for (const e of list(w?.entries)) {
    if (e?.id !== exId) continue
    const key = entryLabelKey(e)
    const had = byKey.get(key)
    if (had) had.n++
    else byKey.set(key, { key, brand: e.hvBrand || null, cable: savedCable(e), n: 1 })
  }
  const out = [...byKey.values()]
  return out.length > 1 ? out : []
}

/** A label as text: "Brand · 2:1", what of it there is, or "No brand". */
export function labelText(l, tr = s => s) {
  const c = l.cable && l.cable !== '1:1' ? cableText(l.cable) : null
  return [l.brand, c].filter(Boolean).join(' · ') || tr('No brand')
}

/** S with only the sessions of `exId` done with label `key` (other exercises untouched). */
export function withLabelFilter(S, exId, key) {
  if (key == null) return S
  return {
    ...S,
    workouts: list(S.workouts).map(w => {
      const entries = list(w?.entries)
      if (!entries.some(e => e?.id === exId)) return w
      return { ...w, entries: entries.filter(e => e?.id !== exId || entryLabelKey(e) === key) }
    }),
  }
}
