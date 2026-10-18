// The home-screen month widget's data (hevier/DECISIONS.md D44). A widget
// draws without the app, so the page hands the fork's native widget (HevierWidgetPlugin.java) a
// small snapshot whenever the log changes: the trained days of this month and the last one, each
// with its calendar kind (item 25's colours), each month's "N workouts · N sets" in the app's
// language, the month names and weekday letters, and the week's first day. The widget draws the
// month the phone is in, so it turns the page at midnight on its own; a month the snapshot does not
// have yet has no workouts. Nothing here is stored in S.
import { t, tn } from '../../lib/i18n.js'
import { workoutDay } from '../../lib/history.js'
import { DAYS, MONTHS_LONG, weekStartOf, weekOrder } from '../../lib/format.js'
import { MOBILE, isAndroid } from '../../lib/mobile.js'
import { workSets } from './volume.js'
import { dayKind } from './calendar.js'
import { countedWorkouts } from './counted.js'

export const WIDGET_SNAPSHOT_VERSION = 1

const pad = n => String(n).padStart(2, '0')
const monthKey = (y, mo) => `${y}-${pad(mo + 1)}`
const monthsOf = today => {
  const d = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, 1)
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  return [monthKey(prev.getFullYear(), prev.getMonth()), monthKey(d.getFullYear(), d.getMonth())]
}

/** A month's line: "12 workouts · 148 sets", or the empty month's words. */
export const summaryOf = (workouts, sets) => (workouts
  ? `${tn('{0} workout', '{0} workouts', workouts)} · ${tn('{0} set', '{0} sets', sets)}`
  : t('No workouts this month'))

/**
 * The snapshot for `today` (ISO): { v, ws, months [12 names], days [7 letters, from ws],
 * kinds { iso: 'strength' | 'cardio' | 'deload' }, totals { 'YYYY-MM': line }, empty }.
 * Sets are ticked work sets (D18's count), as the monthly report counts them.
 */
export function widgetSnapshot(S, today) {
  const keep = new Set(monthsOf(today))
  const byDay = new Map()
  const totals = new Map()
  for (const w of S?.workouts || []) {
    const d = workoutDay(w)
    if (!d || !keep.has(d.slice(0, 7))) continue
    if (!byDay.has(d)) byDay.set(d, [])
    byDay.get(d).push(w)
  }
  // The days show every workout; the line counts as the monthly report does (D57).
  for (const w of countedWorkouts(S?.workouts)) {
    const d = workoutDay(w)
    if (!d || !keep.has(d.slice(0, 7))) continue
    const m = totals.get(d.slice(0, 7)) || { n: 0, sets: 0 }
    m.n++
    m.sets += workSets(w.entries)
    totals.set(d.slice(0, 7), m)
  }
  const ws = weekStartOf(S)
  return {
    v: WIDGET_SNAPSHOT_VERSION,
    ws,
    months: MONTHS_LONG.map(m => t(m)),
    days: weekOrder(ws).map(d => t(DAYS[d])),
    kinds: Object.fromEntries([...byDay].sort(([a], [b]) => a.localeCompare(b)).map(([d, list]) => [d, dayKind(list)])),
    totals: Object.fromEntries([...totals].map(([k, m]) => [k, summaryOf(m.n, m.sets)])),
    empty: summaryOf(0, 0),
  }
}

// ---------- the bridge (Android only)

let pluginP = null
async function plugin() {
  if (!MOBILE || !(await isAndroid())) return null
  // Wrapped in an object: a Capacitor plugin proxy answers `then`.
  if (!pluginP) pluginP = import('@capacitor/core').then(({ registerPlugin }) => ({ W: registerPlugin('HevierWidget') }))
  return pluginP
}

let last = ''
/** Hands the widget a new snapshot when it differs from the last one sent. */
export async function pushWidget(S, today) {
  const p = await plugin()
  if (!p) return false
  const json = JSON.stringify(widgetSnapshot(S, today))
  if (json === last) return false
  await p.W.update({ snapshot: json })
  last = json
  return true
}

/** The route a tap on the widget asked for, once (null: none). */
export async function takeWidgetRoute() {
  const p = await plugin()
  if (!p) return null
  const { route } = await p.W.takeRoute().catch(() => ({ route: null }))
  return route === '/calendar' ? route : null      // the widget's only route (the plugin checks too)
}

/**
 * At launch (hevier/index.js): a snapshot after start-up, a little after each change of the log,
 * and on every return to the app (the day may have turned); a tap on the widget opens its route.
 */
let started = false
export function initMonthWidget(getState, subscribe, go, todayOf) {
  if (!MOBILE || started) return
  started = true
  const push = () => pushWidget(getState(), todayOf()).catch(() => {})
  const route = () => takeWidgetRoute().then(r => { if (r) go(r) }).catch(() => {})
  setTimeout(() => { push(); route() }, 1500)
  import('@capacitor/app').then(({ App }) => {
    App.addListener('appStateChange', ({ isActive }) => { if (isActive) { push(); route() } })
  }).catch(() => {})
  // Debounced, and sent only when the snapshot changed (pushWidget), so a set typed in a running
  // workout costs a JSON string every few seconds, not a widget redraw.
  let tm = null
  subscribe?.(() => {
    clearTimeout(tm)
    tm = setTimeout(push, 2000)
  })
}
