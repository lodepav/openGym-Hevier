// The only fork module upstream code imports (seam S1, frontend/src/main.jsx). Everything the fork
// adds is reached from here or from the other seams listed in hevier/SEAMS.md.
import { HEVIER } from './flag.js'
import './hevier.css'
import './theme.css'
import { nav } from '../lib/nav.js'
import { hooks, installFinishHook } from './hooks.js'
import { importHooks, importWeight } from './lib/hevy-import.js'
import { choicesFor, keep } from './lib/import-review.js'
import { ReviewRow } from './components/ImportReview.jsx'
import { importHevyFolders, applyHevyFolders } from './lib/hevy-folders.js'
import * as hevyMore from './lib/hevy-more.js'
import { HevyMoreRows, moreToast } from './components/HevyMoreRows.jsx'
import { useStore } from '../store/useStore.js'
import { initHealthRead } from './lib/health-read-sync.js'
import { initHrStrap } from './lib/hr-strap-run.js'
import { initHevyExport } from './lib/hevy-export-sync.js'
import { initWeighInSource, weighInBlocked } from './lib/weigh-in-source.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { applyForkIcons, applyForkName } from './lib/pwa-icons.js'
import { initMonthWidget } from './lib/month-widget.js'
import { todayISO } from '../lib/format.js'
import { storeAdapter } from './lib/store-watch.js'
import { initGymBackups } from './lib/gym-backups-run.js'
import { initLabelRefill } from './lib/label-refill-run.js'
import { aliasHooks } from './lib/ex-aliases.js'
import { readChosenMuscles } from './lib/main-muscle.js'
import { chartTicks } from './lib/chart-ticks.js'
import { initNoteFix } from './lib/note-text.js'
import { moveHomeIntoS, HOME_KEY } from './lib/home-layout.js'
import { moveFoldersIntoS, FOLDERS_KEY, CLOSED_KEY } from './lib/routine-folders.js'
import { holdMode } from './lib/hold-mode.js'
import { rowMode } from './lib/hold-set.js'
import { sideConfig, sideOff, initSideRoutines } from './lib/one-limb.js'
import { restOpen, restFooter } from './lib/rest-default.js'
import { countedS } from './lib/counted.js'
import { isPlain, plainRows } from './lib/plain-routine.js'
import { initFieldReveal } from './lib/field-reveal.js'
import { initRestExtra } from './lib/rest-extra-run.js'
import { initHoldClock } from './lib/hold-clock-run.js'
import { initStillTraining } from './lib/still-training-run.js'
import { initUpdateNotice } from './components/UpdateNotice.jsx'
import { gymSheet, explorerFilter } from './lib/gym-filter.js'
import { sheetState } from './lib/back-root.js'
import { GymEquipmentChips, equipChips, muscleChips } from './components/EquipGroups.jsx'

const store = storeAdapter(useStore, (msg, opts) => useUI.getState().toast(msg, opts))
const state = () => useStore.getState().S

