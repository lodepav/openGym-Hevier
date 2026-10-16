// The only fork module upstream code imports (seam S1, frontend/src/main.jsx). Everything the fork
// adds is reached from here or from the other seams listed in hevier/SEAMS.md.
import { HEVIER } from './flag.js'
import './hevier.css'
import { nav } from '../lib/nav.js'
import { installFinishHook } from './finish-hook.js'

// hevier.css only matches under :root[data-ui="hevier"], so with the flag off it styles nothing.
if (HEVIER) document.documentElement.dataset.ui = 'hevier'
// Finish opens the fork's Save Workout page, and a saved workout its summary (seam S9).
if (HEVIER) installFinishHook(nav)

export { HEVIER }
