# Implementation plan — Hevy-like openGym for Android

Goal: the Android app should *work* like Hevy first (phase 1, UX) and then *look* like Hevy
(phase 2, UI design), on openGym's unchanged training logic, with upstream updates merging in
with as few conflicts as possible.

Baseline this plan was written against: upstream `v1.4.1` + `e348fc17` (2026-10-13). On that
baseline the frontend suite was green: 402 files, 5,060 tests. The debug APK was built and run
on an Android 16 (API 36) emulator at the Xperia 1 VI's resolution (1080×2340, 420 dpi).

---

Design decisions agreed with the user are in [DECISIONS.md](DECISIONS.md) and take precedence
over this plan where they differ.

## Scope principle (decided 2026-10-16)

**openGym's functionality, Hevy's UX and UI.** Phases 1 and 2 re-present what openGym already
does. They add no features. A Hevy element is built only if it is a new way to show or
reach something openGym already has. Elements that need new behaviour go on the **feature
backlog** (§5), considered only after phases 1–2 work well. Where openGym and Hevy differ in
*behaviour* (for example openGym's progression prefill vs Hevy's empty fields), openGym's
behaviour wins, presented Hevy's way.

## 0. Facts about upstream that shape this plan

- **Upstream moves fast.** About 1,800 commits in six months, often 10 or more a day. The files
  that change most are the 18 locale packs, `frontend/src/sheets.jsx` (3.4k lines),
  `views/Workout.jsx` (2.1k), `index.css` (2.1k), `views/Settings.jsx`, `store/useStore.js` and
  `lib/history.js`. **Every edit to one of these is a future conflict**, so the fork's code goes
  next to them, not inside them.
- **The app is one web bundle in a Capacitor shell.** "Changing the Android UI" means changing
  the React frontend. Java and Gradle need only identity changes (app id, name, updater).
- **The workout screen already has pluggable layouts.** `S.workoutView` is `cards | list |
  compact | focus` (`docs/dev/LIST_VIEW.md`). `FocusView.jsx` is a whole layout in its own
  file, fed by the same `blockProps(idx)` handlers as the other layouts: toggle, field edit,
  add/remove set, rest, swap and so on. The Hevy workout screen plugs in the same way, as one
  more layout.
- **Most Hevy features already exist as logic.** Warm-up, drop and failure sets, supersets,
  "last time" values (`lastEntryFor`), per-exercise rest, swipe to delete or copy a set,
  discard workout, session note, finish sheet, exercise history and charts, measurements, and
  even a Hevy CSV importer (`lib/import-hevy.js`). Phase 1 is mostly *re-arranging* existing
  capability, not inventing logic.
- **English is the source language and has no locale file.** `t('New string')` renders as
  itself in English. Fork-only strings therefore need no locale entries, which keeps the fork
  away from the 18 locale packs, the hottest files in the repo.

---

## 1. Pre-work (before any UX code)

Do these once, in order, on a branch `hevier/main` created from `main`.

### 1.1 Git topology

```bash
git remote add upstream https://github.com/DuarteSantos8/openGym.git   # already added
git config rerere.enabled true        # remember how each conflict was resolved
git config rerere.autoupdate true
git config merge.conflictStyle zdiff3 # shows the common ancestor in conflict hunks (agents need it)
git checkout -b hevier/main main
```

| Branch | Purpose | Who writes to it |
|---|---|---|
| `main` | A pure mirror of `upstream/main`. Fast-forward only, never a fork commit. | `git merge --ff-only upstream/main` |
| `hevier/main` | The fork's trunk: these docs, tooling, the seams, and finished phases. | Merges from `main` and from the phase branches. |
| `hevier/ux` | Phase 1. Branched from `hevier/main`. Sub-branches `hevier/ux/<screen>` per milestone are optional. | You and agents |
| `hevier/ui` | Phase 2. Branched from `hevier/main` *after* `hevier/ux` is merged into it. | You and agents |

Sync direction is always **upstream → `main` → `hevier/main` → active phase branch**. Never
the reverse. See [CONFLICTS.md](CONFLICTS.md) for the procedure.

Merge rather than rebase. With upstream at about 10 commits a day and long-lived phase
branches, a rebase replays every fork commit against every upstream change, and a conflict has
to be solved again for each commit. A merge solves it once, and `rerere` remembers it.

**Sync target:** prefer upstream's release tags (`git merge v1.4.2`) over the tip of `main`.
Tags are tested and come with a CHANGELOG entry that explains the intent of the changes. That
intent is exactly what conflict resolution needs.

