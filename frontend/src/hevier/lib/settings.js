// Hevy's Settings over upstream's pages (hevier/DECISIONS.md D16). The root is regrouped under
// titles (seam S11); a page keeps upstream's rows except those that only steer upstream's own
// workout layouts, which the fork's one Hevy layout never reads (D1, D3, D4, D7). They are left out
// of the page's element tree before it renders (seam S12), so upstream's Settings.jsx keeps every
// row and the fork edits none of them.
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
  advanced: ['Weight and reps buttons', 'Drop and burst shortcuts on every set', 'Exercise chips at the top',
    'Superset buttons in the exercise header', 'Move, swap and remove buttons below the exercise'],
}
// A section whose footer speaks of rows that are gone loses the footer.
const STALE_FOOTERS = ['Everything hidden here stays one tap away: the ⋯ button of an exercise and the number of a set.']

/** Whether a settings search hit is a row the fork leaves out. */
export const hiddenSetting = hit => !hit.isPage && (HIDDEN_ROWS[hit.page] || []).includes(hit.title)

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
    if (hide.has(node.props.title)) return null
    if (node.props.children === undefined) return node
    const kids = Children.toArray(node.props.children).map(walk).filter(k => k != null && k !== false)
    const isSection = node.type === Section
    if (isSection && !kids.length) return null
    const extra = isSection && stale.has(node.props.footer) ? { footer: undefined } : {}
    return cloneElement(node, extra, ...kids)
  }
  return walk(tree)
}
