// The routine editor's brand on the name line (hevier/DECISIONS.md D130, after D28): the brand an
// exercise opens with at the gym the next session starts at, the active gym, as the routine's page
// reads it. Changing it is what a live session's change would remember there (gym-labels.js).
import { gymsOf, brandDefault, BRAND_MAX } from './gym-labels.js'

/** The gym a session started now opens at (the active one), or null. */
export const startGym = S => (gymsOf(S).some(g => g.id === S?.activeEquipId) ? S.activeEquipId : null)

/** The brand exercise `exId` opens with, or null. */
export const routineBrand = (S, exId) => brandDefault(S, exId, startGym(S))

/** Remembers `brand` (empty: none) for exercise `exId` at that gym. Mutates the store draft `s`. */
export function setRoutineBrand(s, exId, brand) {
  const b = String(brand || '').trim().slice(0, BRAND_MAX)
  const key = startGym(s) || ''
  const byGym = { ...(s.hvMachines?.[exId] || {}) }
  if (b) byGym[key] = b
  else delete byGym[key]
  const all = { ...(s.hvMachines || {}) }
  if (Object.keys(byGym).length) all[exId] = byGym
  else delete all[exId]
  s.hvMachines = all
}
