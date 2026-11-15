// D123: a profile that never chose an accent wears OpenBite's green, once. The choice is upstream's
// synced `accent`, and its default cannot be told from a pick by value (DEF says 'lime', freshState
// 'brand'); the per-setting stamp can, since the store stamps `edited.accent` on every pick, on any
// device. The green is written with stamps of 1, so any real pick, however old, outweighs it in a
// merge (lib/sync-merge.js applyEdits), and only once the store is `ready`: boot's first pull has
// then brought the server's copy in, which a change written before it would have beaten.
import { ACCENTS } from '../../lib/format.js'
import { CUSTOM } from '../../lib/accent.js'
import { accentFields, DEFAULT_GREEN } from './accents.js'

// shortcut: an unstamped pick on a server restored from a pre-stamp backup loses to the green in a merge without `prefer` (look-default.test.js it.fails); the user accepted it 2026-11-15, upgrade only if such a server turns up.
const UNCHOSEN = new Set(['lime', 'brand'])

/** Whether profile `S` never chose an accent: no stamp, and upstream's default, none or a key this app does not know. */
export function neverChose(S) {
  if (!S || (S.edited && S.edited.accent)) return false
  const k = S.accent
  return k == null || UNCHOSEN.has(k) || !(k === CUSTOM || Object.hasOwn(ACCENTS, k))
}

/** The default green, in a store draft `s`. */
export function wearDefault(s) { Object.assign(s, accentFields(DEFAULT_GREEN)) }

/** The green's stamps lowered to 1, in a store draft `s` (`edited` is never restamped itself). */
export function lowerStamps(s) { s.edited = { ...(s.edited || {}), accent: 1, accentCustom: 1 } }

// `subscribe` hands over the whole store state, which carries `ready` and `user`; the store is
// installed before boot, so the first call is the one that sets `ready`.
export function initLookDefault(store) {
  return store.subscribe((st, prev) => {
    if (!st.ready || !neverChose(st.S)) return
    if (st.ready === prev.ready && st.user === prev.user && st.S?.accent === prev.S?.accent) return
    store.update(wearDefault)
    store.update(lowerStamps)
  })
}
