// An exercise's other names (hevier/DECISIONS.md D73): names the user gives an exercise, each
// found by the search, and one of them, when its switch is on, shown in place of the exercise's
// own name everywhere upstream's exerciseNameFor names it (seam S41). Kept in `S.hvAliases`
// (`{ [exId]: { names: ['Pec deck'], show: 'Pec deck' } }`, a fork-only field, so it syncs and is
// backed up); nothing else stored changes, so history, exports and the Hevy export keep the id.

import { fieldSig } from './store-watch.js'

export const ALIAS_MAX = 60

const key = v => String(v ?? '').trim().toLowerCase()

/** A typed name, trimmed and capped, or null when there is nothing left. */
export function cleanAlias(name) {
  const v = String(name ?? '').trim().replace(/\s+/g, ' ').slice(0, ALIAS_MAX)
  return v || null
}

const entryOf = (S, id) => {
  const e = id != null ? S?.hvAliases?.[id] : null
  return e && Array.isArray(e.names) ? e : null
}

/** The exercise's other names, in the order they were added. */
export const aliasesOf = (S, id) => (entryOf(S, id)?.names || []).filter(n => typeof n === 'string' && n)

/** The name shown in place of the exercise's own, or null. */
export function shownAlias(S, id) {
  const e = entryOf(S, id)
  return e && typeof e.show === 'string' && e.names.includes(e.show) ? e.show : null
}

// Writes the entry back, or removes it (and the field) when it holds nothing.
function put(s, id, names, show) {
  const all = { ...(s.hvAliases || {}) }
  if (names.length) all[id] = show && names.includes(show) ? { names, show } : { names }
  else delete all[id]
  if (Object.keys(all).length) s.hvAliases = all; else delete s.hvAliases
}

/** Adds a name to exercise `id` (a draft of S); one it already has, in any case, is not added
 *  twice. `show` also makes it the shown name. Returns the name kept, or null. */
export function addAlias(s, id, name, { show = false } = {}) {
  const v = cleanAlias(name)
  if (!v) return null
  const names = aliasesOf(s, id)
  const had = names.find(n => key(n) === key(v))
  const next = had ? names : [...names, v]
  put(s, id, next, show ? (had || v) : shownAlias(s, id))
  return had || v
}

/** Removes a name; the shown name falls back to the exercise's own when it was this one. */
export function removeAlias(s, id, name) {
  const names = aliasesOf(s, id).filter(n => n !== name)
  const show = shownAlias(s, id)
  put(s, id, names, show === name ? null : show)
}

/** Shows `name` in place of the exercise's own (null: its own again). */
export function showAlias(s, id, name) {
  put(s, id, aliasesOf(s, id), name)
}

/** What seam S41 hands to upstream: the shown name, the extra search words, and a key that
 *  changes with the names (the search caches each exercise's words). */
export const aliasHooks = get => ({
  exName: ex => shownAlias(get(), ex?.id),
  exAliases: ex => aliasesOf(get(), ex?.id).join(' '),
  namesVersion: () => fieldSig(get(), 'hvAliases'),
})
