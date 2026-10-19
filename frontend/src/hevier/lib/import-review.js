// The review of an import's exercise matches (hevier/DECISIONS.md D33, seam S23): the titles a parse
// asked about (`hvTitles`, from hevy-import.js), what each becomes, the user's choices in
// `S.hvImportMap`, and the file read again once a choice changes. Beside it, the cable exercises'
// setups (D43): a title's own tag, else the choice in `S.hvImportCable`, else 1:1, to confirm.
import { parseHevyWorkouts, parseHevyRoutines } from '../../lib/import-hevy.js'
import { outcomeOf, brandNorm } from './hevy-import.js'
import { hooks } from '../hooks.js'
import { isCable, knownBrands } from './gym-labels.js'
import { nameFolders } from './hevy-folders.js'

// One choices object per version of the map and the custom exercises, so hevy-import.js's
// memo holds for a whole parse (its `choices`).
let last = null
export function choicesFor(S) {
  if (!last || last.map !== S?.hvImportMap || last.custom !== S?.customEx || last.cables !== S?.hvImportCable
    || last.machines !== S?.hvMachines || last.workouts !== S?.workouts) {
    // Your own brands, by their letters and digits, for a title's single bracket.
    const brands = new Map(knownBrands(S).map(b => [brandNorm(b), b]).filter(([k]) => k.length >= 2))
    last = { map: S?.hvImportMap, custom: S?.customEx, cables: S?.hvImportCable, machines: S?.hvMachines, workouts: S?.workouts,
      ctx: { map: S?.hvImportMap || null, cables: S?.hvImportCable || null, known: new Set((S?.customEx || []).map(c => c?.id)), customEx: S?.customEx || [], brands } }
  }
  return last.ctx
}

/** The CSV path: how to read the same file again (S23, `importFromApp`). */
export function keep(parsed, redo) { parsed.hvRedo = redo }

/**
 * Every title the import asked about, once per brand: the CSV's, or the API's workouts and
 * routines. `key` is the title's without its brand (the review's), `cableKey` with it (D43).
 */
export function titlesOf(parsed) {
  const all = [...(parsed?.hvTitles || []), ...(parsed?.workouts?.hvTitles || []), ...(parsed?.routines?.hvTitles || [])]
  const out = new Map()
  for (const t of all) {
    const key = t.source + '|' + t.title.toLowerCase()
    const cableKey = key + (t.brand ? '|' + t.brand.toLowerCase() : '')
    if (!out.has(cableKey)) out.set(cableKey, { ...t, key, cableKey })
  }
  return [...out.values()]
}

const outcomes = (titles, S) => {
  const choices = choicesFor(S)
  return titles.map(t => ({ ...t, ...outcomeOf(t.title, t.source, choices) }))
}

/** The list the review shows: { key, title, source, id, chosen }, once per title, the user's own exercises first. */
export function reviewList(titles, S) {
  const once = [...new Map(titles.map(t => [t.key, t])).values()]
  return outcomes(once, S)
    .sort((a, b) => (!a.id !== !b.id ? (a.id ? 1 : -1) : a.title.localeCompare(b.title)))
}

/**
 * The cable exercises among them, one per brand, A to Z: { cableKey, title, brand, id, cable,
 * tagged, chosen }. `cable` is the title's tag, else the choice (its brand's, else the title's
 * without a brand, as kept before brands had their own), else 1:1 (`chosen` false: assumed, to confirm).
 */
export function cableList(titles, S) {
  return outcomes(titles, S).filter(x => x.id && isCable(x.id)).map(x => {
    const own = S?.hvImportCable?.[x.cableKey] || S?.hvImportCable?.[x.key]
    return { ...x, cable: x.cable || own || '1:1', tagged: !!x.cable, chosen: !x.cable && !!own }
  }).sort((a, b) => a.title.localeCompare(b.title) || (a.brand || '').localeCompare(b.brand || ''))
}

const put = (S, field, key, value) => {
  const map = { ...(S[field] || {}) }
  if (value == null) delete map[key]
  else map[key] = value
  if (Object.keys(map).length) S[field] = map
  else delete S[field]
}

/** Stores a choice (`null` removes it). Mutates the store draft `S`. */
export const choose = (S, key, value) => put(S, 'hvImportMap', key, value)
/** Stores a cable setup for a title ('1:1', '2:1' or 'x2'; `null` removes it). Mutates `S`. */
export const chooseCable = (S, key, value) => put(S, 'hvImportCable', key, value)

/**
 * Reads the import again, into the same `parsed` object the sheet shows. The import hooks read the
 * choices from the store, where the sheet has just written them; `S` is for the unit and exercises.
 */
export function rerun(parsed, S) {
  if (parsed.hvRedo) { Object.assign(parsed, parsed.hvRedo(), { hvRedo: parsed.hvRedo }); return }
  const src = parsed.hvSource
  if (!src) return
  const opts = { unit: S.unit, customEx: S.customEx }
  const workouts = hooks.importDone(parseHevyWorkouts(src.workouts, src.templates, opts))
  const routines = hooks.importDone(parseHevyRoutines(src.routines, src.templates, opts))
  if (parsed.hvFolders) nameFolders(routines, parsed.hvFolders)
  Object.assign(parsed, { workouts, routines })
}
