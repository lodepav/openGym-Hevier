// A logged set as Hevy's Workout Detail writes it: "60kg × 8 reps", where upstream's setLabel
// writes "60×8". Only that plain form is rewritten; every other one (body weight "+10 × 12",
// dumbbells "20 each × 8", drops, bursts, timed and cardio sets) keeps upstream's words.

const PLAIN = /^(\d[\d.,]*)×(\d+)( .+)?$/

/** "60×8" → "60kg × 8 reps", "60×8 F" → "60kg × 8 reps F"; anything else unchanged. */
export function hevySetText(label, unit, repsWord = 'reps') {
  const m = PLAIN.exec(String(label))
  if (!m) return label
  return `${m[1]}${unit} × ${m[2]} ${repsWord}${m[3] || ''}`
}
