// Strength level from thresholds the user typed in from strengthlevel.com (hevier/DECISIONS.md
// D19). The app bundles no standards and never fetches the site: it only links to it. Each entry
// in S.hvStrength keeps the unit it was typed in, since upstream's unit switch and sync convert
// only the weights they know about; it is converted here for display.
import { convertWeight } from '../../lib/units.js'

export const LEVELS = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite']

// openGym exercise id → strengthlevel.com's standards page. Only makes the link land on the right
// page; it holds no data from the site. An exercise not listed opens the standards index.
const SLUGS = {
  '0025': 'bench-press', '0043': 'squat', '3593': 'squat', '0032': 'deadlift', '1162': 'military-press',
  '0027': 'bent-over-row', '0031': 'barbell-curl', '0042': 'front-squat', '1060': 'hip-thrust',
  '0047': 'incline-bench-press', '0095': 'barbell-shrug', '0289': 'dumbbell-bench-press',
  '0334': 'dumbbell-lateral-raise',
}

export function compareUrl(exId, unit) {
  const slug = SLUGS[exId]
  return 'https://strengthlevel.com/strength-standards' + (slug ? `/${slug}/${unit === 'lb' ? 'lb' : 'kg'}` : '')
}

/** Five rising, positive numbers, or null. */
export function validLevels(lv) {
  if (!Array.isArray(lv) || lv.length !== LEVELS.length) return null
  const n = lv.map(Number)
  return n.every((v, i) => Number.isFinite(v) && v > 0 && (i === 0 || v > n[i - 1])) ? n : null
}

/** The stored entry's thresholds in `unit`, or null when there is no usable entry. */
export function levelsIn(entry, unit) {
  const lv = validLevels(entry?.lv)
  return lv && lv.map(v => convertWeight(v, entry.u || unit, unit))
}

/**
 * Where `oneRm` stands against the thresholds `lv` (same unit): { level, next, toNext, pos }.
 * `level` is the index reached (-1 below Beginner), `next` the one after it (null past Elite),
 * `toNext` the weight still missing, and `pos` 0–1 along a bar of five equal bands, one per level,
 * starting at Beginner (below it the marker sits at the start).
 */
export function strengthLevel(oneRm, lv) {
  const level = lv.findLastIndex(v => oneRm >= v)
  const next = level + 1 < lv.length ? level + 1 : null
  const toNext = next == null ? 0 : lv[next] - oneRm
  let pos
  if (level < 0) pos = 0
  else if (next == null) pos = 1
  else pos = (level + (oneRm - lv[level]) / (lv[next] - lv[level])) / lv.length
  return { level, next, toNext, pos }
}

/** Saves (or with `lv` null removes) an exercise's thresholds in S, in place. */
export function setLevels(S, exId, lv, unit, d) {
  const all = { ...(S.hvStrength || {}) }
  if (lv) all[exId] = { lv, u: unit, d }
  else delete all[exId]
  S.hvStrength = all
}

/**
 * Every exercise with levels (`hvStrength`), grouped by the level its best 1RM reaches, for the
 * Strength levels page: Elite first, down to Below Beginner (`level` -1), then the exercises with
 * levels and no 1RM logged yet (`level` null). `oneRmOf(exId)` gives the best estimated 1RM in
 * `unit`, or nothing. Inside a group, nearest the next level first.
 */
export function levelGroups(hvStrength, unit, oneRmOf) {
  const groups = new Map()
  for (const [id, entry] of Object.entries(hvStrength || {})) {
    const lv = levelsIn(entry, unit)
    if (!lv) continue
    const oneRm = Number(oneRmOf(id)) || 0
    const at = oneRm > 0 ? strengthLevel(oneRm, lv) : null
    const level = at ? at.level : null
    if (!groups.has(level)) groups.set(level, [])
    groups.get(level).push({ id, oneRm, next: at?.next ?? null, toNext: at?.toNext ?? 0, pos: at?.pos ?? 0 })
  }
  const order = [...LEVELS.keys()].reverse().concat(-1, null)
  return order.filter(l => groups.has(l)).map(level => ({
    level, items: groups.get(level).sort((a, b) => b.pos - a.pos || a.id.localeCompare(b.id)),
  }))
}
