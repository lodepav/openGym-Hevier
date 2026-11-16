// Android back on a tab screen (Today, Lifts, History; D126) offers to exit, as in Hevy, instead of
// walking back through every tab visited. Inside a tab, back still goes up a
// page. Seam S16 passes the back event through `atTabRoot`: on a tab screen it says there is no
// history left, and upstream's own handler (lib/back.js) shows "Press back again to exit".

const ROOTS = ['', '/', '/home', '/lifts', '/history-tab']

/** Whether `path` is one of the three tab screens (views/History.jsx's HISTORY_PATH is the third). */
export const isTabRoot = path => ROOTS.includes(path)

/** The back event as upstream's handler should read it on `path`. Elsewhere, history the router
 *  pushed (`idx`, react-router's history.state.idx) counts too: the WebView can report
 *  canGoBack false on a page the app navigated to, and back then armed exit (emulator, Android 16). */
export const atTabRoot = (ev, path, idx = 0) =>
  isTabRoot(path) ? { ...ev, canGoBack: false } : idx > 0 ? { ...ev, canGoBack: true } : ev

/** The path upstream's back handler reads. Statistics, Plan and Exercises are upstream's tabs, so it
 *  arms exit there; in the fork they are pages under History, Today and Lifts, and back goes up. */
export const backPath = path => /^\/(plan|stats|library)\/?$/i.test(path) ? '/hevier' + path : path
