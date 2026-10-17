// The only fork module upstream code imports (seam S1, frontend/src/main.jsx). Everything the fork
// adds is reached from here or from the other seams listed in hevier/SEAMS.md.
import { HEVIER } from './flag.js'
import './hevier.css'
import './theme.css'
import { nav } from '../lib/nav.js'
import { installFinishHook } from './hooks.js'
import { useStore } from '../store/useStore.js'
import { initHealthRead } from './lib/health-read-sync.js'

// hevier.css only matches under :root[data-ui="hevier"], so with the flag off it styles nothing.
if (HEVIER) document.documentElement.dataset.ui = 'hevier'
// Finish opens the fork's Save Workout page, and a saved workout its summary (seam S9).
if (HEVIER) installFinishHook(nav)
// Heart rate and weigh-ins read back from Health Connect, when switched on (DECISIONS.md D27).
if (HEVIER) initHealthRead(() => useStore.getState().S, fn => useStore.getState().update(fn),
  cb => useStore.subscribe((a, b) => { if (a.S !== b.S) cb() }))

export { HEVIER }
