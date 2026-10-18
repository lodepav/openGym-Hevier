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
import { initGymBackups } from './lib/gym-backups-run.js'
import { chartTicks } from './lib/chart-ticks.js'
import { initNoteFix } from './lib/note-text.js'
import { holdMode } from './lib/hold-mode.js'
import { restOpen } from './lib/rest-default.js'
import { countedS } from './lib/counted.js'
import { initStillTraining } from './lib/still-training-run.js'
import { gymSheet, explorerFilter } from './lib/gym-filter.js'

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
// D48: Hevy's rest and timer wheels go in 5 s steps.
if (HEVIER) hooks.secondsStep = 5
// D61: a routine or exercise with no progression rule of its own does not progress.
if (HEVIER) hooks.defaultProg = 'off'
// A plank or a wall sit starts as a timed hold (seam S32, D55).
if (HEVIER) hooks.defaultMode = id => holdMode(useStore.getState().S, id)
// An exercise's rest wheel opens on the default rest (seam S33, D56).
if (HEVIER) hooks.durationOpen = o => restOpen(o, useStore.getState().S.restSec)
// Upstream's All statistics and Structural balance leave out exercises kept out of progression (S34, D57).
if (HEVIER) hooks.statsS = countedS
// A gym's sheet: body weight is equipment like the rest (seam S36, D62).
if (HEVIER) hooks.gymSheet = gymSheet(t)
// …and the By muscle explorer filters by the gym chosen in the picker (seam S37, D62).
if (HEVIER) hooks.equipFilter = explorerFilter
// Chart labels that never repeat (seam S30).
if (HEVIER) hooks.chartTicks = chartTicks
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

// A routine started at a gym swaps in the backups that gym took last time; swaps teach it (D46).
if (HEVIER) initGymBackups(() => useStore.getState().S, fn => useStore.getState().update(fn),
  fn => useStore.subscribe(fn), (msg, opts) => useUI.getState().toast(msg, opts))

// Notes imported from Hevy's CSV before D54 get their line breaks back.
if (HEVIER) initNoteFix(() => useStore.getState().S, fn => useStore.getState().update(fn),
  watchS(useStore.subscribe, ['workouts']))

export { HEVIER }
// Still training? after five hours (D60).
if (HEVIER) initStillTraining(() => useStore.getState().S)
