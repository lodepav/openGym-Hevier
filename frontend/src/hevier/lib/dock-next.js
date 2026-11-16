// The rest panel's next set (hevier/DECISIONS.md D127): upstream's one line ("Bench press, 80 kg × 8",
// lib/rest-next.js) in two parts, so the numbers get their own large line: { cap, what }.
import { restNextLine } from '../../lib/rest-next.js'
import { nextSetAfter } from '../../lib/spoken-cues.js'
import { exerciseNameText } from '../../lib/format.js'
import { EXIDX } from '../../lib/exercises.js'
import { t } from '../../lib/i18n.js'

/** The set after the rest started by entry `forIdx`: `cap` says which ("Set 2 of 3" on the same
 *  exercise, else its name), `what` its numbers; null when nothing is left. */
export function dockNext(S, forIdx) {
  const line = restNextLine(S, forIdx)
  const next = line && nextSetAfter(S.active, forIdx)
  if (!next) return null
  const entry = S.active.entries[next.idx]
  const name = (EXIDX[entry.id] ? exerciseNameText(EXIDX[entry.id]) : entry.n) || ''
  const what = name && line.startsWith(name) ? line.slice(name.length).replace(/^, /, '') : ''
  const cap = next.idx === forIdx && what ? t('Set {0} of {1}', next.i + 1, entry.sets.length) : name
  return { cap, what: what || (cap === name ? '' : line) }
}
