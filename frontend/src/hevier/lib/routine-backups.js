// Planned backups for a routine exercise (hevier/DECISIONS.md D45), as upstream 1.4.2 has them
// (a2345695, "Routines: planned backups for an exercise, offered first in a swap"): an optional
// list of exercise ids on the routine's entry, `subs`, at most five. Until the fork merges 1.4.2,
// the fork carries it: the routine editor's ⋮ → Backups picks them, a swap in the workout offers
// them first, and every fork path that rebuilds a slot keeps them. At that merge this file goes:
// upstream's lib/routine-backups.js is the part above the line, word for word.
//
// Upstream's header: Planned substitutes for an exercise in a routine (Discord "Substitutions for
// a routine"): the machine is taken, the bar is busy, and the plan already says what to do
// instead. A running workout's swap sheet shows them first ("Your backups"). Nothing else reads
// it, and a routine entry without it is exactly what it was.

export const MAX_BACKUPS = 5

/**
 * The list as it may be stored: unique string ids, never the exercise itself, only ones `known`
 * says exist, at most MAX_BACKUPS. An empty result is no list at all (the field is left out).
 */
export function cleanBackups(list, selfId, known = () => true) {
  if (!Array.isArray(list)) return []
  const out = []
  for (const id of list) {
    if (typeof id !== 'string' || !id || id === selfId || out.includes(id) || !known(id)) continue
    out.push(id)
    if (out.length >= MAX_BACKUPS) break
  }
  return out
}

/** `{ subs }` to spread into a saved entry, or nothing when there are none. */
export const withBackups = (list, selfId, known) => {
  const subs = cleanBackups(list, selfId, known)
  return subs.length ? { subs } : {}
}

// ---------- the fork's until 1.4.2

// Upstream 1.4.2's routines.js keeps a slot's backups through replaceSlotExercise and its sheet
// saves, less the exercise now in the slot (its private dropSelfBackup). The fork's v1.4.1 copies
// drop the field, so the fork's callers put it back with this.
/** `next` (the slot as rebuilt) with `old`'s backups, less the exercise now in it. */
export function keepBackups(old, next) {
  if (!next || !Array.isArray(old?.subs)) return next
  const subs = old.subs.filter(x => x !== next.id)
  const out = { ...next }
  if (subs.length) out.subs = subs
  else delete out.subs
  return out
}

/** The backups a swap of the running workout's exercise `like` offers first (its slot's list). */
export function swapBackups(S, like) {
  const entry = (S?.active?.entries || []).find(e => e?.id === like)
  return cleanBackups(entry?.target?.subs, like)
}
