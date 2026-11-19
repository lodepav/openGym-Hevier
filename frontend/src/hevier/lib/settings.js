// Hevy's Settings over upstream's pages (hevier/DECISIONS.md D16). The root is regrouped under
// titles (seam S11); a page keeps upstream's rows except those that only steer upstream's own
// workout layouts, which the fork's one Hevy layout never reads (D1, D3, D4, D7), and the theme and
// accent pickers (D17). They are left out of the page's element tree before it renders (seam S12),
// so upstream's Settings.jsx keeps every row and the fork edits none of them.
import { Children, Fragment, cloneElement, isValidElement } from 'react'
import { Section } from '../../components/ui.jsx'
import { fmtPlate } from '../../lib/format.js'
import { moduleOn } from './fork-modules.js'

// The root, top to bottom. `account` puts upstream's account card first in its group.
export const SETTINGS_GROUPS = [
  { title: 'Account', account: true, ids: ['reminders'] },
  // `hv:` ids are the fork's own rows (DECISIONS.md D18, D21, D42), the rest upstream's pages (D16).
  { title: 'Workout', ids: ['workout', 'alerts', 'equipment', 'plan'] },
  { title: 'Stats', ids: ['hv:volume'] },
  // Upstream's Modules page (1.4.4, D97): which parts of the app, the fork's with them.
  { title: 'App', ids: ['modules', 'units', 'look'] },
  { title: 'Data & more', ids: ['data', 'integrations', 'coach', 'about'] },
]

// Rows by their English title (the key upstream passes to t()), per page.
export const HIDDEN_ROWS = {
  workout: ['Shown under each exercise', 'Layout', 'Collapse completed exercises', 'Skip completed exercises', 'Exercise animations',
    // 1.4.5: the fork's routine page is the preview (D113); no daily check-in (D107, D109); leaving
    // the gym needs upstream's gym reminder, which the fork has not (D47).
    'Preview before starting', 'Daily check-in', 'End by itself when I leave the gym',
    // Until the fork's workout has them (D107, D108): upstream's switches would steer nothing here.
    'Record trophies', 'Cheer on a record', 'How close to a record', 'Next exercise when the rest ends', 'Start button'],
  // One look (D17): no light theme, no accent choice, no seasonal themes. No gym check-in on Home (D12).
  look: ['Theme', 'Accent color', 'Seasonal themes',
    // 1.4.4 (D100): no NFC stickers, no app icon picker (its search hit; the row goes by type), no
    // Assistant or Siri shortcuts (the manifest overlay removes them). Upstream's new Home cards stay
    // hidden: Today's layout is fixed (D134).
    'Set up an NFC sticker', 'App icon', 'Assistant & shortcuts', 'Siri & Shortcuts', 'Recovery tips', 'Week and month recap', 'Weekly sets on Home', 'Monthly challenges',
    // 1.4.5 (D109): no recovery sessions, no activities from other apps.
    'Recovery counts for the streak', 'Sport counts for the streak',
    // D134: Today's layout is fixed, so Home has no body weight card to switch (S.showWeightCard stays).
    'Body weight'],
  // No target ranges for weekly sets (D139).
  plan: ['Weekly sets per muscle'],
  // The gym filter is the picker's (D62): no switch, no active gym here.
  equipment: ['Filter by equipment', 'Active gym'],
  // D69 decides how a routine opens; the muscle map is for upstream's layouts (#670).
  advanced: ['Weight and reps buttons', 'Drop and burst shortcuts on every set', 'Exercise chips at the top',
    'Superset buttons in the exercise header', 'Move, swap and remove buttons below the exercise',
    'Planned sessions start from', 'Muscle map at the top',
    // 1.4.4 (D100): holds that run themselves, for now (D53, D89 time them).
    'Timed holds start by themselves',
    // 1.4.5 (D109): no deload weeks.
    'Deload weeks', 'Suggest a deload when I need one'],
  // The fork's gyms are D47's.
  reminders: ['Gym reminder'],
  // D41's step per exercise is the only one (D111).
  units: ['Weight step'],
  // No support rows: the section goes with them (2026-10-26, the user's choice).
  // The modules the fork never shows (D97, S54 leaves them off the page): no search hit either.
  modules: ['Form videos', 'Gym check-in', 'AI Coach', 'Seasonal themes', 'Community', 'Watch'],
  about: ['Rate openGym on the App Store', 'Rate openGym on Google Play', 'Buy me a coffee', 'Ko-fi', 'GitHub Sponsors',
    // 1.4.4 (D100): the tour and its tutorials point at upstream's screens, which the fork replaces.
    'Show the tour again', 'Build your first plan', 'Create your own exercise', 'Edit your data', 'Export & import'],
}
// Pages left out whole: not found by the search, nor any row on them.
export const HIDDEN_PAGES = ['gym', 'themes', 'zepp', 'wear', 'garmin', 'watch', 'watches']   // no watch at all (D100, D121, D106)
// A section whose footer speaks of rows that are gone loses the footer.
const STALE_FOOTERS = ['Everything hidden here stays one tap away: the ⋯ button of an exercise and the number of a set.']

