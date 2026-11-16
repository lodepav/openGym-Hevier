// The Swap sheet's own lists (hevier/DECISIONS.md D129), worked out from the logged workouts:
// what a routine's exercise was swapped for before, and what was done at a gym.
//
// A saved workout keeps no mark of a swap (upstream's swap replaces the entry in place, keeping
// only the routine's `rid`), so a past swap is inferred, conservatively: a workout of the routine
// where the routine's exercise is missing, and in its place, between the routine's neighbours that
// were done, exactly one exercise that is not in the routine and has the same main muscle. Not
// counted: a workout from before the exercise was first logged in that routine (the routine may
// not have held it yet), a gap where another missing routine exercise has that muscle too, and a
// swap made after sets were logged (upstream keeps both; it reads the same as an added exercise).
import { exOr } from '../../lib/exercises.js'
import { metricRowsForEntry, metricModeForEntry, workoutAt, workoutDay } from '../../lib/history.js'
import { bestSetFor } from '../../lib/exercise-history.js'
import { mainMuscleOf } from './main-muscle.js'
import { savedGym } from './gym-labels.js'

const list = v => (Array.isArray(v) ? v : [])
const timeOf = w => { const t = workoutAt(w); return Number.isFinite(t) ? t : -Infinity }
const byTime = S => list(S?.workouts).filter(Boolean).map((w, i) => ({ w, i, at: timeOf(w) }))
  .sort((a, b) => a.at - b.at || a.i - b.i)
const muscleOfId = id => mainMuscleOf(exOr(id))

// The entries a workout did for routine `rid`: those stamped with it, or all of an older workout
// built from that routine alone before entries carried a `rid`.
function ownEntries(w, rid) {
  const es = list(w?.entries).filter(e => e?.id)
  const own = es.filter(e => e.rid === rid)
  if (own.length) return own
  const ids = list(w?.routineIds).length ? list(w.routineIds) : w?.routineId ? [w.routineId] : []
  return ids.length === 1 && ids[0] === rid ? es.filter(e => !e.rid) : []
}

// One row per exercise: how often, the last workout, and its best set there (as the Lifts tab).
function rows(hits) {
  const by = new Map()
  for (const { e, w, at } of hits) {
    const x = by.get(e.id) || by.set(e.id, { id: e.id, n: 0, at: -Infinity, w: null, e: null }).get(e.id)
    x.n++
    if (at >= x.at) Object.assign(x, { at, w, e })
  }
  return [...by.values()].map(({ id, n, at, w, e }) => {
    const mode = metricModeForEntry(e)
    return { id, n, at, d: workoutDay(w), mode, target: e.target || null, last: bestSetFor({ workouts: [w] }, id, mode)?.set || null }
  })
}

/**
 * The exercises logged in place of exercise `exId` of routine `rid`, most often first, then the
 * most recent: `[{ id, n, at, d, mode, target, last }]`, `last` the best set of the last time.
 */
export function pastSwaps(S, exId, rid) {
  const routine = rid ? list(S?.routines).find(r => r?.id === rid) : null
  const slots = list(routine?.ex).map(x => x?.id)
  const k = slots.indexOf(exId)
  const muscle = muscleOfId(exId)
  if (k < 0 || !muscle) return []
  const inRoutine = new Set(slots)
  const hits = []
  let seen = false
  for (const { w, at } of byTime(S)) {
    const own = ownEntries(w, rid).filter(e => metricRowsForEntry(e).length)
    const ids = own.map(e => e.id)
    if (!ids.length) continue
    if (ids.includes(exId)) { seen = true; continue }
    if (!seen) continue
    // The routine's nearest neighbours that were done, and where they sit in the workout.
    let p = k - 1
    while (p >= 0 && !ids.includes(slots[p])) p--
    let q = k + 1
    while (q < slots.length && !ids.includes(slots[q])) q++
    const lo = p >= 0 ? ids.indexOf(slots[p]) : -1
    const hi = q < slots.length ? ids.indexOf(slots[q]) : ids.length
    if (lo >= hi) continue
    if (slots.slice(p + 1, q).some(s => s !== exId && muscleOfId(s) === muscle)) continue
    const gap = own.slice(lo + 1, hi).filter(e => !inRoutine.has(e.id) && muscleOfId(e.id) === muscle)
    if (gap.length === 1) hits.push({ e: gap[0], w, at })
  }
  return rows(hits).sort((a, b) => b.n - a.n || b.at - a.at)
}

/**
 * The exercises logged at gym `gymId` or with no gym saved (null: anywhere), most recent first:
 * `[{ id, n, at, d, mode, target, last }]`. The sheet keeps those its filters keep.
 */
export function doneHere(S, gymId = null) {
  const hits = []
  for (const { w, at } of byTime(S)) {
    // Most of a long log has no gym (an import, workouts from before gyms): those count as here.
    if (gymId && savedGym(w) && savedGym(w) !== gymId) continue
    for (const e of list(w.entries)) {
      if (e?.id && metricRowsForEntry(e).length) hits.push({ e, w, at })
    }
  }
  return rows(hits).sort((a, b) => b.at - a.at)
}
