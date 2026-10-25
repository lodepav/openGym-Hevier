// The Hevy PREVIOUS column (hevier/DECISIONS.md D3, D21): for each row of an exercise in the running
// session, the matching set from the last time it was done — warm-up N against last time's warm-up
// N, work set N against last time's work set N. Read-only over upstream's history; nothing here
// changes what is logged or how the next session is built.
import { entryExcluded, entryRoutineId } from '../../lib/history.js'
import { isWarmupRow } from '../../lib/workout-model.js'
import { entryLastKey, isCable } from './gym-labels.js'
import { isPairHead, isPairTail } from './hold-set.js'

// Each counting past session of the exercise, newest first, as its finished warm-ups and work sets:
// with a routine id that routine's own sessions first, then the rest (upstream's lastEntryFor
// order, issue #216, carried on past the last session). Warm-ups are read here beside the work
// sets, as lastEntryFor leaves them out on purpose (they must not seed progression). With a label
// (D82: a brand, a cable setup; gym-labels.js lastKey), the sessions done with it come first, then
// those done with none; another brand's are never read. On a cable, a 1:1 or a 2:1 also reads the
// untagged sessions (imported, or logged before D43) after its own setup's, first of the brand,
// then of none: `LF|2:1` reads `LF|2:1`, `LF`, `|2:1`, ``. A ×2 never does, as its weights are per
// stack. No label reads every session, as before, but a cable's '' is its untagged unbranded one.
function lastKeys(exId, label) {
  if (!label) return isCable(exId) ? [''] : [null]
  const cut = label.lastIndexOf('|')
  const [brand, cable] = cut >= 0 ? [label.slice(0, cut), label.slice(cut + 1)] : [label, '']
  const own = b => (cable ? [b + '|' + cable, ...(cable === 'x2' ? [] : [b])] : [b])
  return [...new Set([...own(brand), ...(brand ? own('') : [])])]
}

// A per-side hold is an L row and an R row (hold-set.js), one set: past work sets' ticked ones as
// units, a pair as { pair: true, L, R } (a half whose partner was left unticked, a pair of one).
// Paired before the unticked rows go, so two half-ticked pairs never read as one.
const units = rows => rows.flatMap((s, i) => {
  if (isPairTail(rows, i)) return []
  const halves = isPairHead(rows, i) ? [s, rows[i + 1]] : s.side === 'L' || s.side === 'R' ? [s] : null
  if (!halves) return s.done ? [s] : []
  const done = halves.filter(h => h.done)
  return done.length ? [{ pair: true, ...Object.fromEntries(done.map(h => [h.side, h])) }] : []
})
const isPair = u => u?.pair === true
// What a row shows of a past unit: a half of a pair its own half (or the set, last time one row),
// any other row the set, or a pair's L carrying its R (`hvPairR`, never stored) for a per-side set.
function sideOf(u, role) {
  if (!isPair(u)) return u || null
  if (role) return u[role] || null
  const L = u.L || u.R
  return u.R && u.L ? { ...L, hvPairR: u.R } : L
}

function* pastSessions(H, exId, rid, label) {
  const workouts = H?.workouts || []
  const seen = new Set()
  const keys = lastKeys(exId, label)
  for (const lk of keys) for (const own of rid ? [true, false] : [false]) {
    for (let i = workouts.length - 1; i >= 0; i--) {
      const w = workouts[i]
      const en = (w.entries || []).find(e => e && e.id === exId && (!own || entryRoutineId(w, e) === rid) && (lk == null || entryLastKey(e) === lk))
      if (!en || seen.has(en) || entryExcluded(w, en)) continue
      seen.add(en)
      const done = (en.sets || []).filter(s => s.done)
      const work = units((en.sets || []).filter(s => !isWarmupRow(s)))
      if (work.length) yield { warm: done.filter(isWarmupRow), work }
    }
  }
}

/** Settings → Previous values (D21): 'routine' (the default, D3's rule) or 'any'. */
export const previousMode = S => (S?.hvPrevious === 'any' ? 'any' : 'routine')

/**
 * One slot per row of `entry.sets`: the previous set it lines up with, or null when last time had
 * no set at that position (or there was no last time). `H` is the history the session reads from
 * (backfill's sessionHistory, so a workout logged into the past is held against what came before it).
 * `mode` 'any' skips the same-routine lookup: the newest workout with the exercise. A slot the last
 * session lacked is read from the last one that had it; `walk: false` keeps to the last session.
 * `label` is the session's last-time key (gym-labels.js lastKey, D82): its sessions first, then
 * unlabelled ones (lastKeys above); '' or none reads them all, but a cable's '' is its untagged
 * unbranded one.
 */
export function previousSetsFor(H, entry, mode = 'routine', { walk = true, label = '' } = {}) {
  const rows = entry?.sets || []
  const out = rows.map(() => null)
  if (!entry || !rows.length) return out
  // Row r is warm-up wi or work set ki; a slot last time lacked is read from the last session
  // that had it (Hevy's way: a fourth set done two weeks ago still shows).
  // An L/R pair is one work set: both its rows read the same slot, each its own side.
  let w = 0, k = 0
  const slots = rows.map((row, r) => (isWarmupRow(row) ? ['warm', w++]
    : isPairTail(rows, r) ? ['work', k - 1, 'R'] : ['work', k++, isPairHead(rows, r) ? 'L' : null]))
  let open = rows.length
  for (const past of pastSessions(H, entry.id, mode === 'any' ? null : entry.rid, label)) {
    slots.forEach(([kind, n, role], r) => {
      const got = !out[r] && past[kind][n] ? sideOf(past[kind][n], role) : null
      if (got) { out[r] = got; open-- }
    })
    if (!open || !walk) break
  }
  return out
}
