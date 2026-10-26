// A one-limb exercise starts per side (hevier/DECISIONS.md D75). Upstream's 1.4.3 does this for a
// catalogue exercise its name says is done one arm or leg at a time (`isOneLimb`,
// `pickedExerciseConfig`, from the fork's #736). The fork adds, through seam S32, any exercise
// whose last logged work sets were per side, and turns routine slots per side (`withSide`,
// `sideRoutines`). An entry whose settings are already set stays as it is.
import { EXIDX, isCardio, isOneLimb } from '../../lib/exercises.js'
import { lastEntryFor } from '../../lib/history.js'
import { isSideSet } from '../../lib/workout-model.js'

const sidedSets = sets => {
  const work = (sets || []).filter(s => s && s.phase !== 'warmup')
  return work.length > 0 && work.every(isSideSet)
}

/** True when a freshly added `id` should be logged per side, else false (upstream decides). */
export function sideDefault(S, id) {
  if (!id || isCardio(id)) return false
  if (isOneLimb(EXIDX[id])) return true
  const last = S ? lastEntryFor(S, id) : null
  return !!last && sidedSets(last.sets)
}

// A rep target that meant one side, as a total of both: Hevy's and an unmarked slot's.
const doubled = slot => {
  const out = { ...slot, side: true }
  if (slot.mode === 'time') return out
  for (const k of ['reps', 'repsMin', 'repsMax']) if (slot[k] > 0) out[k] = slot[k] * 2
  return out
}
// An explicit `side: false` is per side switched off, and stays off.
const sideable = slot => slot && slot.side == null && slot.mode !== 'cardio' && !slot.pyramid

/** A routine slot just given exercise `slot.id` (upstream's replaceSlotExercise drops `side`),
 *  per side when that exercise starts per side, its rep target then read as one side's. */
export function withSide(slot, S) {
  return sideable(slot) && sideDefault(S, slot.id) ? doubled(slot) : slot
}

/**
 * Once (`S.hvOneLimb`, a fork-only field, so it syncs): every routine slot of a one-limb catalogue
 * exercise that is not per side becomes per side, its rep target read as one side's, as the
 * routines imported from Hevy before D75 meant it. Returns how many slots changed.
 */
export function sideRoutines(s) {
  if (s.hvOneLimb) return 0
  s.hvOneLimb = 1
  let n = 0
  for (const r of s.routines || []) {
    r.ex = (r.ex || []).map(slot => {
      if (!sideable(slot) || !isOneLimb(EXIDX[slot.id])) return slot
      n++
      return doubled(slot)
    })
  }
  return n
}

/** Runs `sideRoutines` once the profile has its routines (after a restore or a sync brings them). */
export function initSideRoutines(store) {
  const run = () => {
    const S = store.get()
    if (S.hvOneLimb || !(S.routines || []).length) return
    store.update(s => { sideRoutines(s) })
  }
  setTimeout(run, 2000)
  let tm = null
  store.watch(['routines'])?.(() => { clearTimeout(tm); tm = setTimeout(run, 1500) })
}
