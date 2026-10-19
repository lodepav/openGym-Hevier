// Hevy's CSV export writes a line break inside a note as the two characters `\n` (D54), and
// upstream's CSV import keeps them as they are, so an imported note read
// "Feeling fatigued.\nLet's see". The import gets real line breaks (`importDone`), and the workouts
// imported before this are fixed in place, once each: `fixImportedNotes` changes only a note
// that still holds a `\n`, so running it again finds nothing.
import { stampWorkout } from '../../lib/sync-merge.js'

/** A note with Hevy's escaped line breaks turned back into line breaks. */
export const unescapeNote = s => (typeof s === 'string' && s.includes('\\n') ? s.replace(/\\r\\n|\\n/g, '\n') : s)

const fixOne = o => {
  if (!o || typeof o.note !== 'string') return false
  const n = unescapeNote(o.note)
  if (n === o.note) return false
  o.note = n
  return true
}

/** A parsed workout's note and its exercises' notes, unescaped (a copy when anything changed). */
export function unescapeWorkout(w) {
  const copy = { ...w, entries: (w.entries || []).map(e => ({ ...e })) }
  let changed = fixOne(copy)
  for (const e of copy.entries) changed = fixOne(e) || changed
  return changed ? copy : w
}

/** Fixes the notes of workouts already imported (their ids start `iw`), stamped so the fix syncs. */
export function fixImportedNotes(S, now = Date.now()) {
  let fixed = 0
  for (const w of S?.workouts || []) {
    if (!String(w?.id || '').startsWith('iw')) continue
    let changed = fixOne(w)
    for (const e of w.entries || []) changed = fixOne(e) || changed
    if (changed) { stampWorkout(w, now); fixed++ }
  }
  return fixed
}

const needsFix = S => (S?.workouts || []).some(w => String(w?.id || '').startsWith('iw')
  && [w, ...(w.entries || [])].some(o => typeof o?.note === 'string' && o.note.includes('\\n')))

/** Runs the fix at launch and whenever the log changes (a sync can bring an unfixed copy). */
// Only a log that gained imported workouts is scanned again, not every edit. The
// whole fix is for imports made before D54 (Go Hevier 1.1.0): drop it, launch pass included, once
// no such copy can come back by a sync (a release or two after 1.3.0).
const importedCount = S => (S?.workouts || []).reduce((n, w) => n + (String(w?.id || '').startsWith('iw') ? 1 : 0), 0)

export function initNoteFix(store) {
  const { get: getState, update: apply } = store
  const subscribe = store.watch(['workouts'])
  let seen = -1
  const run = () => {
    const S = getState()
    const n = importedCount(S)
    if (n === seen) return
    seen = n
    if (needsFix(S)) apply(s => { fixImportedNotes(s) })
  }
  setTimeout(run, 2000)
  let tm = null
  subscribe?.(() => { clearTimeout(tm); tm = setTimeout(run, 1500) })
}
