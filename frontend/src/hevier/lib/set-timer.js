// Hevy's count-up timer on a cardio set and on a timed hold (hevier/DECISIONS.md D53). ▶ stamps
// the set with when it started (`hvRun`, ms, a fork-only field of the running session); the row
// counts up from it, so it keeps counting in the background and across a restart; ■ (or ticking
// the set, or Finish) writes the time into upstream's own field and drops the stamp. One timer runs
// at a time. Time goes where upstream keeps it: a cardio set's minutes (`min`, seconds / 60, so
// 12:34 is 12.5666… min) and a hold's seconds (`sec`).
import { modeOf } from '../../lib/history.js'

export const RUN = 'hvRun'

/** A set's time in seconds, in `mode` ('cardio' or 'time'), or null when it has none. */
export function secOf(s, mode) {
  const v = mode === 'cardio' ? s?.min : s?.sec
  if (v == null || v === '') return null
  return mode === 'cardio' ? Math.round(Number(v) * 60) || 0 : Math.round(Number(v)) || 0
}

/** The value of the set's field for `sec` seconds: cardio's minutes, a hold's seconds. */
export const fieldValue = (mode, sec) => (mode === 'cardio' ? sec / 60 : Math.round(sec))
export const fieldOf = mode => (mode === 'cardio' ? 'min' : 'sec')

/** Seconds a running set has counted at `now`, or null when it is not running. */
export const runningSec = (s, now = Date.now()) => (s?.[RUN] ? Math.max(0, Math.floor((now - s[RUN]) / 1000)) : null)

/** The set stopped at `now`, its time written in; a set not running is returned as it is. */
export function stopped(s, mode, now = Date.now()) {
  if (!s?.[RUN]) return s
  const { [RUN]: _, ...rest } = s
  return { ...rest, [fieldOf(mode)]: fieldValue(mode, runningSec(s, now)) }
}

const entryMode = e => modeOf({ ...(e?.target || {}), id: e?.id })

/** Stops every running set of the session `active` in place. */
export function stopAll(active, now = Date.now()) {
  for (const e of active?.entries || []) (e?.sets || []).forEach((s, si) => {
    if (s?.[RUN]) e.sets[si] = stopped(s, entryMode(e), now)
  })
}

/** Starts set `si` of entry `ei` at `now`, stopping any other first (in place). */
export function startRun(active, ei, si, now = Date.now()) {
  stopAll(active, now)
  const s = active?.entries?.[ei]?.sets?.[si]
  if (s && !s.done) s[RUN] = now
}

/** Whether a running set is anywhere in the session. */
export const anyRunning = active => (active?.entries || []).some(e => (e?.sets || []).some(s => s?.[RUN]))
