// The review of an import's exercise matches (hevier/DECISIONS.md D33, seam S23): the titles a parse
// asked about (`hvTitles`, from hevy-import.js), what each becomes, the user's choices in
// `S.hvImportMap`, and the file read again once a choice changes.
import { parseHevyWorkouts, parseHevyRoutines } from '../../lib/import-hevy.js'
import { importDone, outcomeOf, useChoices } from './hevy-import.js'
import { nameFolders } from './hevy-folders.js'

// One choices object per version of the map and the custom exercises, so hevy-import.js's
// memo holds for a whole parse.
let last = null
export function choicesFor(S) {
  if (!last || last.map !== S?.hvImportMap || last.custom !== S?.customEx) {
    last = { map: S?.hvImportMap, custom: S?.customEx,
      ctx: { map: S?.hvImportMap || null, known: new Set((S?.customEx || []).map(c => c?.id)) } }
  }
  return last.ctx
}

/** The CSV path: how to read the same file again (S23, `importFromApp`). */
export function keep(parsed, redo) { parsed.hvRedo = redo }

/** Every title the import asked about, once: the CSV's, or the API's workouts and routines. */
export function titlesOf(parsed) {
  const all = [...(parsed?.hvTitles || []), ...(parsed?.workouts?.hvTitles || []), ...(parsed?.routines?.hvTitles || [])]
  const out = new Map()
  for (const t of all) { const k = t.source + '|' + t.title.toLowerCase(); if (!out.has(k)) out.set(k, { ...t, key: k }) }
  return [...out.values()]
}

/** The list the review shows: { key, title, source, id, chosen }, the user's own exercises first. */
export function reviewList(titles, S) {
  useChoices(choicesFor(S))
  return titles.map(t => ({ ...t, ...outcomeOf(t.title, t.source) }))
    .sort((a, b) => (!a.id !== !b.id ? (a.id ? 1 : -1) : a.title.localeCompare(b.title)))
}

/** Stores a choice (`null` removes it). Mutates the store draft `S`. */
export function choose(S, key, value) {
  const map = { ...(S.hvImportMap || {}) }
  if (value == null) delete map[key]
  else map[key] = value
  if (Object.keys(map).length) S.hvImportMap = map
  else delete S.hvImportMap
}

/** Reads the import again with the choices in `S`, into the same `parsed` object the sheet shows. */
export function rerun(parsed, S) {
  useChoices(choicesFor(S))
  if (parsed.hvRedo) { Object.assign(parsed, parsed.hvRedo(), { hvRedo: parsed.hvRedo }); return }
  const src = parsed.hvSource
  if (!src) return
  const opts = { unit: S.unit, customEx: S.customEx }
  const workouts = importDone(parseHevyWorkouts(src.workouts, src.templates, opts))
  const routines = importDone(parseHevyRoutines(src.routines, src.templates, opts))
  if (parsed.hvFolders) nameFolders(routines, parsed.hvFolders)
  Object.assign(parsed, { workouts, routines })
}
