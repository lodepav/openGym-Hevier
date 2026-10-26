// One look (hevier/DECISIONS.md D17): upstream's seasonal themes (1.4.3, lib/seasonal.js) stay off
// in the fork, and their page is left out of Settings (D16). Upstream's Auto would put a Halloween
// layer and colours on every screen in its weeks, so each theme is stored Off: once on install, and
// again whenever a sync brings another choice. Upstream's own UI reads the same Off.
import { THEME_IDS } from '../../lib/seasonal.js'

/** Whether any seasonal theme is not stored Off. */
export const seasonsOn = S => THEME_IDS.some(id => S?.seasonal?.[id] !== 'off')

/** Stores every seasonal theme Off (a store draft `s`, mutated), its other settings kept. */
export function seasonsOff(s) {
  s.seasonal = { ...(s.seasonal || {}), ...Object.fromEntries(THEME_IDS.map(id => [id, 'off'])) }
}

export function initSeasonsOff(store) {
  const run = () => { if (seasonsOn(store.get())) store.update(seasonsOff) }
  run()
  store.watch(['seasonal'])?.(run)
}
