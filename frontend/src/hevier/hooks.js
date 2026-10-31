// The hand-offs of the fork's hook seams: each entry names its seam (hevier/SEAMS.md lists where it
// sits). Upstream's code asks this object first; the fork fills it in only with the flag on
// (hevier/index.js). Empty, as in upstream's own tests, everything is upstream's. No imports, so
// the seams add nothing to what the upstream files load.
export const hooks = {
  finish: null,   // () => void: Finish was asked for (the session is not saved yet) (S9)
  done: null,     // ({ w, prs, e1prs }) => void: upstream saved the session as `w`; the fork reads `w` only (S9)
  exerciseDetail: null,   // (ex) => void: an exercise's details were asked for (S10)
  workoutDetail: null,    // (w) => void: a finished workout's details were asked for (S14)
  exercisePicker: null,   // (onPick, { title, like }) => sheet handle: an exercise picker was asked for (S13)
  backEvent: null,        // (ev) => ev: Android back's event before upstream's handler reads it (S16)
  settings: null,  // { root(props), page(id, tree), hides(hit) }: the Settings root and pages (S11, S12)
  importExercise: null,  // (title, source) => id | key | null: an imported exercise's match, before upstream's (S19)
  importDone: null,      // (parsed) => parsed: an import's parse result, keys turned back into ids (S19)
  hevyFolders: null,     // { fetch(key, data), merged(S, parsed, res) }: Hevy's routine folders (S20)
  importReview: null,    // { keep(parsed, redo), Row }: the import's review of exercise matches (S23)
  weighIns: null,        // (opts) => true when upstream's weigh-in sheet is not to open (S22)
  noDumbbellsRowOff: false, // true: the dumbbell sheet has no "I own no dumbbells" switch (S49)
  settingsAutosave: false, // true: the live workout's Exercise settings save as they close (S50)
  secondsStep: null,     // seconds a row of the duration wheel's seconds column (S28)
  defaultProg: null,     // the progression rule of an exercise and routine with none of their own (S35)
  defaultMode: null,     // (id) => 'time' | null: a freshly added exercise's mode, before upstream's (S32)
  defaultSide: null,     // (id) => bool: a freshly added exercise is per side (S32, D75)
  statsS: null,          // (S) => S, a React hook: the log upstream's statistics pages read (S34)
  gymSheet: null,        // { equipment(p), saved(p), note(), Chips }: an equipment profile's sheet, a gym's (S36)
  equipFilter: null,     // (S) => { profile, has(ex) }: the gym upstream's muscle explorer filters by (S37)
  equipChips: null,      // { on(v, kinds), has(v, ex), Chips }: the muscle explorer's equipment strip (S38)
  muscleChips: null,     // { Chips, share(v, ex), name(v), map(v) }: the muscle explorer's muscles by group (S39)
  plainRoutine: null,    // { is(routine), rows(H, S, cfg, routine, sets) }: a routine without progression's rows (S40)
  exName: null,          // (ex) => name | null: the name shown in place of an exercise's own (S41)
  sheetState: null,     // (state) => state: a sheet's history entry, numbered for the router (S47)
  setMode: null,         // (set) => 'time' | null: the kind of set a row is, before its exercise's (S48)
  hevyMore: null,        // { day, exercise, workout, routineExercise, fetched, merged, hasMore, Rows, toast }: the rest of the Hevy API (S21)
}

export const SAVE_PATH = '/workout/save'
export const DONE_PATH = '/workout/done'

/** Points both hand-offs at the fork's pages (hevier/views/SaveWorkout.jsx). */
export function installFinishHook(nav) {
  hooks.finish = () => nav(SAVE_PATH)
  // The summary takes the Save page's history entry, so back from it does not land on a page
  // whose session is gone.
  // Its records are the fork's, read from the log (D51), not upstream's `prs` / `e1prs`.
  hooks.done = ({ w }) =>
    nav(DONE_PATH, { replace: true, state: { ref: { id: w.id, d: w.d, start: w.start } } })
}
