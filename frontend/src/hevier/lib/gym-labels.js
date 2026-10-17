// Gyms and machine labels (hevier/DECISIONS.md D28). A gym is one of upstream's equipment profiles
// (S.equipProfiles); a machine or cable exercise carries a brand label per gym, remembered in
// S.hvMachines. A finished workout keeps both on each logged exercise as `hvGym` and `hvBrand`,
// fields upstream ignores and its editor carries through, so the label goes where the sets go.
//
// In a live session the workout's gym is S.active.hvGym once it was changed ('' = no gym), else
// the active profile. An exercise's brand is its own `hvBrand` once changed ('' = none), else what
// that exercise last had at that gym. The editor of a saved workout reads only what was saved.
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

/** The brand of the session's exercise `idx`, or null. */
export function entryBrand(S, A, idx) {
  const e = A?.entries?.[idx]
  if (!e || !isMachine(e.id)) return null
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

/**
 * What a live session's finish should write on the saved record: { hvGym?, hvBrand? } for each
 * exercise with a logged set, in order, which is the order upstream's finish keeps them in.
 */
export function labelsAtFinish(S, A) {
  const gym = workoutGym(S, A)
  return list(A?.entries).map((e, i) => [e, i]).filter(([e]) => list(e?.sets).some(hasCompletedWork)).map(([, i]) => {
    const brand = entryBrand(S, A, i)
    return { ...(gym ? { hvGym: gym } : {}), ...(brand ? { hvBrand: brand } : {}) }
  })
}

/** The saved workout `w` with `labels` written onto its exercises (a copy; `w` when nothing to write). */
export function withLabels(w, labels) {
  if (!w || !list(labels).some(l => l && Object.keys(l).length)) return w
  return { ...w, entries: list(w.entries).map((e, i) => (labels[i] && Object.keys(labels[i]).length ? { ...e, ...labels[i] } : e)) }
}

// ---------- exercise details

/** A label's key: gym id and brand, '' for none. */
export const labelKey = (g, b) => `${g || ''}|${b || ''}`

/**
 * The labels an exercise was done with, newest first: [{ key, gym, brand, n }]. Only labels that
 * tell sessions apart: an exercise never labelled, or always the same, has nothing to choose.
 */
export function labelsFor(S, exId) {
  const byKey = new Map()
  const ws = [...list(S?.workouts)].sort((a, b) => (b?.start || 0) - (a?.start || 0) || String(b?.d).localeCompare(String(a?.d)))
  for (const w of ws) for (const e of list(w?.entries)) {
    if (e?.id !== exId) continue
    const key = labelKey(e.hvGym, e.hvBrand)
    const had = byKey.get(key)
    if (had) had.n++
    else byKey.set(key, { key, gym: e.hvGym || null, brand: e.hvBrand || null, n: 1 })
  }
  const out = [...byKey.values()]
  return out.length > 1 ? out : []
}

/** A label as text: "Gym · Brand", one of them, or "No label". */
export function labelText(S, l, tr = s => s) {
  const g = l.gym ? (gymName(S, l.gym) || tr('Removed gym')) : null
  return [g, l.brand].filter(Boolean).join(' · ') || tr('No label')
}

/** S with only the sessions of `exId` done with label `key` (other exercises untouched). */
export function withLabelFilter(S, exId, key) {
  if (!key) return S
  return {
    ...S,
    workouts: list(S.workouts).map(w => {
      const entries = list(w?.entries)
      if (!entries.some(e => e?.id === exId)) return w
      return { ...w, entries: entries.filter(e => e?.id !== exId || labelKey(e.hvGym, e.hvBrand) === key) }
    }),
  }
}
