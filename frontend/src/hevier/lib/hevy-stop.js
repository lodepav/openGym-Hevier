// Send to Hevy says once when it has stopped (hevier/DECISIONS.md D34): a pass that had a workout
// to send ends with the key refused ('auth') or gone from the phone ('nokey'). Send now is left
// out, as its row's line already says it. Told once until a pass gets through; `told` is kept in
// memory only, so each app start may tell once.

/** Whether to tell now: `{ tell, told }`, the error to tell (or null) and whether it stays told. */
export function stopNotice(told, { error, workouts, force }) {
  if (!error) return { tell: null, told: false }
  if (told || force || !workouts || (error !== 'auth' && error !== 'nokey')) return { tell: null, told }
  return { tell: error, told: true }
}
