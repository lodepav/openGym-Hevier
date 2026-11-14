// Reorder Exercises in a workout (reference/SCREENS.md §2): a drag moves one unit, a lone exercise
// or a whole superset, from place `from` to place `to` among the units. Upstream's one-step move
// (Workout.jsx moveUnitAt, the ⋯ menu's old Move up/down) also remaps the rest timer and the progress
// marks, so the drag is played as those steps: each { at, dir } is the entry index to move and -1
// or 1. Up steps take the unit's first member and down steps its last, where upstream moves the
// whole superset past its neighbour (lib/active-workout-order.js), so a pair is never split.
import { supersetUnits } from '../../lib/history.js'

export function unitMoveSteps(entries, from, to) {
  const units = supersetUnits(entries || []).map(u => u.length)
  if (!(from >= 0 && from < units.length && to >= 0 && to < units.length)) return []
  const startOf = k => units.slice(0, k).reduce((n, len) => n + len, 0)
  const steps = []
  for (let k = from; k !== to;) {
    const dir = to < k ? -1 : 1
    steps.push({ at: dir < 0 ? startOf(k) : startOf(k) + units[k] - 1, dir })
    ;[units[k], units[k + dir]] = [units[k + dir], units[k]]
    k += dir
  }
  return steps
}
