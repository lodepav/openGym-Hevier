// The configurable Home (hevier/DECISIONS.md D12): which widgets show, in which order. Order and
// the fork's own switches are device-local (localStorage `hevier_home`), never in S, so sync and
// exports are untouched. The body-weight card reuses upstream's synced switch instead
// (S.showWeightCard). Upstream's gym check-in (membership cards) is not a widget (D12).
// A stored layout that still names it drops it as an unknown id; S.checkIn is left as it is.

export const HOME_KEY = 'hevier_home'

// Default order. The feed is long, so it goes last; it can be moved but not hidden.
export const WIDGETS = ['today', 'streak', 'weight', 'recovery', 'weekly', 'feed']
const OFF_BY_DEFAULT = new Set(['streak', 'recovery', 'weekly'])
export const ALWAYS_ON = new Set(['feed'])
// Widgets whose switch is upstream's, read and written on S.
export const UPSTREAM_SWITCH = {
  weight: { get: S => S.showWeightCard !== false, set: (s, on) => { s.showWeightCard = on } },
}

/** `[{ id, on }]` in display order. Unknown ids from an older or newer build are dropped and
 *  widgets the stored layout does not name yet are added where the default order has them. */
export function homeWidgets(stored, S) {
  const known = (Array.isArray(stored?.order) ? stored.order : []).filter((id, i, a) => WIDGETS.includes(id) && a.indexOf(id) === i)
  const order = [...known]
  for (const id of WIDGETS) {
    if (order.includes(id)) continue
    // After the nearest default predecessor that is already placed, else first.
    const before = WIDGETS.slice(0, WIDGETS.indexOf(id)).reverse().find(p => order.includes(p))
    order.splice(before ? order.indexOf(before) + 1 : 0, 0, id)
  }
  const hidden = new Set(Array.isArray(stored?.hidden) ? stored.hidden : OFF_BY_DEFAULT)
  return order.map(id => ({
    id,
    on: ALWAYS_ON.has(id) ? true : UPSTREAM_SWITCH[id] ? UPSTREAM_SWITCH[id].get(S) : !hidden.has(id),
  }))
}

/** The stored form of a layout: the order, and the fork-owned widgets that are off. */
export const storedLayout = widgets => ({
  order: widgets.map(w => w.id),
  hidden: widgets.filter(w => !w.on && !UPSTREAM_SWITCH[w.id] && !ALWAYS_ON.has(w.id)).map(w => w.id),
})

export function readHome() {
  try { return JSON.parse(localStorage.getItem(HOME_KEY) || 'null') } catch { return null }
}
export function writeHome(widgets) {
  try { localStorage.setItem(HOME_KEY, JSON.stringify(storedLayout(widgets))) } catch { /* private mode: not remembered */ }
}
