// An exercise's other names (hevier/DECISIONS.md D73). The names are upstream's (#624): a
// built-in's in `S.exAliases`, a custom exercise's on its own `aliases`, found by upstream's
// search. The fork adds only which one is shown in place of the exercise's own name everywhere
// upstream's exerciseNameFor names it (seam S41), in `S.hvShownName` (`{ [exId]: 'Pec deck' }`,
// a fork-only field, so it syncs and is backed up). Nothing logged changes.

import { exerciseAliases, normalizeAliases } from '../../lib/exercise-aliases.js'
import { exOr } from '../../lib/exercises.js'

export const ALIAS_MAX = 80 // upstream's longest other name (exercise-aliases.js)

const key = v => String(v ?? '').trim().toLocaleLowerCase()
const customOf = (S, id) => S?.customEx?.find(c => c.id === id)
const exOf = (S, id) => customOf(S, id) || exOr(id)

/** A typed name as upstream keeps it, or null when there is nothing left. */
export const cleanAlias = name => normalizeAliases([String(name ?? '').replace(/\s+/g, ' ')])[0] || null

/** The exercise's other names, as upstream's search reads them. */
export const aliasesOf = (S, id) => (id != null ? exerciseAliases(exOf(S, id), S?.exAliases || {}) : [])

/** The name shown in place of the exercise's own, or null. */
export function shownAlias(S, id) {
  const v = id != null ? S?.hvShownName?.[id] : null
  return typeof v === 'string' && aliasesOf(S, id).includes(v) ? v : null
}

// Writes the names where upstream's editor does, and the shown one beside them.
function put(s, id, names, show) {
  const c = customOf(s, id)
  if (c) c.aliases = names
  else s.exAliases = { ...s.exAliases, [id]: names }
  const all = { ...(s.hvShownName || {}) }
  if (show && names.includes(show)) all[id] = show; else delete all[id]
  if (Object.keys(all).length) s.hvShownName = all; else delete s.hvShownName
}

/** Adds a name to exercise `id` (a draft of S); one it already has, in any case, is not added
 *  twice. `show` also makes it the shown name. Returns the name kept, or null. */
export function addAlias(s, id, name, { show = false } = {}) {
  const v = cleanAlias(name)
  if (!v) return null
  const names = aliasesOf(s, id)
  const had = names.find(n => key(n) === key(v))
  const next = had ? names : normalizeAliases([...names, v])
  if (!next.includes(had || v)) return null // upstream's cap on names
  put(s, id, next, show ? (had || v) : shownAlias(s, id))
  return had || v
}

/** Removes a name; the shown name falls back to the exercise's own when it was this one. */
export function removeAlias(s, id, name) {
  const show = shownAlias(s, id)
  put(s, id, aliasesOf(s, id).filter(n => n !== name), show === name ? null : show)
}

/** Shows `name` in place of the exercise's own (null: its own again). */
export function showAlias(s, id, name) {
  put(s, id, aliasesOf(s, id), name)
}

/** The fork's old `S.hvAliases` (`{ [exId]: { names, show } }`), moved once: the names join
 *  upstream's, the shown one stays shown. */
export function moveAliases(s) {
  const old = s.hvAliases
  delete s.hvAliases
  if (!old || typeof old !== 'object') return
  for (const [id, e] of Object.entries(old)) {
    if (!Array.isArray(e?.names)) continue
    put(s, id, normalizeAliases([...aliasesOf(s, id), ...e.names]), shownAlias(s, id))
    if (typeof e.show === 'string') showAlias(s, id, e.show)
  }
}

/** What seam S41 hands to upstream: the shown name. */
export const aliasHooks = get => ({
  exName: ex => shownAlias(get(), ex?.id),
})
