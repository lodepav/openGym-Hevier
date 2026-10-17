// A secret kept on the phone, encrypted with a key from the Android Keystore (HevierSecretPlugin.java,
// seam S24): the Hevy API key of the export to Hevy (hevier/DECISIONS.md D34). Never in S, so it is
// in no backup and no sync. Anywhere else (the PWA, the iPhone build) there is no such place, and
// every call answers as if nothing were kept.
import { MOBILE, isAndroid } from '../../lib/mobile.js'

// Wrapped in an object: a Capacitor plugin proxy answers `then` (as in lib/health-sync.js).
let pluginP = null
async function plugin() {
  if (!MOBILE || !(await isAndroid())) return null
  if (!pluginP) pluginP = import('@capacitor/core').then(({ registerPlugin }) => ({ S: registerPlugin('HevierSecret') }))
  return pluginP
}

/** Whether this build can keep a secret. */
export const canKeepSecrets = async () => !!(await plugin())

/** The secret named `name`, or null. */
export async function getSecret(name) {
  const p = await plugin()
  if (!p) return null
  try { return (await p.S.get({ name }))?.value ?? null } catch { return null }
}

/** Keeps `value` under `name`; false when it could not be kept. */
export async function putSecret(name, value) {
  const p = await plugin()
  if (!p) return false
  try { await p.S.put({ name, value: String(value) }); return true } catch { return false }
}

export async function removeSecret(name) {
  const p = await plugin()
  if (!p) return
  try { await p.S.remove({ name }) } catch { /* nothing kept */ }
}
