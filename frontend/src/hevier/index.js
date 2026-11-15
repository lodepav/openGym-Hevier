// The only fork module upstream code imports (seam S1, frontend/src/main.jsx). Everything the fork
// adds is reached from here or from the other seams listed in hevier/SEAMS.md.
import { HEVIER } from './flag.js'
import './hevier.css'
import './theme.css'
import { nav } from '../lib/nav.js'
import { hooks, installFinishHook } from './hooks.js'
import { importHooks, choicesFor } from './lib/hevy-import.js'
import { importHevyFolders, applyHevyFolders } from './lib/hevy-folders.js'
import * as hevyMore from './lib/hevy-more.js'
import { HevyMoreRows, moreToast } from './components/HevyMoreRows.jsx'
import { useStore } from '../store/useStore.js'
import { initHrStrap } from './lib/hr-strap-run.js'
import { initHevyExport } from './lib/hevy-export-sync.js'
import { initWeighInSource, weighInBlocked } from './lib/weigh-in-source.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { applyForkIcons, applyForkName } from './lib/pwa-icons.js'
import { initMonthWidget } from './lib/month-widget.js'
import { initStrengthSignal } from './lib/strength-signal-run.js'
import { todayISO } from '../lib/format.js'
import { storeAdapter } from './lib/store-watch.js'
import { initGymBackups } from './lib/gym-backups-run.js'
import { initLabelRefill } from './lib/label-refill-run.js'
import { moveAliases, moveShownNames, moveImportPicks } from './lib/ex-aliases.js'
import { readChosenMuscles } from './lib/main-muscle.js'
import { initNoteFix } from './lib/note-text.js'
import { movePreviousIntoLastFrom } from './lib/previous-sets.js'
import { initSeasonsOff } from './lib/seasons-off.js'
import { initProgDefault } from './lib/prog-default.js'
import { initExUnits } from './lib/ex-unit.js'
import { HIDDEN_MODULES, moduleOn, FORK_MODULES, forkModuleCopy, setAnyModule } from './lib/fork-modules.js'
import { partOn } from './lib/module-parts.js'
import { moduleRow } from './views/ModuleParts.jsx'
import { moveHomeIntoS, HOME_KEY } from './lib/home-layout.js'
import { moveFoldersIntoS, FOLDERS_KEY, CLOSED_KEY } from './lib/routine-folders.js'
import { rowMode, setNumberOf } from './lib/hold-set.js'
import { initSideRoutines } from './lib/one-limb.js'
import { useStatsS } from './lib/shared-phase-run.js'
import { isPlain, plainRows } from './lib/plain-routine.js'
import { initFieldReveal } from './lib/field-reveal.js'
import { initRestExtra } from './lib/rest-extra-run.js'
import { initHoldClock } from './lib/hold-clock-run.js'
import { initClockOff } from './lib/clock-off-run.js'
import { initUpdateNotice } from './components/UpdateNotice.jsx'
import { askMedia } from './components/MediaSection.jsx'
import { initMediaPack } from './lib/media-pack-run.js'
import { gymSheet, explorerFilter } from './lib/gym-filter.js'
import { GymEquipmentChips, equipChips } from './components/EquipGroups.jsx'

const store = storeAdapter(useStore, (msg, opts) => useUI.getState().toast(msg, opts))
const state = () => useStore.getState().S

