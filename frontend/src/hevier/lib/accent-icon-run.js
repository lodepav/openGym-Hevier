// D123: the launcher icon follows the accent (plan 3.1). The page tells the fork's HevierIconPlugin
// which icon the worn accent maps to (accent-icon.js); the phone switches the launcher alias once
// the app is in the background. Android only: the iPhone app has no fork icons.
import { MOBILE, isAndroid } from '../../lib/mobile.js'
import { accentIcon } from './accent-icon.js'

let pluginP = null
const plugin = () => pluginP || (pluginP = (async () => {
  if (!MOBILE || !(await isAndroid())) return null
  const { registerPlugin } = await import('@capacitor/core')
  // Wrapped in an object: a Capacitor plugin proxy answers `then`.
  return { I: registerPlugin('HevierIcon') }
})().catch(() => null))

/**
 * At launch (hevier/index.js): asks the phone for the icon it holds, then saves a new one whenever
 * the accent's icon changes. Nothing at start-up: before the first sync gives a never-chosen profile
 * its green (look-default.js), the stored upstream default would map to another icon and switch it.
 */
let started = false
export function initAccentIcon(store) {
  if (!MOBILE || started) return
  started = true
  // The phone's saved id rather than localStorage: it is what the next stop applies, and WebView storage can be evicted.
  let last = null
  const ready = plugin().then(async p => {
    if (p) last = (await p.I.getIcon())?.id ?? null
    return p
  }).catch(() => null)
  // One call at a time, in order, so `last` is always the id the phone holds.
  let queue = ready
  store.watch(['accent', 'accentCustom'])?.(() => {
    queue = queue.then(async () => {
      const p = await ready
      const id = accentIcon(store.get())
      if (!p || id === last) return
      await p.I.setIcon({ id })
      last = id
    }).catch(() => {})
  })
}

export function _resetAccentIconForTests() { pluginP = null; started = false }
