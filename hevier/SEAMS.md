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
| S2 | `frontend/src/App.jsx` | The `TabBar` import is renamed `UpstreamTabBar` and `TabBar` is bound to `HevyTabBar` when `HEVIER` (upstream's JSX line, which `App.no-tabs.test.js` reads, stays as it is). `{HEVIER && hevierRoutes}` sits first inside `<Routes>`: React Router gives an exact tie to the first route, so `/home`, `/workout`, `/profile`, `/stats`, `/library` and `/plan/r/:id` (the routine editor) become the fork's without upstream's lines changing (`hevier/routes.jsx`) | done |
| S3 | `frontend/src/views/Workout.jsx` | Two imports after the last import, and `if (HEVIER) return <HevyWorkout …/>` right before `ActiveWorkout`'s final `return`, after every hook. The Hevy screen is the fork's only layout (D1), so no `workoutView` value is stored and S4/S5 were not needed | done |
| S6 | `frontend/src/lib/update.js` | Updater repo from `VITE_UPDATE_REPO` | done |
| S7 | `frontend/android/app/build.gradle` | `apply from: 'hevier.gradle'` at end of file. The fork-owned `hevier.gradle` sets the app id and points release/debug resources at `src/hevier-release` / `src/hevier-debug` (launcher name). Debug's res folder is *replaced*, so new upstream files in `src/debug/res` must be copied across | done |
| S8 | `CLAUDE.md` | Points agents at `hevier/README.md` and `DECISIONS.md` (HTML-comment markers) | done |

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
  reuses its exported `removeRoutineExercise`. Its table edits go through
  `hevier/lib/routine-table.js`, which follows `ExConfig`'s save rules in `sheets.jsx` (even
  per-side reps, `normalizeRepRange`, a pyramid's lists, `setsMax` above `sets`). If upstream adds
  a field to a routine exercise or changes those rules, check both.
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
