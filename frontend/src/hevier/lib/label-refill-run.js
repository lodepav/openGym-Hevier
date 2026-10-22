// D82 at run time: when an exercise's label changes in a live session (the gym, which brings that
// gym's brand and setup, or the brand or setup itself), its untouched sets are filled again from
// last time on the new label (plain-routine.js refillRows). Upstream's own rows are not watched.
import { sessionHistory } from '../../lib/backfill.js'
import { sessionLabelKey } from './gym-labels.js'
import { refillRows } from './plain-routine.js'

const sameSession = (A, P) => A && P && A.start === P.start && A.editingWorkoutId == null && P.editingWorkoutId == null
// What a label is read from, so a set typed in (every keystroke is a change) costs one comparison.
const labelSig = S => JSON.stringify([S.active.hvGym, S.activeEquipId, S.hvMachines, S.hvCables,
  (S.active.entries || []).map(e => [e?.id, e?.hvBrand, e?.hvCable])])

/** The live session's exercises whose label differs from the state before: [{ idx, id, was, label }]. */
export function labelChanges(S, P) {
  const A = S?.active, B = P?.active
  if (!sameSession(A, B) || A === B || labelSig(S) === labelSig(P)) return []
  const out = []
  ;(A.entries || []).forEach((e, idx) => {
    if (!e || B.entries?.[idx]?.id !== e.id) return
    const label = sessionLabelKey(S, A, idx), was = sessionLabelKey(P, B, idx)
    if (label !== was) out.push({ idx, id: e.id, was, label })
  })
  return out
}

/** Refills the changes on the draft `s`; an exercise swapped since is left to its new build. */
export function applyRefills(s, changes) {
  const A = s.active
  for (const c of changes) {
    const e = A?.entries?.[c.idx]
    if (e?.id !== c.id) continue
    const rows = refillRows(sessionHistory(s), s, e, (s.routines || []).find(r => r.id === e.rid), c.label, c.was)
    if (rows) e.sets = rows
  }
}

/** At launch (hevier/index.js). */
let started = false
export function initLabelRefill(store) {
  if (started) return
  started = true
  store.subscribe((st, prev) => {
    const changes = labelChanges(st.S, prev.S)
    // After the gym's own swaps (D46), which rebuild a swapped exercise on the new gym already.
    if (changes.length) setTimeout(() => store.update(s => applyRefills(s, changes)), 0)
  })
}
