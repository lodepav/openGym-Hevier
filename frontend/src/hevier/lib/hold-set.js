// A timed hold as a set type of a reps exercise (D89): a pull-up's dead hang at the end, a squat
// held at the bottom. The row carries upstream's own per-set mode (`mode: 'time'`, which
// modeForSet reads before the exercise's) and its seconds in `sec`, as a hold exercise's set does,
// and no reps, so upstream's volume, 1RM and rep records pass it by. Its weight stays.
// A per-side set made a hold is upstream's timed per-side pair: an L row and an R row, each a hold
// with its own seconds and weight, read as one set (setSpanAt). Upstream's per-side shape (`sides`)
// cannot carry it: every side edit rebuilds a side from its reps and weight, and the seconds go.
import { isWarmupRow, isSideSet, hasCompletedWork, isDropSet, isRestPauseSet, syncSideAggregate, WEIGHT_ORIGIN_MANUAL } from '../../lib/workout-model.js'

/** The seconds a new hold opens with when last time had none there: upstream's hold default. */
export const HOLD_SEC = 45

/** Whether set `s` is a hold in a reps exercise (or a hold exercise's set with its mode written). */
export const isHoldRow = s => !!s && s.mode === 'time' && !isSideSet(s)

/** Whether set `s` of an exercise in `mode` can be made a hold: a work set of a reps exercise, a
 *  per-side one too, without drops or bursts. */
export const canBeHold = (s, mode) => mode === 'reps' && !!s && !isWarmupRow(s)
  && !isDropSet(s) && !isRestPauseSet(s)

/** Whether row `i` is the second half (R) of an L/R pair: the same set as the row before it. */
export const isPairTail = (rows, i) => rows?.[i]?.side === 'R' && rows?.[i - 1]?.side === 'L'
/** Whether row `i` is the first half (L) of an L/R pair. */
export const isPairHead = (rows, i) => rows?.[i]?.side === 'L' && rows?.[i + 1]?.side === 'R'

/** Whether set `i` has anything ticked, either half of a pair or either side: its kind is then
 *  kept (made a hold, or back, it would lose a logged side or invent one). */
export const setTicked = (rows, i) => hasCompletedWork(rows?.[i])
  || (isPairHead(rows, i) && rows[i + 1].done === true)

/** The rows `rows` keeps as sets, an L/R pair as one (its L row): what a count of sets counts.
 *  `pick(s)` says whether a set counts; a pair counts when either half does. */
export const setUnits = (rows, pick = () => true) => (rows || []).filter((s, i) =>
  !isPairTail(rows, i) && (pick(s) || (isPairHead(rows, i) && pick(rows[i + 1]))))

/** Set `i`'s number among the sets of its kind (warm-up or work), an L/R pair one set. */
export function setNumberOf(rows, i) {
  const warm = isWarmupRow(rows[i])
  let n = 0
  for (let j = 0; j <= i; j++) if (isWarmupRow(rows[j]) === warm && !isPairTail(rows, j)) n++
  return n
}

const MANUAL = { weightOrigin: WEIGHT_ORIGIN_MANUAL }

/** A per-side set as a hold on each side: [L row, R row], `secL` and `secR` seconds, each side's
 *  weight kept. */
export function toSideHold(s, secL = HOLD_SEC, secR = secL) {
  const { sides, r: _, w: __, done: ___, at: ____, rir, rpe, type, drops, clusters, max, hvLast, weightOrigin, ...rest } = s
  const half = (k, sec) => ({
    ...rest, side: k, mode: 'time', w: Number(sides[k]?.w) || 0, sec: Math.max(0, Math.round(Number(sec) || 0)), done: false,
    ...(sides[k]?.weightOrigin === WEIGHT_ORIGIN_MANUAL ? MANUAL : {}),
  })
  return [half('L', secL), half('R', secR)]
}

/** An L/R hold pair back as one per-side rep set of `repsL` and `repsR` reps a side. */
export function fromSideHold(L, R, repsL, repsR = repsL) {
  const { side: _, mode: __, sec: ___, hvRun, hvGoal, done, at, w, weightOrigin, hvLast, ...rest } = L
  const side = (h, r) => ({ w: Number(h.w) || 0, r: Math.max(0, Math.round(Number(r) || 0)), done: false,
    ...(h.weightOrigin === WEIGHT_ORIGIN_MANUAL ? MANUAL : {}) })
  return syncSideAggregate({ ...rest, sides: { L: side(L, repsL), R: side(R, repsR) } })
}

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