### 1.2 GitHub fork hygiene

- In the fork's GitHub → Actions, **disable** `mirror.yml` (it pushes to upstream's GitLab and
  will fail without its secrets) and the CLA workflow. Disable them; don't delete the files.
  Deleted files conflict on every upstream edit to them.
- Keep `test.yml`: it runs the same suites on your PRs into `hevier/main`.

### 1.3 Fork identity (the only Android/native changes)

| What | Why | How (seam) |
|---|---|---|
| Application id `ch.duartesantos.opengym.hevier` | Installs beside the official openGym on the Xperia instead of clashing with it. | `frontend/android/app/hevier.gradle` sets `android.defaultConfig.applicationId`. One `apply from: 'hevier.gradle'` line goes at the end of `app/build.gradle` (the end of the file is stable; `versionCode` near the top changes each release). |
| App name "Hevier" (or your choice) | The launcher label. | `hevier.gradle` → `resValue "string", "app_name", ...`, after removing the string from `res/values/strings.xml` only if Gradle complains about a duplicate. Try `resValue` first. |
| In-app updater | `lib/update.js` checks `DuarteSantos8/openGym` releases, so the fork would offer the *official* APK, which can't install over it (different signing key). | One line: `const REPO = import.meta.env.VITE_UPDATE_REPO \|\| 'DuarteSantos8/openGym'`. The fork build sets `VITE_UPDATE_REPO=lodepav/openGym-Hevier`. Optionally upstream this as a PR: it is a harmless improvement. |
| Signing key | Updates must be signed with the same key. | `keytool` per `docs/MOBILE.md`. The keystore lives **outside** the repo. |

**Decision for you:** the application id and name above are placeholders. A different id also
means the fork's data is separate from an installed official app. Move data across with
Settings → Data & backup → Export / Import.

### 1.4 The build flag and the overlay folder

```
frontend/src/hevier/
  flag.js            export const HEVIER = import.meta.env.VITE_HEVIER === '1'
  index.js           the only module upstream seams import; re-exports the overlay's pieces
  hevier.css         all fork CSS, scoped under :root[data-ui="hevier"]
  lib/               fork-only pure helpers + *.test.js beside each
  components/        HevyTabBar, HevyExerciseCard, HevySetRow, ...
  views/             WorkoutHub (Hevy's "Workout" tab), Profile, SaveWorkout, ...
  contract.test.js   asserts the upstream exports/props the overlay depends on still exist
```

- `VITE_HEVIER` is unset in `npm test`, so **upstream's 5,000+ tests keep testing upstream's
  UI**, unmodified. The fork's tests render the fork's components directly, or set the flag
  with `vi.stubEnv('VITE_HEVIER', '1')`.
- With the flag on, the seam sets `document.documentElement.dataset.ui = 'hevier'`. All fork CSS
  hangs off that attribute, so it can never leak into upstream's look.
