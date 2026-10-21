// A one-limb exercise starts per side (hevier/DECISIONS.md D75). Upstream logs every exercise as
// one row a set until its settings say "per side" (`cfg.side`, lib/history.js isPerSide), so a
// single-leg calf raise added to a workout, swapped in or imported from Hevy logged both legs as
// one. `sideDefault` answers upstream's `defaultConfig` (seam S32, beside D55's hold mode): per side
// for a catalogue exercise its name says is done one arm or leg at a time, and for any exercise
// whose last logged work sets were per side. An entry whose settings are already set stays as it is.
import { EXIDX, isCardio } from '../../lib/exercises.js'
import { lastEntryFor } from '../../lib/history.js'
import { isSideSet } from '../../lib/workout-model.js'

// "single leg", "one arm", "single-arm", "unilateral".
export const LIMB_NAME = /\b(single|one)[\s-]+(arm|leg|hand)\b|\bunilateral\b/i
// Stretches and rollers are mobility, not sets; a single-leg push-up or plank is a two-arm
// exercise with a leg lifted, and "two to one leg" lands on one.
const NOT = /stretch|\broll(er|ball)?\b|two to one|single leg (push|plank)|leg push up|single leg plank/i

/** Whether the catalogue exercise `ex` is done one arm or leg at a time, by its name. */
export function isOneLimb(ex) {
  if (!ex || ex.custom || isCardio(ex.id)) return false
  const n = String(ex.n || '')
  return LIMB_NAME.test(n) && !NOT.test(n)
}

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

/** What upstream's `defaultConfig` adds for `id` (seam S32): per side, a rep target of ten a side
 *  (upstream's per-side reps are both sides' total), or nothing. */
export function sideConfig(S, id) {
  return sideDefault(S, id) ? { reps: { side: true, reps: 20 }, time: { side: true } } : null
}

// A rep target that meant one side, as a total of both: Hevy's and an unmarked slot's.
const doubled = slot => {
  const out = { ...slot, side: true }
  if (slot.mode === 'time') return out
  for (const k of ['reps', 'repsMin', 'repsMax']) if (slot[k] > 0) out[k] = slot[k] * 2
  return out
}
const sideable = slot => slot && !slot.side && slot.mode !== 'cardio' && !slot.pyramid

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
