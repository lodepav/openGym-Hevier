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
| S2 | `frontend/src/App.jsx` | `HevyTabBar` instead of `TabBar` when `HEVIER`; extra routes | planned |
| S3 | `frontend/src/views/Workout.jsx` | `'hevy'` accepted as a workout layout; renders `HevyWorkout` | planned |
| S4 | `frontend/src/views/Workout.jsx` | Hevy header stats row and footer for the `'hevy'` layout | planned |
| S5 | `frontend/src/sheets.jsx` | `beginWorkout` default layout `'hevy'` when `HEVIER` | planned |
| S6 | `frontend/src/lib/update.js` | Updater repo from `VITE_UPDATE_REPO` | done |
| S7 | `frontend/android/app/build.gradle` | `apply from: 'hevier.gradle'` at end of file. The fork-owned `hevier.gradle` sets the app id and points release/debug resources at `src/hevier-release` / `src/hevier-debug` (launcher name). Debug's res folder is *replaced*, so new upstream files in `src/debug/res` must be copied across | done |
| S8 | `CLAUDE.md` | Points agents at `hevier/README.md` and `DECISIONS.md` (HTML-comment markers) | done |

## Upstream contracts the overlay depends on

When one of these changes upstream, the fork's adapter changes. Never revert upstream's change.
`frontend/src/hevier/contract.test.js` checks them.

- `blockProps(idx)` in `views/Workout.jsx`: the handler props an exercise layout receives
  (`onToggle`, `onField`, `onAddSet`, `onRemoveSetAt`, `onRest`, `onSwap`, …).
- Exports from `sheets.jsx`: `startFlow`, `beginWorkout`, `finishWorkout`,
  `finishWorkoutSheet`, `menuSheet`, `exerciseDetailSheet`, `exerciseHistorySheet`,
  `exerciseNoteSheet`.
- `lib/history.js`: `lastEntryFor`, `effectiveRoutines`, `effectiveRoutineIds`.
- `lib/workout-model.js`: set-type helpers (`isWarmupRow`, `toggleFailure`, `addDrop`, …).
- `S.workoutView` / `S.active.workoutView` semantics (docs/dev/LIST_VIEW.md).
- `build:mobile` in `frontend/package.json`, mirrored by `hevier/tools/emulator.sh`.