- **Build scripts stay out of `frontend/package.json`.** Its `version` line changes every
  release. `hevier/tools/emulator.sh` runs the same steps as `build:mobile`, with the fork's env
  vars. If upstream changes `build:mobile`, mirror the change there (CONFLICTS.md, "silent
  drift").

### 1.5 The seams (the complete list of planned upstream edits)

Each seam is at most a few lines, wrapped in `// [hevier] …` / `// [/hevier]` markers, and
recorded in [SEAMS.md](SEAMS.md).

| # | Upstream file | Seam | Phase |
|---|---|---|---|
| S1 | `frontend/src/main.jsx` | `import './hevier/index.js'` (applies `data-ui`, imports `hevier.css`) | 0 |
| S2 | `frontend/src/App.jsx` | `{!noTabs && (HEVIER ? <HevyTabBar/> : <TabBar/>)}` plus the fork's extra `<Route>`s | 1 |
| S3 | `frontend/src/views/Workout.jsx` | Accept `'hevy'` in the layout whitelist (line ~945) and render `<HevyWorkout … blockProps>` in the layout switch | 1 |
| S4 | `frontend/src/views/Workout.jsx` | Header and footer slots: Hevy's stats row (Duration · Volume · Sets) and its footer (Add Exercise / Settings / Discard) replace upstream's when `workoutView === 'hevy'` | 1 |
| S5 | `frontend/src/sheets.jsx` | `beginWorkout` snapshots `S.workoutView`. Fork default: `HEVIER ? 'hevy' : …` | 1 |
| S6 | `frontend/src/lib/update.js` | `VITE_UPDATE_REPO` | 0 |
| S7 | `frontend/android/app/build.gradle` | `apply from: 'hevier.gradle'` at end of file | 0 |
| S8 | `CLAUDE.md` | One line near the top: `See @hevier/README.md for this fork's rules.` | 0 |

Anything not on this list needs a new row (and a reason) before it is written.

### 1.6 Test rig (already working)

- `hevier/tools/emulator.sh`: builds the mobile bundle with the fork's flags, runs `assembleDebug`
  (debug keeps x86_64 for the emulator), boots AVD `xperia1vi_api36` (Android 16, 1080×2340,
  420 dpi), installs and launches.
- `hevier/tools/cdp.mjs`: scripted end-to-end checks over the WebView's DevTools socket
  (`click "Start Leg Day"`, `text`, `shot out.png`, `eval …`). No new dependencies.
- Unit and component tests: `cd frontend && npm test`. Both upstream's suite and the fork's
  `src/hevier/**` tests must pass.
- Per milestone: a scripted walk-through with `cdp.mjs` plus screenshots, then a manual pass on
  the emulator, then on the Xperia.

### 1.7 The target spec

[reference/SCREENS.md](reference/SCREENS.md) is the spec. It describes every Hevy screen
element by element, maps each element to what openGym already has (✅ / 🟡 / 🆕 / ⛔), and names
the screenshots that show it. The screenshots come from hevyapp.com's feature and help pages.
They are not committed (third-party images); `hevier/reference/fetch.sh` downloads them into
`hevier/reference/web/`. An agent implementing a milestone reads its SCREENS.md section and
looks at the named images before writing code.

For details screenshots can't show (animations, keyboard behaviour, exact Android
spacing), either the user checks on their phone, or Hevy is installed on a Play Store
emulator image signed in with the user's own Google and Hevy accounts. Only the user can do
that sign-in.

---

## 2. Phase 1 — UX (branch `hevier/ux`)

Order: the screen you use most first, and each milestone shippable on its own.

### M1. The active workout (highest value)

Hevy's workout screen, delivered as layout `'hevy'` (seams S3–S5), with the component in
`frontend/src/hevier/components/HevyWorkout.jsx`. Full element list: SCREENS.md §2 (and §3
for the finish flow). Summary:

| Hevy behaviour | openGym capability reused | New code |
|---|---|---|
| Top bar: ⌄ minimise · title · rest-timer icon · **Finish** | header's ⌄, `finishWorkout()` | layout only |
| Stats row: **Duration · Volume · Sets** | `Elapsed`, the set counts already in the header | `hevier/lib/session-stats.js` (volume) + test |
| One scrolling list of exercise cards | the `list` layout's unit loop | card component |
| Card head: thumbnail, name in the accent colour (tap → exercise details), ⋯ menu (Replace, Superset, Reorder, Remove) | `exerciseDetailSheet`, swap/pair/move/remove handlers in `blockProps` | layout only |
| "Add notes here…" inline note | `exerciseNoteSheet` / pinned note | inline field wired to the same note data |
| "Rest Timer: 1min 30s" row per exercise | `onRest` / per-exercise rest | layout only |
| Set table: **SET · PREVIOUS · KG · REPS · ✓** | `ExerciseBlock`'s row handlers (`onField`, `onToggle`) | `HevySetRow.jsx` |
| SET cell shows `W` / `D` / `F` / number; tap → set-type picker | warm-up phase, drops, `toggleFailure` (workout-model.js) | picker sheet calls the existing model functions |
| PREVIOUS shows last session's set N (`60 kg × 8`); tap copies it into the row | `lastEntryFor(S, exId, rid)` | `hevier/lib/previous-sets.js` (per-set alignment) + test |
| Inline numeric inputs, no ± steppers; placeholder = previous value | `S.wc.steppers = false` already hides steppers | input styling |
| ✓ turns the row green, starts rest | `toggle` → rest/sound/haptics pipeline | none |
| Swipe left deletes a set (with undo) | `swipeSets`, `deleteActiveSet` / `undoDeleteSet` | none |
| **+ Add Set** full-width button | `onAddSet` | layout only |
| Footer: **+ Add Exercise**, Settings, **Discard Workout** | `addExercise`, `WorkoutSettingsSheet`, `discardWorkout` | layout only (S4) |
| Rest timer docked at the bottom with −15 / +15 / Skip | `RestTimer` (already docks in a workout) | restyle in phase 2; check its buttons |
| Minimised workout → floating "Workout in progress · Resume" bar above the tabs | `S.active` + TabBar's resume logic | part of `HevyTabBar` (M2) |

