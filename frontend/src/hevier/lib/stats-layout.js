// Statistics' tiles and cards in the user's order, each on or off (hevier/DECISIONS.md D142), as
// OpenBite's Arrange Trends keeps its lists (lib/fork/layout/layout_store.dart): a saved order and a
// hidden set. An id the saved order does not know (one added since) goes at the end; an optional one
// stays hidden until the saved layout lists it as shown. Stored in `S.hvStatsLayout`
// (`{ tiles: { order, hidden }, cards: { order, hidden } }`), one fork field that syncs whole.
import { isOn } from '../../lib/modules.js'
import { partOn } from './module-parts.js'

export const TILES = ['time', 'weight', 'sets', 'hours', 'month', 'rpe']
export const OPTIONAL = new Set(['month', 'rpe'])
export const CARDS = ['time', 'weight', 'sets', 'weekly']

// The module or part an item needs; with it off, the item is neither drawn nor listed in Arrange.
// Missing data (no weigh-in yet) is Statistics' own to judge, so Arrange still lists the item then.
const NEEDS = {
  time: S => partOn(S, 'hvStats', 'time'),
  weight: S => partOn(S, 'body', 'weight'),
  rpe: S => isOn(S, 'effort'),
}

/** Whether item `id` (a tile or a card) has its module and part on in `S`. */
export const moduleOn = (S, id) => !NEEDS[id] || NEEDS[id](S)

const list = v => (Array.isArray(v) ? v : [])

/** `ids` as `saved` arranges them: `{ order, hidden }`, both arrays of known ids only. `saved`
 *  comes through sync and backups, so anything not a list or not one of `ids` is dropped. */
export function arrange(ids, saved) {
  const had = list(saved?.order).filter((id, i, a) => ids.includes(id) && a.indexOf(id) === i)
  const order = [...had, ...ids.filter(id => !had.includes(id))]
  const off = new Set(list(saved?.hidden))
  // Optional: shown only once the saved order knows it and does not hide it (OpenBite's `addable`).
  const hidden = order.filter(id => off.has(id) || (OPTIONAL.has(id) && !had.includes(id)))
  return { order, hidden }
}

/** The ids drawn, in order. */
export const shown = (ids, saved) => { const l = arrange(ids, saved); return l.order.filter(id => !l.hidden.includes(id)) }

/** `layout` (arrange's output) with the item at `from` moved to `to`. */
export function move(layout, from, to) {
  const order = [...layout.order]
  if (from < 0 || from >= order.length || to < 0 || to >= order.length) return layout
  order.splice(to, 0, order.splice(from, 1)[0])
  return { order, hidden: [...layout.hidden] }
}

/** `layout` with the item at `from` among `ids` (the ones listed, a subset of its order) moved to
 *  where the one at `to` is, the items not listed staying where they are. */
export function moveAmong(layout, ids, from, to) {
  if (!ids[from] || !ids[to]) return layout
  return move(layout, layout.order.indexOf(ids[from]), layout.order.indexOf(ids[to]))
}

/** `layout` with `id` switched: hidden becomes shown and shown hidden. */
export const toggle = (layout, id) => ({ order: [...layout.order],
  hidden: layout.hidden.includes(id) ? layout.hidden.filter(x => x !== id) : [...layout.hidden, id] })

/** The first layout: every item in its first order, the optional ones hidden (Reset). */
export const defaults = () => ({ tiles: arrange(TILES), cards: arrange(CARDS) })
