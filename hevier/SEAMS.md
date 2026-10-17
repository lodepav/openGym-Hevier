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
| S17 | `frontend/android/app/src/main/java/ch/duartesantos/opengym/MainActivity.java` | `registerPlugin(HevierHealthReadPlugin.class)` beside upstream's plugins: the fork's Health Connect read plugin (D27), in `src/hevier/java`, which `hevier.gradle` (S7) adds to both build types; its two read permissions are in the fork's manifest overlay. **Temporary:** removed at the v1.4.3 merge, whose own HealthConnectPlugin reads | done |
| S18 | `frontend/src/lib/health-connect.js` (`healthRecords` weights), `frontend/src/lib/sync-merge.js` (`mergeBodyweight`), `frontend/src/sheets.jsx` (`BwSheet` save) | **Backports, no markers:** upstream's v1.4.3 lines (commit f9c03474), word for word, so the merge meets identical changes: an imported weigh-in (`src`) is not written to Health Connect, a typed one beats an imported one in a sync merge, typing over one clears `src` (D27). Unmarked on purpose, a marker would make the lines differ. At the v1.4.3 merge they become upstream's own and this row goes; in `sheets.jsx` upstream also renamed `iso` to `date` on that line, so take upstream's | done |
