// The hand-offs of the fork's hook seams: S9, S10, S13 and S14 (frontend/src/sheets.jsx), S11 and
// S12 (frontend/src/views/Settings.jsx), S16 (frontend/src/lib/back.js). Upstream's code asks this
// object first: when the fork has filled it in (only with the flag on), Finish opens the fork's
// Save Workout page instead of upstream's confirm, a saved workout opens the fork's summary instead
// of upstream's, an exercise's details open the fork's tabbed sheet, a finished workout the fork's
// Workout Detail page, an exercise picker the fork's Hevy picker, Settings is regrouped, and
// Android back on a tab screen offers to exit. Empty, as in upstream's own tests, all are
// upstream's. No imports, so the seams add nothing to what the upstream files load.
export const hooks = {
  finish: null,   // () => void: Finish was asked for (the session is not saved yet)
  done: null,     // ({ w, prs, e1prs }) => void: upstream saved the session as `w`
  exerciseDetail: null,   // (ex) => void: an exercise's details were asked for (S10)
  workoutDetail: null,    // (w) => void: a finished workout's details were asked for (S14)
  exercisePicker: null,   // (onPick, { title, like }) => sheet handle: an exercise picker was asked for (S13)
  backEvent: null,        // (ev) => ev: Android back's event before upstream's handler reads it (S16)
  settings: null,  // { root(props), page(id, tree), hides(hit) }: the Settings root and pages (S11, S12)
}

export const SAVE_PATH = '/workout/save'
export const DONE_PATH = '/workout/done'

/** Points both hand-offs at the fork's pages (hevier/views/SaveWorkout.jsx). */
export function installFinishHook(nav) {
  hooks.finish = () => nav(SAVE_PATH)
  // The summary takes the Save page's history entry, so back from it does not land on a page
  // whose session is gone.
  hooks.done = ({ w, e1prs }) =>
    nav(DONE_PATH, { replace: true, state: { ref: { id: w.id, d: w.d, start: w.start }, e1prs } })
}