function install() {
  if (!HEVIER) return
  // hevier.css only matches under :root[data-ui="hevier"], so with the flag off it styles nothing.
  document.documentElement.dataset.ui = 'hevier'

  // Look: the installed PWA is Go Hevier, in blue, not upstream's lime openGym (D39); no seasonal
  // themes (D17).
  try { localStorage.removeItem('hevier_still') } catch { /* D60's answer, upstream's Forgotten workouts asks since 1.4.5 (D103) */ }
  applyForkIcons()
  applyForkName()
  initSeasonsOff(store)
  readChosenMuscles(id => state().hvMainMuscle?.[id] || null)  // an exercise's main muscle as the user chose it (D76)

  // The workout: Finish opens the fork's Save Workout page, and a saved workout its summary (S9).
  installFinishHook(nav)
  hooks.noDumbbellsRowOff = true                         // a gym's checklist says what it has (S49, D62)
  hooks.settingsAutosave = true                           // Exercise settings in a workout need no Save (S50, D92)
  hooks.statsOff = ['j', 't', 'month', 'form', 'level']    // All statistics without the Journal, Tools, Your month, daily form and levels (S61, D109)
  hooks.noMic = true                                      // the APK has no microphone permission (S60, D106)
  hooks.secondsStep = 5                                   // the rest and timer wheels in 5 s steps (D48)
  hooks.backupKeep = 5                                    // auto-backup keeps the newest 5 copies, not 14 (S52, D20)
  hooks.hiddenModules = HIDDEN_MODULES                    // modules whose features the fork never shows (S54, D97)
  Object.assign(hooks, { forkModules: FORK_MODULES, forkModuleCopy, setModule: setAnyModule }) // the fork's own modules (S54, D114)
  hooks.moduleRow = moduleRow                             // a module's parts unfold under its row (S54, D102)
  hooks.exPart = part => part !== 'pergym' && partOn(state(), 'hvExercise', part) && (part !== 'plates' || moduleOn(state(), 'plates'))  // an exercise's settings show the categories switched on (S58, D114)
  hooks.tourPresetOnly = true                             // a new profile picks how much app, without upstream's tour (S53, D97, D100)
  hooks.setMode = rowMode                                  // a hold in a reps exercise reads as a hold (S48, D89)
  hooks.setNumber = setNumberOf                            // a set's number in toasts as the table shows it (S62, D89)
  initProgDefault(store)                                  // the profile's default rule is Off until chosen (D61, upstream's #814)
  initExUnits(store)                                      // the fork's units per exercise move into upstream's pin (D41, #657)
  hooks.plainRoutine = { is: isPlain, rows: plainRows }   // a routine opens at last time's sets, no ramp (S40, D69)
  hooks.statsS = useStatsS                                // All statistics and Structural balance follow the phase filter (S34, D93)
  initUpdateNotice(store)                                 // a newer Go Hevier asks once when the app opens (D77)
  initMediaPack(store, askMedia)                          // the lean APK downloads the exercise pictures once (D115)
  initRestExtra(store)                                    // a rest after a first side and an exercise's last set; Ready goes
  initHoldClock(store)                                    // a hold on the big clock ends at its seconds (D89)
  initClockOff(store)                                     // a Timer countdown ends when Timer and Stopwatch are switched off (D117)
  initFieldReveal()                                       // a set typed into stays clear of the header, timer and keyboard
  initGymBackups(store)                                   // a gym swaps in the backups it took last time (D46)
  initLabelRefill(store)                                  // a new brand or gym refills the untouched sets (D82)

  // Gyms and equipment: body weight is equipment like the rest, the checklist in groups (S36, D62,
  // D63), and the By muscle explorer filters by the picker's gym, its equipment by group (S37, S38).
  hooks.gymSheet = { ...gymSheet(t), Chips: GymEquipmentChips }
  hooks.equipFilter = explorerFilter
  hooks.equipChips = equipChips

  // Imports: the fork's matches, one-limb sets and brand labels (S19, D29), under the user's own
  // picks from upstream's Check and choose (D103); Hevy's routine
  // folders (S20, D30) and the rest of what its API holds (S21, D31). Notes an earlier Hevy CSV
  // import left with `\n` get their line breaks back (D54).
  Object.assign(hooks, importHooks(() => choicesFor(state())))
  hooks.importView = (again, first) => hevyMore.viewAgain(again, first, hooks.importDone)
  hooks.hevyFolders = { fetch: importHevyFolders, merged: applyHevyFolders }
  hooks.hevyMore = { ...hevyMore, Rows: HevyMoreRows, toast: moreToast }
  initNoteFix(store)
  // One-limb exercises already in a routine turn per side, once (D75).
  initSideRoutines(store)
  // Home's layout and the empty and folded folders, kept on the device until 2026-10-20, move into
  // S once, so they sync and are backed up (D12, D13).
  const kept = k => { try { return localStorage.getItem(k) != null } catch { return false } }
  if ([HOME_KEY, FOLDERS_KEY, CLOSED_KEY].some(kept)) store.update(s => { moveHomeIntoS(s); moveFoldersIntoS(s) })
  // The fork's Previous values switch is upstream's Last time means since 1.4.3 (D21); a sync from
  // an older build can bring the old field back, so it is moved whenever it shows up.
  const movePrevious = () => { if ('hvPrevious' in state()) store.update(movePreviousIntoLastFrom) }
  movePrevious()
  store.watch(['hvPrevious'])?.(movePrevious)
  // D73's names, moved into upstream's other names once (a backup or another device may bring them back).
  // D73's shown name is upstream's exShownName since 1.4.5 (D103), moved the same way.
  const moveNames = () => {
    if ('hvAliases' in state()) store.update(moveAliases)
    if ('hvShownName' in state()) store.update(moveShownNames)
    if ('hvImportMap' in state()) store.update(moveImportPicks)   // D33's picks are other names too (D103)
  }
  moveNames()
  store.watch(['hvAliases', 'hvShownName', 'hvImportMap'])?.(moveNames)

  // Android: weigh-ins from Health Connect only while upstream's read of them is on
  // (S22, D32); new workouts and changed routines to Hevy (D34); the month widget, a
  // tap on it opening the Calendar (D44); a Bluetooth heart-rate strap recorded while a workout
  // runs (D79).
  initHrStrap(store)
  initWeighInSource()
  hooks.weighIns = opts => weighInBlocked(opts, () => store.toast(t('Weigh-ins come from Health Connect')))
  initHevyExport(store)
  initMonthWidget(store, route => nav(route), todayISO)
  initStrengthSignal(store, todayISO)                     // strength in the phase, for OpenBite to read (D95)
}

install()

export { HEVIER }
