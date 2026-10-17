# Seams — every place the fork edits an upstream file

The fork's code lives in `hevier/` and `frontend/src/hevier/`. Upstream files are edited
**only** at the seams below. Each seam is wrapped in markers so it can be found with
`git grep -n "\[hevier\]"`:

```js
// [hevier] <seam id>: <one line on why>
...fork lines...
// [/hevier]
```

(In JSX children use `{/* [hevier] … */}`. In Gradle and CSS use the language's own comment
syntax.)

Keep this table current: add the row in the same commit that adds the seam. A seam that is no
longer needed gets removed, and so does its row.

| Id | File | What the seam does | Status |
|---|---|---|---|
| S1 | `frontend/src/main.jsx` | Imports `./hevier/index.js` (sets `data-ui`, loads `hevier.css`), right after `index.css` | done |
| S2 | `frontend/src/App.jsx` | The `TabBar` import is renamed `UpstreamTabBar` and `TabBar` is bound to `HevyTabBar` when `HEVIER` (upstream's JSX line, which `App.no-tabs.test.js` reads, stays as it is). `{HEVIER && hevierRoutes}` sits first inside `<Routes>`: React Router gives an exact tie to the first route, so `/home`, `/workout`, `/profile`, `/stats`, `/library` and `/plan/r/:id` (the routine editor) become the fork's, upstream's `/measurements`, `/progress-photos` and `/structural-balance` are wrapped so their own ‹ goes back where the user came from, and the fork adds `/workout/save` and `/workout/done` (seam S9), `/stats/all` (upstream's Stats) and `/measures`, the fork's without upstream's lines changing (`hevier/routes.jsx`) | done |
| S3 | `frontend/src/views/Workout.jsx` | Two imports after the last import, and `if (HEVIER) return <HevyWorkout …/>` right before `ActiveWorkout`'s final `return`, after every hook. The Hevy screen is the fork's only layout (D1), so no `workoutView` value is stored and S4/S5 were not needed | done |
| S9 | `frontend/src/sheets.jsx` | Imports `hevier/hooks.js`; `finishWorkout` calls `hooks.finish` (the Save Workout page) when it is set and the session is not an edit; `doFinishWorkout` calls `hooks.done` (the fork's summary) instead of opening `FinishSummary`; and `doFinishWorkout`, `LastAndNext`, `CardioDone` are exported. The hook is filled in only by `hevier/index.js` with the flag on, so upstream's tests see upstream's finish | done |
| S10 | `frontend/src/sheets.jsx` | `exerciseDetailSheet` calls `hooks.exerciseDetail` (the fork's tabbed exercise details) when it is set; upstream's sheet becomes `upstreamExerciseDetailSheet`, which the fork's ⋯ → All details opens. The hook is set in `hevier/routes.jsx` with the flag on | done |
| S13 | `frontend/src/sheets.jsx` | `exercisePicker` calls `hooks.exercisePicker` (the fork's Hevy picker, `hevier/views/ExercisePickerHevy.jsx`) when it is set, so every caller — the workout's and the routine editor's Add, Replace, swap, Structural balance — gets it. The fork's sheet hands each pick to the caller's own `onPick(ex, true)`, upstream's quick add; a titled pick takes one tap, an add several. Set in `hevier/routes.jsx` with the flag on | done |
| S14 | `frontend/src/sheets.jsx` | `workoutDetailSheet` calls `hooks.workoutDetail` (the fork's Workout Detail page at `/workout-detail`, `hevier/views/WorkoutDetail.jsx`) when it is set, so the feed, History, Stats, the calendar and exercise details all open it; upstream's sheet becomes `upstreamWorkoutDetailSheet`, which the page's ⋯ → All details opens. Set in `hevier/routes.jsx` with the flag on | done |
| S16 | `frontend/src/lib/back.js` | `initBackButton` passes the Android back event through `hooks.backEvent` before upstream's handler reads it; on a tab screen (Home, Workout without a session, Profile) the fork's `hevier/lib/back-root.js` says there is no history left, so upstream's own "Press back again to exit" follows instead of walking back through every tab visited (user, 2026-10-16). On any other page, history the router pushed counts even when the WebView reports `canGoBack: false` (seen on the Android 16 emulator, where back on a sub-page armed exit). The only seam in `lib/` besides S6: it is navigation plumbing, not training logic, and the handler is built inside `back.js` with nowhere else to hook in. Set in `hevier/routes.jsx` with the flag on | done |
| S11 | `frontend/src/views/Settings.jsx` | Imports `hevier/hooks.js`; `SettingsRoot` renders `hooks.settings.root(…)` (the fork's titled groups, `hevier/views/SettingsRootHevy.jsx`) in place of upstream's account card and groups, `hooks.settings.back()` for the top link (‹ Profile, since the fork opens Settings from Profile), and filters its search hits through `hooks.settings.hides` | done |
| S12 | `frontend/src/views/Settings.jsx` | A page's tree goes through `hooks.settings.page(id, tree)` before it renders: `hevier/lib/settings.js` `prunePage` leaves out the rows that only steer upstream's workout layouts (D16) | done |
| S15 | `frontend/src/App.jsx` | `applyPrefs` starts with `if (HEVIER) { theme = 'dark'; accent = 'sky' }`: the fork has one look, Hevy's dark with its blue (D17), whatever `S.theme` / `S.accent` hold, so the stored values stay untouched and upstream's timer flash still blinks to light and back. The tokens are in `hevier/theme.css`; the Theme and Accent color rows are pruned like S12's | done |
| S6 | `frontend/src/lib/update.js` | Updater repo from `VITE_UPDATE_REPO` | done |
| S7 | `frontend/android/app/build.gradle` | `apply from: 'hevier.gradle'` at end of file. The fork-owned `hevier.gradle` sets the app id and points release/debug resources at `src/hevier-release` / `src/hevier-debug` (launcher name). Debug's res folder is *replaced*, so new upstream files in `src/debug/res` must be copied across. Both build types also add `src/hevier/res`: upstream's icon and splash PNGs recoloured to Hevy blue (rerun `hevier/tools/recolour-icons.py` when upstream regenerates its icons) and `values/styles.xml`, a copy of upstream's `AppTheme.NoActionBarLaunch` with a dark splash background (D17), to change the same way if upstream changes that style. Both build types' manifest is `src/hevier/AndroidManifest.xml` (D24, portrait only), merged into `src/main`'s; if upstream adds a `src/debug` or `src/release` manifest, move its contents into the fork's | done |
| S8 | `CLAUDE.md` | Points agents at `hevier/README.md` and `DECISIONS.md` (HTML-comment markers) | done |
| S17 | `frontend/android/app/src/main/java/ch/duartesantos/opengym/MainActivity.java` | `registerPlugin(HevierHealthReadPlugin.class)` beside upstream's plugins: the fork's Health Connect read plugin (D27), in `src/hevier/java`, which `hevier.gradle` (S7) adds to both build types; its two read permissions are in the fork's manifest overlay. **Temporary:** removed at the v1.4.3 merge, whose own HealthConnectPlugin reads | done |
| S18 | `frontend/src/lib/health-connect.js` (`healthRecords` weights), `frontend/src/lib/sync-merge.js` (`mergeBodyweight`), `frontend/src/sheets.jsx` (`BwSheet` save) | **Backports, no markers:** upstream's v1.4.3 lines (commit f9c03474), word for word, so the merge meets identical changes: an imported weigh-in (`src`) is not written to Health Connect, a typed one beats an imported one in a sync merge, typing over one clears `src` (D27). Unmarked on purpose, a marker would make the lines differ. At the v1.4.3 merge they become upstream's own and this row goes; in `sheets.jsx` upstream also renamed `iso` to `date` on that line, so take upstream's | done |
| S19 | `frontend/src/lib/import-csv.js` (import, `parseWorkoutCSV` after the name cache, `parseImport`), `frontend/src/lib/import-hevy.js` (import, `makeResolver`'s `resolve`), `frontend/src/sheets.jsx` (`HevyImportSheet` after `importHevyData`) | The Hevy import asks `hooks.importExercise(title, source)` before upstream's own match (in the CSV per exact title, below upstream's word-bag cache) and passes the parse through `hooks.importDone`: the fork's fix table, one-limb titles as per-side sets and `(brand: X)` as the D28 brand (D29, `hevier/lib/hevy-import.js`). Empty hooks, as in upstream's tests, leave upstream's import as it is. Each fix-table row is also offered upstream (`hevier/upstream/hevy-map-fixes.md`); when upstream has them all, only the brand and one-limb parts remain. | done |
| S20 | `frontend/src/lib/import-hevy.js` (`parseHevyRoutines`, after each `out.push`), `frontend/src/sheets.jsx` (`HevyImportSheet`: after the S19 lines, and after `mergeHevyRoutines` in `doImport`) | The Hevy API import's routine folders (D30): the parse keeps a routine's `folder_id` as `hvFolderId` when `hooks.hevyFolders` is set; the sheet then calls `hooks.hevyFolders.fetch(key, data)` (the fork's `/v1/routine_folders` read, with the same key) and, after upstream's merge, `hooks.hevyFolders.merged(s, payload.routines, res)`, which writes D13's `folder` field (`hevier/lib/hevy-folders.js`). Empty, as in upstream's tests, nothing changes. | done |
| S21 | `frontend/src/lib/import-hevy.js` (`parseHevyWorkouts`: after a day is found, after an exercise resolves, before a workout is returned; `parseHevyRoutines`: after a config's note; `importHevyData`'s result), `frontend/src/sheets.jsx` (`HevyImportSheet`: a switch's state, after the S20 fetch, after upstream's merges in `doImport`, `canImport`, a row after the weigh-ins row) | The rest of the Hevy API (D31): with `hooks.hevyMore` set, the parse hands the fork each Hevy workout, exercise and routine exercise (description, notes, routine id, rest, rep range) and the result keeps the raw measurements and templates (`hvRaw`); the result keeps the raw workouts and routines too (for D33's review); the sheet calls `fetched(key, data)` (measurements, templates, `/v1/user/info`), draws `Rows` (the measurements' switch, the routine links, the unit line), counts `hasMore` into `canImport`, and after upstream's merges calls `merged(s, payload, { measures })` and adds its `toast` (`hevier/lib/hevy-more.js`, `hevier/components/HevyMoreRows.jsx`). Empty, as in upstream's tests, nothing changes. | done |
| S22 | `frontend/src/sheets.jsx` (`bwSheet`, first line) | Weigh-ins from Health Connect only (D32): `hooks.weighIns(opts)` true means upstream's weigh-in sheet does not open (`hevier/lib/weigh-in-source.js`: while D27's weigh-in read is on, a check-in goes on without a weight, any other Log shows a toast). Empty, as in upstream's tests, nothing changes. | done |
| S23 | `frontend/src/sheets.jsx` (`importFromApp`, before the summary opens; `ImportSummary` and `HevyImportSheet`, above the "Not in the library" chips) | The review of an import's exercise matches (D33): `hooks.importReview.keep(parsed, redo)` keeps how to read the CSV again, and `<hooks.importReview.Row parsed>` draws **Check exercise matches**, whose list stores choices in `S.hvImportMap` and reads the import again into the same object (`hevier/lib/import-review.js`, `hevier/components/ImportReview.jsx`; the API's raw lists come through S21's `hvRaw`). Empty, as in upstream's tests, nothing changes. | done |
| S24 | `frontend/android/app/src/main/java/ch/duartesantos/opengym/MainActivity.java` | `registerPlugin(HevierSecretPlugin.class)` beside S17: the fork's encrypted secret (D34), the Hevy API key of the export to Hevy, sealed with an Android Keystore key; in `src/hevier/java`, which `hevier.gradle` (S7) adds to both build types. Not temporary: it stays after S17 goes at the v1.4.3 merge | done |
| S25 | `frontend/src/lib/import-hevy.js` (`toProfileWeight`, `parseHevyBodyweight`), `frontend/src/lib/import-csv.js` (`parseWorkoutCSV`'s `convRow`, `parseBodyweight`'s `conv`) | An imported weight to the hundredth (D40): with `hooks.importWeight` set, the weight in the profile's unit is handed to it in place of upstream's round to a tenth (the fork's `importWeight`, `hevier/lib/hevy-import.js`). Empty, as in upstream's tests, upstream rounds as before. | done |
| S26 | `frontend/android/app/src/main/java/ch/duartesantos/opengym/MainActivity.java` | `registerPlugin(HevierWidgetPlugin.class)` beside S24: the bridge of the fork's home-screen month widget (D44), which hands it the page's snapshot and the tap's route back; the widget itself (`HevierMonthWidget.java`) and its receiver are in the fork's source set and manifest overlay. |

## Upstream contracts the overlay depends on

When one of these changes upstream, the fork's adapter changes. Never revert upstream's change.
`frontend/src/hevier/contract.test.js` checks them.

- `blockProps(idx)` in `views/Workout.jsx`: the handler props an exercise layout receives
  (`onToggle`, `onField`, `onAddSet`, `onRemoveSetAt`, `onRest`, `onSwap`, …).
- The `ActiveWorkout` locals seam S3 passes to `HevyWorkout`: `units`, `editing`, `done`,
  `blockProps`, `bindExRef`, `bindSetRef`, `ExerciseBlock` (passed but no longer used: every mode
  has Hevy rows), `addExercise`, `discardWorkout`, `markAllDone`, `pairAt`, `unpairAt`,
  `noProgSwitchable`, `toggleSessionNoProg`. If upstream renames one, the build fails (an
  undefined identifier) or `src/hevier/views/HevyWorkout.test.jsx` does. Rename it in the seam.
- The routine editor (`hevier/views/RoutineEditHevy.jsx`) copies upstream's `RoutineEdit.jsx`
  flows — Replace, the superset link, print, the routine-wide Progression and Deload rows — and
  reuses its exported `removeRoutineExercise` and `reorderRoutineUnit`. Its table edits go through
  `hevier/lib/routine-table.js`, which follows `ExConfig`'s save rules in `sheets.jsx` (even
  per-side reps, `normalizeRepRange`, a pyramid's lists, `setsMax` above `sets`). If upstream adds
  a field to a routine exercise or changes those rules, check both.
- A routine's `folder` field (the fork's routine folders, DECISIONS.md D13). It is the only field
  the fork adds to upstream's data. It relies on `lib/sync-merge.js` merging a routine field by
  field and keeping fields it does not know; if upstream ever starts rebuilding routines from a
  fixed list of fields (as `lib/plan-share.js` does for shared plans), folders would be lost
  there. `src/hevier/lib/routine-folders.test.js` and the merge's own tests are the check.
- Upstream's finish (seam S9): `doFinishWorkout` saves, then the fork's `hooks.done` gets
  `{ w, prs, e1prs }`. The Save Workout page (`hevier/views/SaveWorkout.jsx`) writes `name` /
  `customName` / `note` the way upstream's Rename and Session note sheets do, copies upstream's
  discard, and changes When / Duration with `lib/workout-date.js` (`moveWorkout`,
  `setWorkoutDuration`, `endsInFuture`). If upstream moves its summary or its finish steps, move
  the seam with them.
- Settings (seams S11, S12): the fork's root repeats upstream's account card markup and reads
  `PAGES` / `pageVisible` from `views/settings-pages.js`; `prunePage` finds rows by their English
  title passed through `t()` and sections by upstream's `Section` component. If upstream renames a
  hidden row, it shows again — `src/hevier/views/SettingsRootHevy.test.jsx` fails first.
- `setNumberAt(sets, i)` exported from `views/Workout.jsx`: the set number the Hevy table shows.
  `HevyExerciseBlock`'s `setSide` is a copy of upstream's per-side field edit (`setSideField`,
  `weightOrigin`, `cascadeWeight`); if upstream's changes, change the copy.
- What upstream's `ExerciseBlock` does to a row (set-type menu, drops, bursts, plate line):
  `HevyExerciseBlock` repeats those calls over the same `lib/` helpers. After a sync, diff
  `ExerciseBlock` for new behaviour (CONFLICTS.md, "silent drift").
- Exports from `sheets.jsx`: `startFlow`, `beginWorkout`, `finishWorkout`,
  `finishWorkoutSheet`, `menuSheet`, `exerciseDetailSheet`, `exerciseHistorySheet`,
  `exerciseNoteSheet`.
- `lib/history.js`: `lastEntryFor`, `effectiveRoutines`, `effectiveRoutineIds`.
- Views the fork screens borrow from: `views/Plan.jsx` `deleteRoutineWithUndo`, `views/History.jsx`
  `historyRows`, `views/Stats.jsx` `FATIGUE_LEVELS`. `hevier/views/HevyHome.jsx` repeats upstream
  Home's week strip and today row in compact form: after a sync, diff `views/Home.jsx` for new
  behaviour there.
- React Router's tie-break (first of two equal routes wins), which seam S2 relies on;
  `src/hevier/views/navigation.test.jsx` fails if it changes.
- Upstream strings only for `tn()`: `lib/i18n-plural.test.js` requires every plural key in the
  locale packs, so fork code uses `t()` for new text and only existing `tn()` keys.
- `lib/workout-model.js`: set-type helpers (`isWarmupRow`, `toggleFailure`, `addDrop`, …).
- `S.workoutView` / `S.active.workoutView` semantics (docs/dev/LIST_VIEW.md).
- `build:mobile` in `frontend/package.json`, mirrored by `hevier/tools/emulator.sh`.
