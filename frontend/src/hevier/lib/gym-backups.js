// A gym's backups (hevier/DECISIONS.md D46): a routine exercise swapped for one
// of its planned backups (D45) at a gym is swapped the same way the next time the routine starts
// there. What each gym took is learned from the swaps themselves, the last choice winning, and kept
// in S.hvGymSwaps ({ [exId]: { [gymId]: backupExId } }, a fork-only field synced as a whole):
// swapping back to the routine's own exercise there forgets it. Only a live routine session at a
// gym (D28's workoutGym) swaps, and only an exercise with nothing ticked yet.
// An exercise can also be marked missing at a gym (D86, S.hvGymMissing: { [exId]: [gymId] }): a slot
// whose exercise a gym lacks starts there with its first backup, in the slot's order, the gym has.
import { EXIDX, allExercises } from '../../lib/exercises.js'
import { defaultConfig } from '../../lib/history.js'
import { sessionHistory } from '../../lib/backfill.js'
import { buildPlannedEntry, builtOutOfProgression } from '../../lib/session-start.js'
import { swapActiveExercise } from '../../lib/active-exercise-swap.js'
import { cleanBackups } from '../../lib/routine-backups.js'
import { workoutGym } from './gym-labels.js'

const list = v => (Array.isArray(v) ? v : [])
const routineOf = (S, rid) => (rid ? list(S?.routines).find(r => r?.id === rid) || null : null)
const exists = S => {
  const own = new Set(allExercises(S).map(e => e.id))
  return id => !!EXIDX[id] || own.has(id)
}
const backupsOf = (S, slot) => cleanBackups(slot?.subs, slot?.id, exists(S))
const live = A => !!A && !A.backfill && A.editingWorkoutId == null

/** The backup exercise `exId` took at gym `gymId` last time, or null. */
export const learnedBackup = (S, exId, gymId) => (gymId && S?.hvGymSwaps?.[exId]?.[gymId]) || null

/** Whether exercise `exId` is marked missing at gym `gymId` (D86). */
export const missingAt = (S, exId, gymId) => !!gymId && list(S?.hvGymMissing?.[exId]).includes(gymId)

/** Marks exercise `exId` missing at gym `gymId`, or there again. Mutates the store draft `s`. */
export function setMissing(s, exId, gymId, missing) {
  if (!exId || !gymId || missingAt(s, exId, gymId) === !!missing) return false
  const map = s.hvGymMissing && typeof s.hvGymMissing === 'object' ? s.hvGymMissing : (s.hvGymMissing = {})
  const now = list(map[exId]).filter(g => g !== gymId)
  if (missing) now.push(gymId)
  if (now.length) map[exId] = now
  else delete map[exId]
  return true
}

/**
 * What slot `slot` takes at gym `gymId`, or null for its own exercise: the backup learned there
 * (D46), else, when the gym lacks the slot's exercise, its first backup the gym does not lack (D86).
 */
export function gymPick(S, slot, gymId) {
  if (!slot || !gymId) return null
  const there = backupsOf(S, slot).filter(id => !missingAt(S, id, gymId))
  const learned = learnedBackup(S, slot.id, gymId)
  if (learned && there.includes(learned)) return learned
  return missingAt(S, slot.id, gymId) ? there[0] || null : null
}

function remember(s, exId, gymId, to) {
  const map = s.hvGymSwaps && typeof s.hvGymSwaps === 'object' ? s.hvGymSwaps : (s.hvGymSwaps = {})
  if (to) map[exId] = { ...(map[exId] || {}), [gymId]: to }
  else if (map[exId]) {
    delete map[exId][gymId]
    if (!Object.keys(map[exId]).length) delete map[exId]
  }
}

/**
 * Learns from a swap in the live session (`from` → `to`, the slot's routine `rid`, at `gymId`):
 * the routine's exercise swapped for one of its backups is remembered for that gym; a backup
 * swapped back to the routine's exercise forgets it; one backup for another remembers the new one.
 * Mutates the store draft `s`; true when something changed.
 */
export function learnSwap(s, { rid, from, to, gymId }) {
  const routine = routineOf(s, rid)
  if (!routine || !gymId || !from || !to || from === to) return false
  const slots = list(routine.ex)
  const own = slots.find(x => x?.id === from && backupsOf(s, x).includes(to))
  if (own) { remember(s, own.id, gymId, to); return true }
  const back = slots.find(x => x?.id === to && backupsOf(s, x).includes(from))
  if (back) {
    // Back to the routine's own exercise: done here after all, so neither learned nor missing.
    const had = !!learnedBackup(s, back.id, gymId)
    if (had) remember(s, back.id, gymId, null)
    return setMissing(s, back.id, gymId, false) || had
  }
  const via = slots.find(x => { const b = backupsOf(s, x); return b.includes(from) && b.includes(to) })
  if (via) { remember(s, via.id, gymId, to); return true }
  return false
}

/** The swaps the live session's gym asks for: [{ index, from, to }], nothing ticked on any. */
export function plannedSwaps(S) {
  const A = S?.active
  if (!live(A)) return []
  const gymId = workoutGym(S, A)
  if (!gymId) return []
  const out = []
  list(A.entries).forEach((e, index) => {
    if (!e?.rid || list(e.sets).some(x => x?.done === true)) return
    const slot = list(routineOf(S, e.rid)?.ex).find(x => x?.id === e.id)
    const to = gymPick(S, slot, gymId)
    if (to) out.push({ index, from: e.id, to })
  })
  return out
}

/**
 * Swaps the live session's exercise `index` for `toId` as upstream's swap does with a quick pick
 * (sheets.jsx swapActiveWorkoutExercise: the exercise's default settings, built the way its
 * routine builds it), or from the routine slot `slot` when given. Only an exercise with nothing
 * ticked. Mutates the store draft `s`.
 */
export function swapEntry(s, index, toId, slot = null) {
  const A = s.active
  const current = A?.entries?.[index]
  if (!current || list(current.sets).some(x => x?.done === true)) return false
  const routine = routineOf(s, current.rid)
  if (!routine) return false
  const full = { ...(slot || defaultConfig(toId)), id: toId }
  const built = buildPlannedEntry(sessionHistory(s), full, routine, { noProg: builtOutOfProgression(current, routine) })
  const replacement = { id: toId, ...built, rid: current.rid, ...(current.noProg === true ? { noProg: true } : {}) }
  return !!swapActiveExercise(A, index, replacement)
}

/** Makes the gym's swaps (plannedSwaps) on the draft `s`; returns what was swapped. */
export function applyGymSwaps(s) {
  const done = []
  for (const p of plannedSwaps(s)) if (swapEntry(s, p.index, p.to)) done.push(p)
  return done
}

/** Undoes `applyGymSwaps`'s swaps that are still untouched, and forgets them for the gym. */
export function undoGymSwaps(s, done) {
  const A = s.active
  const gymId = workoutGym(s, A)
  for (const p of done) {
    if (A?.entries?.[p.index]?.id !== p.to) continue
    const slot = list(routineOf(s, A.entries[p.index].rid)?.ex).find(x => x?.id === p.from)
    if (swapEntry(s, p.index, p.from, slot) && gymId) remember(s, p.from, gymId, null)
  }
}
