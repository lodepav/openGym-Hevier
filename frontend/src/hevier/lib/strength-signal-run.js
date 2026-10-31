// The wiring around strength-signal.js (D95): keeps the row OpenBite reads up to date on the phone,
// a little after each change of the log and on every return to the app (the three weeks move on).
// HevierStrengthPlugin.java holds it; HevierStrengthProvider.java answers OpenBite from it.
import { MOBILE, isAndroid } from '../../lib/mobile.js'
import { strengthSignal } from './strength-signal.js'

// Wrapped in an object: a Capacitor plugin proxy answers `then` (as in lib/secret.js).
let pluginP = null
async function plugin() {
  if (!MOBILE || !(await isAndroid())) return null
  if (!pluginP) pluginP = import('@capacitor/core').then(({ registerPlugin }) => ({ P: registerPlugin('HevierStrength') }))
  return pluginP
}

async function push(S, today) {
  const p = await plugin()
  if (!p) return
  const row = strengthSignal(S, today)
  await p.P.put({ row: row ? JSON.stringify(row) : null })
}

let started = false
export function initStrengthSignal(store, todayOf) {
  if (!MOBILE || started) return
  started = true
  const send = () => push(store.get(), todayOf()).catch(() => {})
  setTimeout(send, 2500)
  import('@capacitor/app').then(({ App }) => {
    App.addListener('appStateChange', ({ isActive }) => { if (isActive) send() })
  }).catch(() => {})
  let tm = null
  store.watch(['workouts', 'hvMainMuscle'])?.(() => {
    clearTimeout(tm)
    tm = setTimeout(send, 2000)
  })
}
