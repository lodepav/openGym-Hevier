// A cardio set's timer left running past twice the set's time and 10 minutes more looks forgotten:
// the tick asks before it logs it (D90). The weight and rep checks are upstream's since 1.4.4 (#811,
// lib/typo-check.js), so only the timer is the fork's.

/** Whether `sec` run on a cardio set's timer looks forgotten against its time `planned` and last time's. */
export function longRun(sec, planned, last) {
  const ref = Math.max(Number(planned) || 0, Number(last) || 0)
  return ref > 0 && sec > 2 * ref && sec - ref >= 600 ? ref : 0
}
