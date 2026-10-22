// Hevy's "Update routine?" after a workout (hevier/DECISIONS.md D35). What a
// routine workout changed in each routine it was built from: exercises added, removed or swapped,
// the order, the number of work sets, and what upstream's per-exercise Update routine already
// copies (warm-up sets, rest, note: lib/routines.js routineChangesFromEntry). Weights and reps are
// never written back: the progression engine moves those from what was logged.
//
// Read from the session as it stood at Save, since a finished record drops an exercise that has
// no ticked set, and an exercise left undone is not one taken out. Each running entry keeps the
// routine it came from (`rid`), and every slot of a routine becomes one entry when the session
// starts (lib/session-start.js), so a slot with no entry left was removed. Matching is
// upstream's (routineSlotIndex: by exercise, twins by position). A removed slot with an unmatched
// entry in its place is a swap: the slot keeps its prescription, through upstream's own
// replaceSlotExercise, as the routine editor's Replace does. Anything else unmatched was added
// and is copied the way upstream's Save as routine copies it (routineFromSession).
import { routineSlotIndex, routineChangesFromEntry, replaceSlotExercise } from '../../lib/routines.js'
import { keepBackups } from './routine-backups.js'
import { routineFromSession } from '../../lib/session-routines.js'
import { modeOf, setsFromRows, cleanupSg } from '../../lib/history.js'
import { isWarmupRow } from '../../lib/workout-model.js'
import { isPyramid } from '../../lib/pyramid.js'

// A pyramid's rows are its plan's, a rest-pause set builds its own rows and cardio is one block:
// their row count says nothing about the sets planned.
const countsSets = cfg => modeOf(cfg) !== 'cardio' && !isPyramid(cfg) && cfg?.intensifier?.type !== 'restpause'

/** Work sets added (+) or removed (−) in the session, against what it opened with. */
export function setDelta(entry) {
  const target = entry?.target || {}
  const opened = Math.round(Number(target.sets ?? entry?.planned?.sets)) || 0
  if (!opened || !countsSets(target)) return 0
  return setsFromRows(target, (entry.sets || []).filter(row => !isWarmupRow(row)).length) - opened
}

const withSets = (slot, delta) => (delta && countsSets(slot)
  ? { ...slot, sets: Math.max(1, (Math.round(Number(slot.sets)) || 1) + delta) } : slot)

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/**
 * One routine's new exercise list from the session, with what changed, or null when the session
 * left it as it is. `S` is the store after the workout was saved, so a swapped-in exercise reads
 * its weight from today's sets (replaceSlotExercise).
 */
export function routineUpdate(S, session, routine) {
  const entries = session?.entries || []
  const own = entries.map((e, i) => i).filter(i => entries[i]?.rid === routine.id)
  if (!own.length) return null
  const at = new Map(own.map(i => [i, routineSlotIndex(routine, entries, i)]))
  const kept = new Set([...at.values()].filter(a => a >= 0))
  const gone = routine.ex.map((_, a) => a).filter(a => !kept.has(a))
  const free = new Set(gone)
  const summary = { added: 0, removed: 0, swapped: 0, changed: 0, moved: false }
  const ex = []
  let last = -1
  own.forEach((i, k) => {
    const entry = entries[i]
    const a = at.get(i)
    if (a >= 0) {
      if (a < last) summary.moved = true
      last = a
      let slot = withSets({ ...routine.ex[a] }, setDelta(entry))
      for (const { key, to } of routineChangesFromEntry(routine, entries, i)?.changes || []) {
        if (to) slot[key] = to
        else delete slot[key]
      }
      if (!same(slot, routine.ex[a])) summary.changed++
      ex.push(slot)
      return
    }
    // A swap: a removed slot between the matched neighbours on either side of this entry.
    const next = own.slice(k + 1).map(j => at.get(j)).find(b => b >= 0) ?? Infinity
    const slotAt = gone.find(b => free.has(b) && b > last && b < next)
    if (slotAt != null) {
      free.delete(slotAt)
      summary.swapped++
      // The slot keeps its backups, less the exercise now in it (D45).
      // Per side as it was done (D75): upstream's replace drops the flag.
      const slot = replaceSlotExercise(routine.ex[slotAt], entry.id, S, routine.id)
      if (entry.target?.side && slot.mode !== 'cardio' && !slot.side) { slot.side = true; if (entry.target.reps > 0) slot.reps = entry.target.reps }
      ex.push(withSets(keepBackups(routine.ex[slotAt], slot), setDelta(entry)))
      return
    }
    if (!entry.sets?.length) return
    const copied = routineFromSession({ entries: [entry] }, routine.name, [routine]).ex[0]
    // A superset is kept only with a neighbour it shared in the session (cleanupSg below).
    if (entry.sg) copied.sg = entry.sg
    summary.added++
    // The copy takes a planned entry's planned sets; one without a plan already counted its rows.
    ex.push(entry.planned ? withSets(copied, setDelta(entry)) : copied)
  })
  summary.removed = free.size
  cleanupSg(ex)
  if (same(ex, routine.ex)) return null
  return { rid: routine.id, name: routine.name, ex, summary }
}

/** Every routine the session was built from that it would change. */
export function routineUpdates(S, session) {
  if (!session || session.editingWorkoutId) return []
  const ids = [...new Set((session.entries || []).map(e => e?.rid).filter(Boolean))]
  return ids.map(id => (S.routines || []).find(r => r.id === id)).filter(Boolean)
    .map(r => routineUpdate(S, session, r)).filter(Boolean)
}

/** Writes the updates into a store draft; returns each routine's list as it was, for Undo. */
export function applyRoutineUpdates(s, updates) {
  const before = []
  for (const u of updates) {
    const r = (s.routines || []).find(x => x.id === u.rid)
    if (!r) continue
    before.push({ rid: r.id, ex: structuredClone(r.ex) })
    r.ex = structuredClone(u.ex)
  }
  return before
}

/** Puts the lists back (Undo). */
export function undoRoutineUpdates(s, before) {
  for (const b of before) {
    const r = (s.routines || []).find(x => x.id === b.rid)
    if (r) r.ex = structuredClone(b.ex)
  }
}

/** "+1 · −1 · 1 swapped · 2 changed · reordered", over all the updates. */
export function summaryParts(updates) {
  const n = { added: 0, removed: 0, swapped: 0, changed: 0, moved: false }
  for (const { summary: s } of updates) {
    for (const k of ['added', 'removed', 'swapped', 'changed']) n[k] += s[k]
    n.moved = n.moved || s.moved
  }
  return n
}