/** Whether a settings search hit is a row the fork leaves out. */
export const hiddenSetting = hit => HIDDEN_PAGES.includes(hit.page) || (!hit.isPage && (HIDDEN_ROWS[hit.page] || []).includes(hit.title))

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
 * `types`: components upstream draws a row with instead of a titled Row, left out wherever they
 * are (the caller's, so this stays free of views: Android's app icon picker, D100). `props`: a Map
 * of such a component to the props it is drawn with instead, for one that hides a row itself.
 */
export function prunePage(page, tree, tr, types = [], props = new Map()) {
  const hiddenTypes = new Set(types)
  const hide = new Set((HIDDEN_ROWS[page] || []).map(k => tr(k)))
  const stale = new Set(STALE_FOOTERS.map(k => tr(k)))
  if (!hide.size) return tree
  const walk = node => {
    if (!isValidElement(node)) return node
    if (hide.has(titleOf(node)) || hiddenTypes.has(node.type)) return null
    if (props.has(node.type)) return cloneElement(node, props.get(node.type))
    if (node.props.children === undefined) return node
    const kids = Children.toArray(node.props.children).map(walk).filter(k => k != null && k !== false)
    const isSection = node.type === Section
    // A section or a fragment left with no rows goes. (cloneElement given no children keeps the
    // old ones, so an emptied element says so: upstream 1.4.4 groups its support rows in one.)
    if (!kids.length && (isSection || node.type === Fragment)) return null
    const extra = isSection && stale.has(node.props.footer) ? { footer: undefined } : {}
    return kids.length ? cloneElement(node, extra, ...kids) : cloneElement(node, { ...extra, children: undefined })
  }
  return walk(tree)
}

/**
 * A page's element tree with `el` added at the end of the Section titled `title` (`title` already
 * translated), or the tree as it was when there is none: a fork row among upstream's (D84).
 */
export function appendToSection(tree, title, el) {
  let done = false
  const walk = node => {
    if (done || !isValidElement(node) || node.props.children === undefined) return node
    if (node.type === Section && node.props.title === title) {
      done = true
      return cloneElement(node, {}, ...Children.toArray(node.props.children), el)
    }
    const next = Children.toArray(node.props.children).map(walk)
    return done ? cloneElement(node, {}, ...next) : node
  }
  return walk(tree)
}

/** Whether the set table shows upstream's plate line (D84): off unless switched on. */
// Off by default (D84), and off with upstream's Plates and warm-ups module (D97).
export const plateLineOn = S => S?.hvPlateLine === true && moduleOn(S, 'plates')

/** Whether a warm-up row has an effort cell (D120): on unless switched off. */
export const warmupEffortOn = S => S?.hvWarmupEffort !== false

// Options relabelled, per page and row title: Weight decimals reads 0.5 / 0.25 upstream, but its
// second choice shows any weight to the hundredth, 20.41 kg included (DECISIONS.md D40).
export const RELABELLED = { units: { 'Weight decimals': { 1: 0.1, 2: 0.01 } } }

/** A page's element tree with the options of `RELABELLED`'s rows renamed, values unchanged. */
export function relabelPage(page, tree, tr) {
  const rows = Object.entries(RELABELLED[page] || {}).map(([k, v]) => [tr(k), v])
  if (!rows.length) return tree
  const walk = (node, labels) => {
    if (!isValidElement(node)) return node
    const mine = rows.find(([k]) => k === titleOf(node))?.[1] || labels
    const opts = mine && Array.isArray(node.props.options)
      ? { options: node.props.options.map(o => (o.value in mine ? { ...o, label: fmtPlate(mine[o.value]) } : o)) } : null
    if (node.props.children === undefined) return opts ? cloneElement(node, opts) : node
    return cloneElement(node, opts || {}, ...Children.toArray(node.props.children).map(k => walk(k, mine)))
  }
  return walk(tree, null)
}

// Equipment's page is upstream's EquipmentCard, whose rows only show once it renders. The fork's
// gyms page renders it in its own place (so a hook upstream adds there stays this component's) and
// edits the rows: D62's hidden ones out, its footer and its add row in the words of gyms.
export function GymsPage({ card, tr }) {
  const tree = typeof card?.type === 'function' ? card.type(card.props) : card
  const footer = tr('Each gym’s equipment. The exercise picker shows what the workout’s gym has; outside a workout, choose a gym in its equipment filter.')
  const walk = node => {
    if (!isValidElement(node)) return node
    const extra = node.type === Section ? { footer }
      : node.props.title === tr('Add equipment profile') ? { title: tr('Add gym') } : {}
    if (node.props.children === undefined) return Object.keys(extra).length ? cloneElement(node, extra) : node
    return cloneElement(node, extra, ...Children.toArray(node.props.children).map(walk))
  }
  return walk(prunePage('equipment', tree, tr))
}
