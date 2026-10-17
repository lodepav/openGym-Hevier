// Hevy's Settings over upstream's pages (hevier/DECISIONS.md D16). The root is regrouped under
// titles (seam S11); a page keeps upstream's rows except those that only steer upstream's own
// workout layouts, which the fork's one Hevy layout never reads (D1, D3, D4, D7), and the theme and
// accent pickers (D17). They are left out of the page's element tree before it renders (seam S12),
// so upstream's Settings.jsx keeps every row and the fork edits none of them.
import { Children, cloneElement, isValidElement } from 'react'
import { Section } from '../../components/ui.jsx'

// The root, top to bottom. `account` puts upstream's account card first in its group.
export const SETTINGS_GROUPS = [
  { title: 'Account', account: true, ids: ['reminders'] },
  // `volume` is the fork's own row (DECISIONS.md D18), after upstream's pages.
  { title: 'Preferences', ids: ['workout', 'alerts', 'plan', 'units', 'equipment', 'look'], volume: true },
  { title: 'More', ids: ['coach', 'data', 'about'] },
]

// Rows by their English title (the key upstream passes to t()), per page.
export const HIDDEN_ROWS = {
  workout: ['Shown under each exercise', 'Layout', 'Collapse completed exercises', 'Exercise animations'],
  // One look (D17): no light theme, no accent choice. No gym check-in on Home (D12).
  look: ['Theme', 'Accent color', 'Gym check-in'],
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
