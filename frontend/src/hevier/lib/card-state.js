// The live workout's exercise cards re-render only when what one of them draws changed. The store
// copies the whole of S.active on every change (useStore draftOf), so every entry is a new object
// after a keystroke in any card: a card compares its own part by content instead.
import { liveRecords, recordsAt } from './records.js'

// update() remakes these on every change (stamps); no card reads them. `active` is compared below.
const SKIP = new Set(['active', 'deleted', 'edited', '_ts'])
// `cur` only closes an open swipe, which the row reads itself (HevyExerciseBlock SwipeRowLive).
const ACTIVE_SKIP = new Set(['entries', 'cur'])

/** Structural equality of two JSON-like values. */
export function equal(a, b) {
  if (a === b) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a), kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  for (const k of ka) if (!Object.hasOwn(b, k) || !equal(a[k], b[k])) return false
  return true
}

// A field an update only read is still copied (draftOf), so a top-level field is compared by
// content when its object changed, once per pair of objects for all the cards.
const pairs = new WeakMap()
function sameField(x, y) {
  if (x === y) return true
  if (!x || !y || typeof x !== 'object' || typeof y !== 'object') return false
  let m = pairs.get(x)
  if (!m) pairs.set(x, (m = new WeakMap()))
  if (!m.has(y)) m.set(y, equal(x, y))
  return m.get(y)
}

/**
 * Whether card `idx` (in superset `unit`, its entries' indexes) draws the same from copies `a` and
 * `b` of S: every other top-level field equal (by identity, else by content), the session's own fields, this
 * entry and its partners equal by content, and the same records on its sets (the same exercise in
 * another card can take one away). Anything unknown counts as a change, so a card is never stale.
 */
export function sameForCard(a, b, idx, unit) {
  if (a === b) return true
  if (!a || !b) return false
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (!SKIP.has(k) && !sameField(a[k], b[k])) return false
  const A = a.active, B = b.active
  if (!A || !B) return A === B
  if (A.entries?.length !== B.entries?.length) return false
  const keys = new Set([...Object.keys(A), ...Object.keys(B)])
  for (const k of keys) if (!ACTIVE_SKIP.has(k) && !sameField(A[k], B[k])) return false
  for (const j of new Set([idx, ...(unit || [])])) if (!equal(A.entries[j], B.entries[j])) return false
  return equal(recordsAt(liveRecords(a), idx), recordsAt(liveRecords(b), idx))
}

/** What a card draws from its props, as text: values by content, a handler only by being there (the card calls the latest through a holder). */
export function propsSig(p) {
  return Object.keys(p).sort().map(k => {
    const v = p[k]
    return k + '=' + (v == null ? '-' : typeof v === 'function' ? 'f' : JSON.stringify(v))
  }).join('|')
}
