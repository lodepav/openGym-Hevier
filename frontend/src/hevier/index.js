// The only fork module upstream code imports (seam S1, frontend/src/main.jsx). Everything the fork
// adds is reached from here or from the other seams listed in hevier/SEAMS.md.
import { HEVIER } from './flag.js'
import './hevier.css'
import './theme.css'
import { nav } from '../lib/nav.js'
import { hooks, installFinishHook } from './hooks.js'
import { importDone, importExercise, importWeight, useChoices } from './lib/hevy-import.js'
import { choicesFor, keep } from './lib/import-review.js'
import { ReviewRow } from './components/ImportReview.jsx'
import { importHevyFolders, applyHevyFolders } from './lib/hevy-folders.js'
import * as hevyMore from './lib/hevy-more.js'
import { HevyMoreRows, moreToast } from './components/HevyMoreRows.jsx'
import { useStore } from '../store/useStore.js'
import { initHealthRead } from './lib/health-read-sync.js'
import { initHevyExport } from './lib/hevy-export-sync.js'
import { initWeighInSource, weighInBlocked } from './lib/weigh-in-source.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { applyForkIcons, applyForkName } from './lib/pwa-icons.js'
import { initMonthWidget } from './lib/month-widget.js'
import { todayISO } from '../lib/format.js'
import { watchS } from './lib/store-watch.js'

// hevier.css only matches under :root[data-ui="hevier"], so with the flag off it styles nothing.
if (HEVIER) document.documentElement.dataset.ui = 'hevier'
// Finish opens the fork's Save Workout page, and a saved workout its summary (seam S9).
if (HEVIER) installFinishHook(nav)
// A Hevy import gets the fork's fixed matches, one-limb sets and brand labels (seam S19, D29).
if (HEVIER) Object.assign(hooks, {
  importExercise: (title, source) => { useChoices(choicesFor(useStore.getState().S)); return importExercise(title, source) },
  importDone,
})
// …keeping each weight's hundredths (seam S25, D40).
if (HEVIER) hooks.importWeight = importWeight
// …with the user's own choices from the import review (seam S23, D33).
if (HEVIER) hooks.importReview = { keep, Row: ReviewRow }
// …and its routines their Hevy folders (seam S20, D30).
if (HEVIER) hooks.hevyFolders = { fetch: importHevyFolders, merged: applyHevyFolders }
// …and the rest of what Hevy's API holds: measurements, rest, rep ranges, notes, routine links (S21, D31).
if (HEVIER) hooks.hevyMore = { ...hevyMore, Rows: HevyMoreRows, toast: moreToast }
// The installed PWA is Go Hevier, in blue, not upstream's lime openGym (D39).
if (HEVIER) { applyForkIcons(); applyForkName() }
// Heart rate and weigh-ins read back from Health Connect, when switched on (DECISIONS.md D27).
// Each of these passes wakes only when what it reads changes, not for every set typed (item 29).
if (HEVIER) initHealthRead(() => useStore.getState().S, fn => useStore.getState().update(fn),
  watchS(useStore.subscribe, ['workouts']))
// …and while the weigh-in read is on, weigh-ins come from there only (seam S22, D32).
if (HEVIER) { initWeighInSource(); hooks.weighIns = opts => weighInBlocked(opts, () => useUI.getState().toast(t('Weigh-ins come from Health Connect'))) }

// New workouts and changed routines go to Hevy, when switched on with a key (DECISIONS.md D34).
if (HEVIER) initHevyExport(() => useStore.getState().S, fn => useStore.getState().update(fn),
  watchS(useStore.subscribe, ['workouts', 'routines', 'customEx', 'unit']))

// The home-screen month widget gets the log's month as it changes; a tap on it opens the Calendar
// (DECISIONS.md D44, Android only).
if (HEVIER) initMonthWidget(() => useStore.getState().S,
  watchS(useStore.subscribe, ['workouts', 'weekStart', 'lang']), route => nav(route), todayISO)

export { HEVIER }
