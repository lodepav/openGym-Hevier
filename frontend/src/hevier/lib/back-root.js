// Android back on a tab screen (Home, Workout, Profile) offers to exit, as in Hevy, instead of
// walking back through every tab visited (user, 2026-10-16). Inside a tab, back still goes up a
// page. Seam S16 passes the back event through `atTabRoot`: on a tab screen it says there is no
// history left, and upstream's own handler (lib/back.js) shows "Press back again to exit".

/** Whether `path` is one of the three tab screens. /workout is the Workout tab only while no
 *  session is open; with one, it is the workout screen, and back keeps upstream's way. */
export const isTabRoot = (path, active) =>
  path === '' || path === '/' || path === '/home' || path === '/profile' || (path === '/workout' && !active)

/** The back event as upstream's handler should read it on `path`. Elsewhere, history the router
 *  pushed (`idx`, react-router's history.state.idx) counts too: the WebView can report
 *  canGoBack false on a page the app navigated to, and back then armed exit (emulator, Android 16). */
export const atTabRoot = (ev, path, active, idx = 0) =>
  isTabRoot(path, active) ? { ...ev, canGoBack: false } : idx > 0 ? { ...ev, canGoBack: true } : ev
