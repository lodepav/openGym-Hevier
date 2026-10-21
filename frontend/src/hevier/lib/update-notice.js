// A new Go Hevier version offers itself when the app is opened (hevier/DECISIONS.md D77): upstream's
// updater (lib/update.js, the fork's releases since S6) only answers on Settings → About. The
// notice is a sheet with Install and Not now; Not now, or a tap outside, is that version's answer,
// kept on the device (`hevier_update_seen`), and About still offers it.

export const SEEN_KEY = 'hevier_update_seen'

/** Whether to offer `info` (upstream's checkForUpdate answer) now: a newer version with an APK,
 *  not yet answered (`seen`, the version last offered), and no workout open (`busy`). */
export function shouldOffer(info, seen, busy) {
  if (!info?.hasUpdate || !info.apkUrl || !info.latestVersion) return false
  if (busy) return false
  return info.latestVersion !== seen
}

export const readSeen = () => { try { return localStorage.getItem(SEEN_KEY) || '' } catch { return '' } }
export const writeSeen = v => { try { localStorage.setItem(SEEN_KEY, v) } catch { /* private mode */ } }
