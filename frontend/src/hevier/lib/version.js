// Go Hevier's own version beside upstream's (hevier/DECISIONS.md D52). The fork's build defines
// __APP_VERSION__ from hevier/VERSION (seam S29), which the updater and the APK read; upstream's
// openGym version stays as __UPSTREAM_VERSION__. Upstream's About page and Settings root name only
// the first, as openGym's: the fork renames them here, in the page's tree (seam S12), not in Settings.jsx.
import { Children, cloneElement, isValidElement } from 'react'
import { Row } from '../../components/ui.jsx'

const own = () => (typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev')
const upstream = () => (typeof __UPSTREAM_VERSION__ === 'string' ? __UPSTREAM_VERSION__ : '?')

/** "Go Hevier 1.0.0 · based on openGym 1.4.1" (a debug build adds its commit: 1.0.0+abc1234). */
export const versionLine = (tr = s => s, mine = own(), theirs = upstream()) =>
  'Go Hevier ' + mine + ' · ' + tr('based on openGym {0}', theirs)

const VERSION_RE = /\d+\.\d+\.\d+[^\s)]*/

/**
 * Upstream's About page with both versions: the Version row's value, the update row's title (a
 * newer Go Hevier, not openGym) and the footer's first line. Anything else, or a page whose shape
 * changed in a merge, is left as it is.
 */
export function aboutPage(tree, tr = s => s, mine = own(), theirs = upstream()) {
  const versionTitle = tr('Version')
  const updateTitle = tr('Update to openGym v{0}', '\u0000').split('\u0000')
  const walk = node => {
    if (!isValidElement(node)) return node
    const p = node.props
    if (node.type === Row && p.title === versionTitle) return cloneElement(node, { value: 'v' + mine, subtitle: tr('based on openGym {0}', 'v' + theirs) })
    if (node.type === Row && typeof p.title === 'string' && p.title.startsWith(updateTitle[0]) && p.title.endsWith(updateTitle[1] || '')) {
      const v = p.title.match(VERSION_RE)?.[0]
      if (v) return cloneElement(node, { title: tr('Update to Go Hevier v{0}', v) })
    }
    if (typeof p.className === 'string' && p.className.split(' ').includes('sp-version')) {
      const kids = Children.toArray(p.children)
      const at = kids.findIndex((k, i) => k === mine && kids[i - 1] === 'openGym v')
      if (at < 1) return node
      return cloneElement(node, {}, ...kids.slice(0, at - 1), versionLine(tr, mine, theirs), ...kids.slice(at + 1))
    }
    if (p.children === undefined) return node
    const kids = Children.toArray(p.children)
    const next = kids.map(walk)
    return next.some((k, i) => k !== kids[i]) ? cloneElement(node, {}, ...next) : node
  }
  return walk(tree)
}