**Status (2026-10-16): first cut built** on `hevier/ux`: `frontend/src/hevier/views/HevyWorkout.jsx`
and `components/HevyExerciseBlock.jsx` through seam S3. It covers reps exercises (warm-up /
failure / drop / rest-pause, PREVIOUS, effort column, swipe, plate line, supersets) and was
verified on the emulator through a full start → log → finish → second-session cycle. Still open in
M1: Hevy rows for timed, cardio and per-side (L/R) exercises (these currently render upstream's
block inside the Hevy screen) and the rest timer riding above the keypad.

Acceptance: a full leg-day session can be logged, minimised, resumed, finished, and read back
in history, with weights progressing for the next session exactly as upstream's layouts do.
The proof is a component test that runs the same session through `'list'` and `'hevy'` and
asserts identical `S.workouts` and identical next-session targets.

### M2. Navigation: three tabs (SCREENS.md §0, §1, §4, §5)

`HevyTabBar` (seam S2): **Home · Workout · Profile**. No Coach tab. The AI coach is
**disabled by default** and not surfaced anywhere in the fork's navigation. It stays reachable
only through upstream's own opt-in (Settings → Coach, whose default is already `off` on the
phone: `lib/coach-device.js`). Its code is untouched, so it costs nothing in merges.

| Hevy tab | Built from |
|---|---|
| Home: a feed of your finished workouts as cards (name, date, duration, volume, PR count, top sets) | `S.workouts`, `History`'s data and `onerm.js`. No social features. |
| Workout: "Start Empty Workout", Routines (folders, "New Routine", ⋯), each routine card with exercise preview and **Start Routine** | `Plan` / `StartChooser` data and `startFlow(routineIds)` |
| Profile: summary header; weekly chart toggled between Duration / Volume / Reps; Dashboard links (Statistics, Exercises, Measures, Calendar); ⚙ Settings | `Stats`, `Library`, `Measurements`, `History`, `Settings`, all as existing routes |

**Status (2026-10-16): first cut built** on `hevier/ux` through seam S2 (`hevier/routes.jsx`):
`HevyTabBar` (three tabs + "Workout in progress · Resume" bar), `views/WorkoutTab.jsx` (D13),
`views/Profile.jsx` with `components/WeeklyChart.jsx` over `lib/weekly-series.js` (D14), and
`views/HevyHome.jsx` with Edit Home over `lib/home-layout.js` (D12). Feed cards
(`components/WorkoutCard.jsx`) open upstream's workout details for edit/repeat/delete. Verified on
the emulator. Still open: Hevy's ⋯ menu on feed cards, a back button on upstream screens reached
from Profile (Android back works), Discard on the resume bar.

openGym's weekly **schedule** and rotation (the "today is Leg Day" logic) have no Hevy
equivalent. Keep them, surfaced as "Today: Leg Day — Start" at the top of the Workout tab,
rather than deleting logic.

### M3. Routine editor

Hevy-style table (SET · KG · REPS, set types, rest per exercise) over `RoutineEdit`'s data.
Prefer a new view `hevier/views/RoutineEditHevy.jsx` routed by S2 over editing
`RoutineEdit.jsx`. Progression settings stay reachable from the ⋯ menu: this is openGym's
strength over Hevy, so keep it.

### M4. Finish → Save → Summary

Hevy: **Save Workout** page (title, duration/volume/sets, when, description) then a
"Well done" summary with the workout number and PRs. Built on `finishWorkoutSheet` /
`finishWorkout()`: the new page collects title and description into the *existing* session
fields (name, `A.note`) and then calls upstream's finish. `lib/finish-workout.js` is never
forked.

### M5. Exercise details

Tabs **Summary** (heaviest weight / est. 1RM / best-set volume chart, PRs) · **History** ·
**How to**, from `exerciseDetailSheet`, `exerciseHistorySheet` and `onerm.js` data.

### M6. Profile dashboard and statistics (SCREENS.md §5, §6, §11)

The Profile header with the weekly bar chart (Duration / Volume / Reps), Dashboard
(Statistics · Exercises · Measures · Calendar), and the Statistics page (body-map week,
set count per muscle). New views over `Stats` / `recovery` / `structuralBalance` data. The
weekly series are a 🆕 helper derived from logged workouts. The radar chart is on the backlog.

### M7. Settings regrouped (SCREENS.md §10)

Hevy's "Workout Settings" page order and wording over openGym's existing settings. Only
presentation, via a fork page list instead of editing `views/settings-pages.js`.