function install() {
  if (!HEVIER) return
  // hevier.css only matches under :root[data-ui="hevier"], so with the flag off it styles nothing.
  document.documentElement.dataset.ui = 'hevier'

  // Look: the installed PWA is Go Hevier, in blue, not upstream's lime openGym (D39); chart labels
  // never repeat (S30).
  applyForkIcons()
  applyForkName()
  hooks.chartTicks = chartTicks
  Object.assign(hooks, aliasHooks(state))                 // an exercise's other names, one shown as its name (S41, D73)
  readChosenMuscles(id => state().hvMainMuscle?.[id] || null)  // an exercise's main muscle as the user chose it (D76)

  // The workout: Finish opens the fork's Save Workout page, and a saved workout its summary (S9).
  installFinishHook(nav)
  hooks.sheetState = sheetState                          // a page opened from a sheet keeps its back (S47)
  hooks.secondsStep = 5                                   // the rest and timer wheels in 5 s steps (D48)
  hooks.durationOpen = o => restOpen(o, state().restSec)     // an exercise's rest wheel opens on the default (S33, D56)
  hooks.restFooter = text => restFooter(text, state().restSec)  // and the settings page's line says so (S42, D56)
  hooks.defaultMode = id => holdMode(state(), id)             // a plank or a wall sit starts as a timed hold (S32, D55)
  hooks.defaultSide = id => sideConfig(state(), id)          // a single-leg calf raise starts per side (S32, D75)
  hooks.sideOff = id => sideOff(state(), id)                 // and per side switched off stays off
  hooks.setMode = rowMode                                  // a hold in a reps exercise reads as a hold (S48, D89)
  hooks.defaultProg = 'off'                             // no progression rule of its own: none (D61)
  hooks.plainRoutine = { is: isPlain, rows: plainRows }   // a routine opens at last time's sets, no ramp (S40, D69)
  hooks.statsS = countedS                                 // All statistics leave out the kept-out exercises (S34, D57)
  initStillTraining(store)                                // Still training? after five hours (D60)
  initUpdateNotice(store)                                 // a newer Go Hevier asks once when the app opens (D77)
  initRestExtra(store)                                    // a rest after a first side and an exercise's last set; Ready goes
  initHoldClock(store)                                    // a hold on the big clock ends at its seconds (D89)
  initFieldReveal()                                       // a set typed into stays clear of the header, timer and keyboard
  initGymBackups(store)                                   // a gym swaps in the backups it took last time (D46)
  initLabelRefill(store)                                  // a new brand or gym refills the untouched sets (D82)

  // Gyms and equipment: body weight is equipment like the rest, the checklist in groups (S36, D62,
  // D63), and the By muscle explorer filters by the picker's gym, by group (S37–S39).
  hooks.gymSheet = { ...gymSheet(t), Chips: GymEquipmentChips }
  hooks.equipFilter = explorerFilter
  hooks.equipChips = equipChips
  hooks.muscleChips = muscleChips

  // Imports: the fork's matches, one-limb sets and brand labels (S19, D29), with the user's own
  // choices from the review (S23, D33); each weight's hundredths (S25, D40); Hevy's routine
  // folders (S20, D30) and the rest of what its API holds (S21, D31). Notes an earlier Hevy CSV
  // import left with `\n` get their line breaks back (D54).
  Object.assign(hooks, importHooks(() => choicesFor(state())))
  hooks.importReview = { keep, Row: ReviewRow }
  hooks.importWeight = importWeight
  hooks.hevyFolders = { fetch: importHevyFolders, merged: applyHevyFolders }
  hooks.hevyMore = { ...hevyMore, Rows: HevyMoreRows, toast: moreToast }
  initNoteFix(store)
  // One-limb exercises already in a routine turn per side, once (D75).
  initSideRoutines(store)
  // Home's layout and the empty and folded folders, kept on the device until 2026-10-20, move into
  // S once, so they sync and are backed up (D12, D13).
  const kept = k => { try { return localStorage.getItem(k) != null } catch { return false } }
  if ([HOME_KEY, FOLDERS_KEY, CLOSED_KEY].some(kept)) store.update(s => { moveHomeIntoS(s); moveFoldersIntoS(s) })

  // Android: heart rate and weigh-ins from Health Connect (D27), weigh-ins from there only while
  // that is on (S22, D32); new workouts and changed routines to Hevy (D34); the month widget, a
  // tap on it opening the Calendar (D44); a Bluetooth heart-rate strap recorded while a workout
  // runs (D79).
  initHealthRead(store)
  initHrStrap(store)
  initWeighInSource()
  hooks.weighIns = opts => weighInBlocked(opts, () => store.toast(t('Weigh-ins come from Health Connect')))
  initHevyExport(store)
  initMonthWidget(store, route => nav(route), todayISO)
}

install()

export { HEVIER }
