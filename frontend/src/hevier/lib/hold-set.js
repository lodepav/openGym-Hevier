// A timed hold as a set type of a reps exercise (D89): a pull-up's dead hang at the end, a squat
// held at the bottom. The row carries upstream's own per-set mode (`mode: 'time'`, which
// modeForSet reads before the exercise's) and its seconds in `sec`, as a hold exercise's set does,
// and no reps, so upstream's volume, 1RM and rep records pass it by. Its weight stays.
import { isWarmupRow, isSideSet, isDropSet, isRestPauseSet } from '../../lib/workout-model.js'

/** The seconds a new hold opens with when last time had none there: upstream's hold default. */
export const HOLD_SEC = 45

/** Whether set `s` is a hold in a reps exercise (or a hold exercise's set with its mode written). */
export const isHoldRow = s => !!s && s.mode === 'time' && !isSideSet(s)

/** Whether set `s` of an exercise in `mode` can be made a hold: a plain work set of a reps exercise. */
export const canBeHold = (s, mode) => mode === 'reps' && !!s && !isSideSet(s) && !isWarmupRow(s)
  && !isDropSet(s) && !isRestPauseSet(s)

/** Row `s` as a hold of `sec` seconds, its reps dropped. */
export function toHold(s, sec = HOLD_SEC) {
  const { r: _, max: __, ...rest } = s
  return { ...rest, mode: 'time', sec: Math.max(0, Math.round(Number(sec) || 0)) }
}

/** Hold `s` back as a rep set of `reps` reps. */
export function toReps(s, reps) {
  const { mode: _, sec: __, hvRun: ___, hvGoal: ____, ...rest } = s
  return { ...rest, r: Math.max(0, Math.round(Number(reps) || 0)) }
}

/** The kind of set a row of a reps exercise is upstream's (S48): 'time' for a hold, else none. */
export const rowMode = s => (isHoldRow(s) ? 'time' : null)
