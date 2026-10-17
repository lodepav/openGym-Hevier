// The only fork module upstream code imports (seam S1, frontend/src/main.jsx). Everything the fork
// adds is reached from here or from the other seams listed in hevier/SEAMS.md.
import { HEVIER } from './flag.js'
import './hevier.css'
import './theme.css'
import { nav } from '../lib/nav.js'
import { hooks, installFinishHook } from './hooks.js'
import { importDone, importExercise } from './lib/hevy-import.js'
import { importHevyFolders, applyHevyFolders } from './lib/hevy-folders.js'
import * as hevyMore from './lib/hevy-more.js'
import { HevyMoreRows, moreToast } from './components/HevyMoreRows.jsx'
import { useStore } from '../store/useStore.js'
import { initHealthRead } from './lib/health-read-sync.js'
import { applyForkIcons } from './lib/pwa-icons.js'

// hevier.css only matches under :root[data-ui="hevier"], so with the flag off it styles nothing.
if (HEVIER) document.documentElement.dataset.ui = 'hevier'
// Finish opens the fork's Save Workout page, and a saved workout its summary (seam S9).
if (HEVIER) installFinishHook(nav)
// A Hevy import gets the fork's fixed matches, one-limb sets and brand labels (seam S19, D29).
if (HEVIER) Object.assign(hooks, { importExercise, importDone })
// …and its routines their Hevy folders (seam S20, D30).
if (HEVIER) hooks.hevyFolders = { fetch: importHevyFolders, merged: applyHevyFolders }
// …and the rest of what Hevy's API holds: measurements, rest, rep ranges, notes, routine links (S21, D31).
if (HEVIER) hooks.hevyMore = { ...hevyMore, Rows: HevyMoreRows, toast: moreToast }
// The installed PWA is Hevier, in blue, not upstream's lime openGym.
if (HEVIER) applyForkIcons()
// Heart rate and weigh-ins read back from Health Connect, when switched on (DECISIONS.md D27).
if (HEVIER) initHealthRead(() => useStore.getState().S, fn => useStore.getState().update(fn),
  cb => useStore.subscribe((a, b) => { if (a.S !== b.S) cb() }))

export { HEVIER }