### Out of scope for the fork (say no early)

Social feed, followers, likes, and the explore and community routines. They need a server-side
social model that openGym deliberately doesn't have.

### Phase 1 done when

- M1–M7 merged into `hevier/ux`, all tests green, and SEAMS.md current.
- Walked through on the emulator (scripted) and on the Xperia (manual), with screenshots in
  `hevier/reference/<screen>/after-ux.png`.
- `hevier/ux` merged into `hevier/main`.

---

## 3. Phase 2 — UI design (branch `hevier/ui`)

Branch from `hevier/main` after phase 1 is merged. (Starting earlier means merging `hevier/ux`
into `hevier/ui` regularly, which doubles the sync work. Avoid it.)

1. **Tokens first.** openGym's whole look is CSS custom properties on `:root` and
   `:root[data-theme=…]` in `index.css` (`--bg`, `--label`, `--acc`, …). Override them in
   `hevier.css` under `:root[data-ui="hevier"]`, `:root[data-ui="hevier"][data-theme="light"]`
   and so on. Hevy's palette: near-black/white surfaces, Hevy blue accent, grey secondary
   text, green completed rows. This one file restyles most of the app with zero upstream edits.
2. **Typography and density**: font stack, sizes, row heights and radii in the same file.
3. **Component restyles** for the fork's own components (free: fork files) and, for upstream
   components still shown, *selectors* in `hevier.css` (`:root[data-ui="hevier"] .btn.primary`)
   rather than edits to `index.css`.
4. **Icons**: if Hevy-like glyphs are wanted, add them in `hevier/components/icons.js` and
   resolve them before falling back to `Icon.jsx`, not by editing the shared icon table.
5. **App icon and splash**: `frontend/resources/` is upstream's. Generate the fork's into
   `hevier/resources/` and copy them in at build time from `emulator.sh` / the release script,
   or accept one small seam in `android/app/src/main/res/` (these rarely change upstream).

Risk to watch: upstream renames a class or a CSS variable and the override silently stops
matching. Nothing conflicts; the look just regresses. Guard it with a screenshot pass per
upstream sync (CONFLICTS.md step 6).

---

## 4. Working agreements for every change

- Ask "can this be a new file?" before editing an upstream file. If not, add the seam to
  SEAMS.md in the same commit.
- Training logic: a pure helper in `frontend/src/hevier/lib/` with a test beside it
  (CONTRIBUTING.md's rule applies to the fork too). Never edit `progression.js`,
  `finish-workout.js`, `onerm.js` or `workout-model.js` for a UX reason.
- Don't add persisted fields to `S` unless unavoidable. Upstream's sync and merge code
  (`lib/sync-merge.js`, `sync-changes.js`) and the export/backup format are not yours to
  extend. A device-only UI preference goes in `localStorage` under a `hevier_` key. A field
  that must sync gets a `hv` prefix and a test showing it survives `sync-merge`.
- No new dependencies (upstream's hard rule, and every new one is a `package.json` conflict).
- Commit messages: prefix `hevier:` so `git log --grep '^hevier:'` lists the fork's own work.
- Fixes to upstream bugs you find on the way go upstream as PRs (from a branch off `main`).
  Every fix upstream takes is one less divergence to carry.

## 5. Feature backlog (after phases 1–2)

Hevy elements that need behaviour openGym doesn't have. Not built in phases 1–2; listed so they
aren't lost:

- Routine folders (openGym has a flat routine list plus the weekly plan or rotation)
- Workout photos / videos on the Save Workout page
- Live personal-record badge while logging a set, with its notification and sound
- Monthly report, multi-year calendar, muscle-distribution radar chart
- "Previous Workout Values: Any workout / Same routine" as a user setting
- Hevy-style warm-up calculator sheet (if openGym's warm-up generator differs)

## 6. Risks

| Risk | Mitigation |
|---|---|
| Upstream restructures `Workout.jsx` around `blockProps` / layouts | `contract.test.js` fails loudly. The fix is in the fork's adapter, not in upstream code. |
| Upstream adds a feature to the workout screen that the Hevy layout doesn't render | Read each sync's CHANGELOG for workout-screen items; add to `HevyWorkout` (CONFLICTS.md, "silent drift"). |
| `S.workoutView = 'hevy'` reaches an upstream build (the shared server, a backup imported into official openGym) | Upstream reads unknown values as `cards` (LIST_VIEW.md), so it degrades safely. Keep that test. |
| Locale coverage for fork strings | English only at first. Add a fork overlay pack only if you need another language. |
