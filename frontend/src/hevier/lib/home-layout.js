// The configurable Home's layout (hevier/DECISIONS.md D12), which Today's fixed layout replaced
// (D134). It is kept in `S.hvHome` (a fork-only field, so it syncs and is backed up; it was
// device-local `hevier_home` until 2026-10-20, read once more and then forgotten), left as it is.

export const HOME_KEY = 'hevier_home'

/** The stored layout: S's, else the one this device kept before it moved into S. */
export function readHome(S) {
  if (S?.hvHome) return S.hvHome
  try { return JSON.parse(localStorage.getItem(HOME_KEY) || 'null') } catch { return null }
}
/** Moves a layout this device kept before into `s` (a draft of S), once; true when it did. */
export function moveHomeIntoS(s) {
  if (s.hvHome) return false
  const old = readHome(s)
  if (!old) return false
  s.hvHome = { order: Array.isArray(old.order) ? old.order : [], hidden: Array.isArray(old.hidden) ? old.hidden : [] }
  try { localStorage.removeItem(HOME_KEY) } catch { /* nothing to forget */ }
  return true
}
