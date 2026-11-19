// Hevy's login screen (HevierHevyLoginPlugin.java, hevier/DECISIONS.md D138): resolves with the
// value of hevy.com's session cookie, or null when the screen was closed or there is none (the
// PWA, the iPhone build).
import { MOBILE, isAndroid } from '../../lib/mobile.js'

export async function hevyLogin() {
  if (!MOBILE || !(await isAndroid())) return null
  try {
    const { registerPlugin } = await import('@capacitor/core')
    return (await registerPlugin('HevierHevyLogin').login())?.cookie || null
  } catch { return null }
}
