// Seam S9's hand-off (frontend/src/sheets.jsx). Upstream's finish asks this object first: when the
// fork has filled it in (hevier/index.js, only with the flag on), Finish opens the fork's Save
// Workout page instead of upstream's confirm, and a saved workout opens the fork's summary instead
// of upstream's. Empty, as in upstream's own tests, both are upstream's. No imports, so the seam
// adds nothing to what sheets.jsx loads.
export const finishHook = {
  finish: null,   // () => void: Finish was asked for (the session is not saved yet)
  done: null,     // ({ w, prs, e1prs }) => void: upstream saved the session as `w`
}

export const SAVE_PATH = '/workout/save'
export const DONE_PATH = '/workout/done'

/** Points both hand-offs at the fork's pages (hevier/views/SaveWorkout.jsx). */
export function installFinishHook(nav) {
  finishHook.finish = () => nav(SAVE_PATH)
  // The summary takes the Save page's history entry, so back from it does not land on a page
  // whose session is gone.
  finishHook.done = ({ w, e1prs }) =>
    nav(DONE_PATH, { replace: true, state: { ref: { id: w.id, d: w.d, start: w.start }, e1prs } })
}
