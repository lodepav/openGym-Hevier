// Hevy's Settings over upstream's pages (hevier/DECISIONS.md D16). The root is regrouped under
// titles (seam S11); a page keeps upstream's rows except those that only steer upstream's own
// workout layouts, which the fork's one Hevy layout never reads (D1, D3, D4, D7), and the theme and
// accent pickers (D17). They are left out of the page's element tree before it renders (seam S12),
// so upstream's Settings.jsx keeps every row and the fork edits none of them.
import { Children, cloneElement, isValidElement } from 'react'
import { Section } from '../../components/ui.jsx'
import { fmtPlate } from '../../lib/format.js'

// The root, top to bottom. `account` puts upstream's account card first in its group.
export const SETTINGS_GROUPS = [
  { title: 'Account', account: true, ids: ['reminders'] },
  // `hv:` ids are the fork's own rows (DECISIONS.md D18, D21, D42), the rest upstream's pages (D16).
  { title: 'Workout', ids: ['workout', 'alerts', 'hv:previous', 'equipment', 'plan'] },
  { title: 'Stats', ids: ['hv:volume'] },
  { title: 'App', ids: ['units', 'look'] },
  { title: 'Data & more', ids: ['data', 'coach', 'about'] },
]

// Rows by their English title (the key upstream passes to t()), per page.
export const HIDDEN_ROWS = {
  workout: ['Shown under each exercise', 'Layout', 'Collapse completed exercises', 'Skip completed exercises', 'Exercise animations'],
  // One look (D17): no light theme, no accent choice. No gym check-in on Home (D12).
  look: ['Theme', 'Accent color', 'Gym check-in'],
  // The gym filter is the picker's (D62): no switch, no active profile here.
  equipment: ['Filter by equipment', 'Active profile'],
  advanced: ['Weight and reps buttons', 'Drop and burst shortcuts on every set', 'Exercise chips at the top',
    'Superset buttons in the exercise header', 'Move, swap and remove buttons below the exercise'],
}
// A section whose footer speaks of rows that are gone loses the footer.
const STALE_FOOTERS = ['Everything hidden here stays one tap away: the ⋯ button of an exercise and the number of a set.']

/** Whether a settings search hit is a row the fork leaves out. */
export const hiddenSetting = hit => !hit.isPage && (HIDDEN_ROWS[hit.page] || []).includes(hit.title)

// A row's title: a Row's `title` prop, or the `.lrow-t` text of a hand-built `.lrow` (the accent row).
function titleOf(node) {
  if (node.props.title !== undefined) return node.props.title
  if (node.props.className !== 'lrow') return undefined
  const label = Children.toArray(node.props.children)
    .flatMap(k => isValidElement(k) ? Children.toArray(k.props.children) : [])
    .find(k => isValidElement(k) && k.props.className === 'lrow-t')
  return label?.props.children
}

/**
 * A page's element tree without the hidden rows. `tr` is the translation the page rendered its
 * titles with, so a row is matched in any language. A section left with no rows goes too.
 */
export function prunePage(page, tree, tr) {
  const hide = new Set((HIDDEN_ROWS[page] || []).map(k => tr(k)))
  const stale = new Set(STALE_FOOTERS.map(k => tr(k)))
  if (!hide.size) return tree
  const walk = node => {
    if (!isValidElement(node)) return node
    if (hide.has(titleOf(node))) return null
    if (node.props.children === undefined) return node
    const kids = Children.toArray(node.props.children).map(walk).filter(k => k != null && k !== false)
    const isSection = node.type === Section
    if (isSection && !kids.length) return null
    const extra = isSection && stale.has(node.props.footer) ? { footer: undefined } : {}
    return cloneElement(node, extra, ...kids)
  }
  return walk(tree)
}

/**
 * A page's element tree with `el` put in right before the first Section titled `title` (`title`
 * already translated), or the tree as it was when there is none. The fork's own rows on an
 * upstream page (DECISIONS.md D27) go in this way, beside upstream's own.
 */
export function insertBeforeSection(tree, title, el) {
  let done = false
  const walk = node => {
    if (done || !isValidElement(node) || node.props.children === undefined) return node
    const kids = Children.toArray(node.props.children)
    const at = kids.findIndex(k => isValidElement(k) && k.type === Section && k.props.title === title)
    if (at >= 0) {
      done = true
      return cloneElement(node, {}, ...kids.slice(0, at), el, ...kids.slice(at))
    }
    const next = kids.map(walk)
    return done ? cloneElement(node, {}, ...next) : node
  }
  return walk(tree)
}

// Options relabelled, per page and row title: Weight decimals reads 0.5 / 0.25 upstream, but its
// second choice shows any weight to the hundredth, 20.41 kg included (DECISIONS.md D40).
export const RELABELLED = { units: { 'Weight decimals': { 1: 0.1, 2: 0.01 } } }

/** A page's element tree with the options of `RELABELLED`'s rows renamed, values unchanged. */
export function relabelPage(page, tree, tr) {
  const rows = Object.entries(RELABELLED[page] || {}).map(([k, v]) => [tr(k), v])
  if (!rows.length) return tree
  const walk = (node, labels) => {
    if (!isValidElement(node)) return node
    const mine = rows.find(([k]) => k === titleOf(node))?.[1] || labels
    const opts = mine && Array.isArray(node.props.options)
      ? { options: node.props.options.map(o => (o.value in mine ? { ...o, label: fmtPlate(mine[o.value]) } : o)) } : null
    if (node.props.children === undefined) return opts ? cloneElement(node, opts) : node
    return cloneElement(node, opts || {}, ...Children.toArray(node.props.children).map(k => walk(k, mine)))
  }
  return walk(tree, null)
}

// Equipment's page is upstream's EquipmentCard, whose rows only show once it renders. The fork's
// gyms page renders it in its own place (so a hook upstream adds there stays this component's) and
// edits the rows: D62's hidden ones out, its footer and its add row in the words of gyms.
export function GymsPage({ card, tr }) {
  const tree = typeof card?.type === 'function' ? card.type(card.props) : card
  const footer = tr('Each gym’s equipment. The exercise picker shows what the workout’s gym has; outside a workout, choose a gym in its equipment filter.')
  const walk = node => {
    if (!isValidElement(node)) return node
    const extra = node.type === Section ? { footer }
      : node.props.title === tr('Add equipment profile') ? { title: tr('Add gym') } : {}
    if (node.props.children === undefined) return Object.keys(extra).length ? cloneElement(node, extra) : node
    return cloneElement(node, extra, ...Children.toArray(node.props.children).map(walk))
  }
  return walk(prunePage('equipment', tree, tr))
}
