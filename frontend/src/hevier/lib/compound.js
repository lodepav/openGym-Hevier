// Compound or isolation (hevier/DECISIONS.md D141): upstream's name guess (warmup-ramp.js
// isCompoundEx), with three slips fixed: its isolation word "lateral" also catches a "lateral
// pulldown" and every "unilateral" lift, and its "push-?up" misses "push up" written with a space.
// Everything else keeps upstream's verdict.
import { isCompoundEx } from '../../lib/warmup-ramp.js'
import { exerciseOf } from '../../lib/exercises.js'

const FIXES = [
  [/\blateral (pull-?down)/gi, '$1'],
  [/unilateral/gi, 'one side'],
  [/\bpush up/gi, 'push-up'],
]

/** Whether an exercise (or its id) is a compound lift; false for none. */
export function isCompound(idOrEx) {
  const ex = exerciseOf(idOrEx)
  if (!ex) return false
  const n = FIXES.reduce((s, [re, to]) => s.replace(re, to), String(ex.n || ''))
  // isCompoundEx reads a cfg's `id` through exerciseOf, which hands an object back as it is,
  // so the exercise with its name mended goes through upstream's own words and categories.
  return isCompoundEx({ id: { ...ex, n } })
}
