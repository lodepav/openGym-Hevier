// The exercise picker's gym filter (hevier/DECISIONS.md D62). Upstream filters by its "active
// profile" behind a Settings switch; the fork has no such switch. In a workout the picker shows
// what the workout's gym has (D28's gym line); outside one it shows the gym last chosen in the
// picker itself, kept on the device (`hevier_ex_gym`). Body weight is a piece of equipment like
// any other here: a gym that does not tick it hides the body-weight exercises.
import { eqAvailable, profileEquipment } from '../../lib/equipment.js'
import { workoutGym } from './gym-labels.js'

const KEY = 'hevier_ex_gym'
export const BW = 'body weight'

const gyms = S => (Array.isArray(S?.equipProfiles) ? S.equipProfiles : []).filter(p => p?.id != null)
export const gymById = (S, id) => (id ? gyms(S).find(p => p.id === id) || null : null)

/**
 * What a gym has, as upstream reads it, with body weight. A gym last saved before D62 had no say
 * over body weight (upstream keeps it always available), so it counts as having it, and its sheet
 * shows it ticked, until it is saved again: nothing vanishes from it overnight.
 */
export function gymEquipment(p) {
  const have = profileEquipment(p)
  return p && !p.hvBw && !have.includes(BW) ? [...have, BW] : have
}

/** Whether exercise `ex` can be done at gym `p` (null: any gym, everything). */
export function gymHas(p, ex) {
  if (!p) return true
  const have = gymEquipment(p)
  if (ex?.eq === BW && !have.includes(BW)) return false
  return eqAvailable(have, ex)
}

/** The gym the picker remembers for outside a workout, while it is still one of yours. */
export function rememberedGym(S) {
  let id = null
  try { id = localStorage.getItem(KEY) } catch { /* device-local only */ }
  return gymById(S, id)?.id || null
}
export function rememberGym(id) {
  try { id ? localStorage.setItem(KEY, id) : localStorage.removeItem(KEY) } catch { /* device-local only */ }
}

/** Whether the picker was opened from the running workout or a workout being edited. */
export const inWorkout = (S, path) => !!S?.active && path === '/workout'

/** The gym the picker opens on: the workout's, or the one remembered outside a workout. */
export const pickerGym = (S, path) => (inWorkout(S, path) ? gymById(S, workoutGym(S, S.active))?.id || null : rememberedGym(S))

/** The current route's path; the app runs on a HashRouter. */
export const currentPath = () => (typeof window === 'undefined' ? '' : (window.location.hash.replace(/^#/, '').split('?')[0] || '/'))

/** Seam S36: upstream's equipment profile sheet edits a gym, body weight one of its ticks. */
export const gymSheet = tr => ({
  equipment: gymEquipment,
  // From now on the gym's ticks decide body weight too.
  saved: p => { p.hvBw = 1 },
  note: () => tr('Untick body weight to hide body-weight exercises at this gym. One that needs a pull-up bar or a bench also needs it ticked.'),
})
