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
| App name **Go Hevier** (D39, 2026-10-17; was "Hevier") | The launcher label. | Done: fork-owned `src/hevier-release/res/values/strings.xml` (and `hevier-debug`, "Go Hevier Test"), added to the source sets by `hevier.gradle`; the PWA's in `public/hevier/manifest.json`. |
| In-app updater | `lib/update.js` checks `DuarteSantos8/openGym` releases, so the fork would offer the *official* APK, which can't install over it (different signing key). | One line: `const REPO = import.meta.env.VITE_UPDATE_REPO \|\| 'DuarteSantos8/openGym'`. The fork build sets `VITE_UPDATE_REPO=lodepav/openGym-Hevier`. Optionally upstream this as a PR: it is a harmless improvement. |
| Signing key | Updates must be signed with the same key. | `keytool` per `docs/MOBILE.md`. The keystore lives **outside** the repo; its certificate's SHA-256 is pinned in `hevier/security/apk-cert.txt` (D38). |

**Decided:** the application id above, and the name Go Hevier (D39). A different id also
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
verified on the emulator through a full start → log → finish → second-session cycle. Timed holds
(KG · SEC with a start button, L/R pairs), cardio (MIN · speed · optional incline) and per-side
reps (an L and an R line under one set number, each ticked on its own) now have Hevy rows too, so
upstream's block no longer renders inside the Hevy screen. A focused field gets Hevy's keypad row
(`components/KeypadBar.jsx`: ⌨ hides the keyboard) and the rest timer rides on top of it, on
Android 15's `--native-kb` as on older versions. M1's layout is complete.

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
(`components/WorkoutCard.jsx`) open the fork's **Workout Detail** page (seam S14, added after
phase 1 at the user's report): title, Time · Volume · Sets · Records, description, a muscle split
in sets, each exercise's SET · WEIGHT & REPS table with the PR on the set that made it
(`hevier/lib/pr-set.js`, upstream's record); ⋯ has Hevy's actions and All details
(upstream's sheet: note, date, duration, copy, share, .fit). Feed cards also have Hevy's ⋯
(Save as routine · Repeat today · Edit workout · Delete workout, upstream's own actions), the
resume bar has Discard, and Stats and Exercises get a "‹ Profile" back row. Verified on the
emulator.

openGym's weekly **schedule** and rotation (the "today is Leg Day" logic) have no Hevy
equivalent. Keep them, surfaced as "Today: Leg Day — Start" at the top of the Workout tab,
rather than deleting logic.

### M3. Routine editor

Hevy-style table (SET · KG · REPS, set types, rest per exercise) over `RoutineEdit`'s data.
Prefer a new view `hevier/views/RoutineEditHevy.jsx` routed by S2 over editing
`RoutineEdit.jsx`. Progression settings stay reachable from the ⋯ menu: this is openGym's
strength over Hevy, so keep it.

**Status (2026-10-16): first cut built** (`hevier/views/RoutineEditHevy.jsx`, routed over
`/plan/r/:id` by S2, with `hevier/lib/routine-table.js` and its test). Hevy's table is drawn from
openGym's one-prescription-per-exercise plan, per DECISIONS.md D15: a flat exercise's rows share
one weight and one rep target, back-off weights are derived, double/triple progression shows
REP RANGE, a pyramid is edited set by set. W / F / Max set types; drop sets, back-off, pyramid,
per side and progression stay in upstream's settings behind ⋮. Exercises drag to reorder
(`hevier/components/useDragReorder.js`, rows of any height, auto-scroll), supersets as one. The
Workout tab's routines got the same drag and Hevy's folders (D13, `hevier/lib/routine-folders.js`).
The Hevy Add Exercise picker (SCREENS.md §8) came after phase 1, through seam S13
(`hevier/views/ExercisePickerHevy.jsx`, `hevier/lib/exercise-picker.js`): search, All Equipment
(with the active equipment profile as an option, on by default as upstream's) and All Muscles
sheets, Recent Exercises, ✓ circles and "Add 2 exercises". Each pick is the caller's quick add,
so what an exercise starts with is upstream's. A Replace or a swap is one tap, opening on the
same muscle. With two or more ticked, **Add superset** adds them the same way and links them
with upstream's `pairAdjacent`, in a workout or the routine editor. The same list,
without ✓, is Profile → **Exercises** (`/library`; a tap opens exercise details, upstream's
By muscle is in the header). Profile → **Calendar** is a page (`hevier/views/Calendar.jsx`,
`hevier/lib/calendar.js`): week streak and rest days, Month (months back, trained days filled)
and Year (twelve small months), with upstream's marks and day sheet. Android back on a tab screen
offers to exit (seam S16) instead of walking back through every tab.

### M4. Finish → Save → Summary

Hevy: **Save Workout** page (title, duration/volume/sets, when, description) then a
"Well done" summary with the workout number and PRs. Built on `finishWorkoutSheet` /
`finishWorkout()`: the new page collects title and description into the *existing* session
fields (name, `A.note`) and then calls upstream's finish. `lib/finish-workout.js` is never
forked.

**Status: done.** Seam S9 sends upstream's `finishWorkout` to `/workout/save`
(`hevier/views/SaveWorkout.jsx`), which writes the title and description into the session,
saves with upstream's `doFinishWorkout` and then applies a changed When / Duration with
upstream's `moveWorkout` / `setWorkoutDuration` (`hevier/lib/save-workout.js`). The same seam
replaces upstream's summary sheet with `/workout/done`: "Nice work!", the workout number, the
feed card, PRs and estimated-1RM records, the last 7 days, the body map and upstream's
"Last time and next time", cardio and media sections. Unchecked sets are a warning on the page
instead of a confirm.

### M5. Exercise details

Tabs **Summary** (heaviest weight / est. 1RM / best-set volume chart, PRs) · **History** ·
**How to**, from `exerciseDetailSheet`, `exerciseHistorySheet` and `onerm.js` data.

**Status: done.** Seam S10 sends upstream's `exerciseDetailSheet` to the fork's sheet
(`hevier/views/ExerciseDetails.jsx`): Summary (media, muscle tags, the latest value with a
3-month / year / all-time chart of heaviest weight, one-rep max or best set volume, Personal
Records, Set Records by rep count), History (a card per session, tap for the workout) and How to
(pinned note, description, steps). The numbers come from upstream's `exerciseHistory`, read by
`hevier/lib/exercise-summary.js`. ⋯ has favourites, Add to my plan, edit/delete for custom
exercises, and **All details**, upstream's own sheet (plate loading, weight meaning, 1RM
calculator).

### M6. Profile dashboard and statistics (SCREENS.md §5, §6, §11)

The Profile header with the weekly bar chart (Duration / Volume / Reps), Dashboard
(Statistics · Exercises · Measures · Calendar), and the Statistics page (body-map week,
set count per muscle). New views over `Stats` / `recovery` / `structuralBalance` data. The
weekly series are a 🆕 helper derived from logged workouts. The radar chart was dropped (§5, D23).

**Status: done.** Profile (header, weekly chart, dashboard, feed) came with M2. `/stats` is the
fork's Statistics (`hevier/views/Statistics.jsx`): the last 7 days as a week strip and body map,
the set count per muscle group by week, month or year against the one before
(`hevier/lib/muscle-sets.js`, over upstream's `loadOfWorkouts`), then upstream's whole Stats at
`/stats/all` and Structural balance. `/measures` (`hevier/views/Measures.jsx`) has body weight
with upstream's log, goal and weigh-in list, then upstream's Body measurements and Progress
photos, whose own ‹ now goes back where the user came from.

### M7. Settings regrouped (SCREENS.md §10)

Hevy's "Workout Settings" page order and wording over openGym's existing settings. Only
presentation, via a fork page list instead of editing `views/settings-pages.js`.

**Status: done** (DECISIONS.md D16). Seam S11 gives `views/Settings.jsx`'s root the fork's titled
groups (`hevier/views/SettingsRootHevy.jsx`) and drops hidden rows from its search; seam S12 passes
each page's element tree through `hevier/lib/settings.js` `prunePage`, which leaves out the rows
that only steer upstream's workout layouts.

### Out of scope for the fork (say no early)

Social feed, followers, likes, and the explore and community routines. They need a server-side
social model that openGym deliberately doesn't have.

### Phase 1 done when

**Status (2026-10-16): done.** M1–M7 are on `hevier/ux`, the full suite is green (5161 tests,
the fork's 101 among them), each milestone was walked through on the emulator, and `hevier/ux` is
merged into `hevier/main`. The walk on the Xperia itself is still the user's.

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

**Status:** step 1 done (2026-10-16). `hevier/theme.css` overrides upstream's tokens under
`:root[data-ui="hevier"]`: Hevy blue `#008cff` as `--acc` and `--blue`, warm-up yellow `#efab03`
and failure red `#e34b37` (all three measured from Hevy's screenshots), near-black surfaces and
grey secondary text (estimated: Hevy's site shows only light mode). Seam S15 pins dark and the
blue preset (D17); Look & Home no longer offers Theme or Accent color.

Steps 2–3, first pass (2026-10-16), checked side by side with Hevy on the emulator. Upstream's
pages, by selector in `theme.css`: compact 22px page titles instead of 34px large titles, bare
header icons, buttons at 15px / weight 500 with 8px corners. The fork's own, in `hevier.css`:
Log Workout's set rows are flat and run edge to edge (a ticked set is a full-width green band),
the ✓ is Hevy's filled grey box, ⋮ is vertical, the header glyphs are bare, the stats values are
regular weight; Profile's weekly chart sits on the page; the tabs' icon buttons are bare.
Second pass (2026-10-16), same check: sheets have a centred 17px title and their rows are one
card with hairlines and bare glyphs (`theme.css`); the rest timer on the workout screen is a flat
bar with the clock large and centred over −15 · +15 · ⏸ · Skip; zebra rows in Log Workout and
the routine editor; the Add Exercise picker is a flat list with hairlines; exercise details' tabs
are underline tabs; Save Workout's title and stats sit flat on the page; Settings is edge to edge
under grey section bands, and Look & Home shows no theme preview. Settings, Statistics and
Measures name themselves in the bar, centred beside the back link, like Settings' sub-pages.

Steps 4–5 (2026-10-16, at the user's choice). Icons: upstream's outline set already reads like
Hevy's, so only the glyphs Hevy draws differently are the fork's own, in
`hevier/components/HvIcon.jsx` (an alarm clock for Log Workout's rest timer button; a standing
figure for Profile's Measures tile), falling back to upstream's `Icon` for every other name: no
seam in `Icon.jsx`. App icon and splash: upstream's, recoloured from lime to Hevy blue by
`hevier/tools/recolour-icons.py` into `frontend/android/app/src/hevier/res`, which seam S7's
`hevier.gradle` adds to both build types; the system splash is dark. Profile's dashboard tiles
are Hevy's: a line chart for Statistics, the standing figure for Measures. Phase 2 is done. The
PWA's icons followed on 2026-10-17: the same script writes blue copies of `frontend/public`'s
into `frontend/public/hevier/`, beside a manifest named Hevier (Go Hevier since D39), and `hevier/lib/pwa-icons.js`
points index.html's manifest and icon links there at boot (no seam). The web push notification
icons in upstream's `sw.js` stay lime.

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

- ~~Routine folders~~ (moved into phase 1, D13, 2026-10-16)
- ~~Workout photos / videos on the Save Workout page~~ (covered, 2026-10-17: upstream's
  WorkoutMediaSection is on the "Nice work!" page right after Save and in Workout Detail; upstream
  ties a photo to a saved workout, so it cannot sit on the Save page itself without new logic)
- ~~Live personal-record badge while logging a set~~ (D22, 2026-10-17; no sound, at the user's choice)
- ~~Monthly report~~ (D23, 2026-10-17, built). ~~Muscle-distribution radar chart~~: dropped, at the user's
  request. ~~Multi-year calendar~~: covered, Profile → Calendar → Year steps back a year at a time.
- ~~"Previous Workout Values: Any workout / Same routine" as a user setting~~ (D21, 2026-10-17)
- ~~Hevy-style warm-up calculator sheet~~ (covered, 2026-10-17: openGym ramps warm-ups itself,
  `rerampWarmups`, from the routine's warm-up count and ⋮ → Add warm-up set; a percentage
  calculator would be a second warm-up rule beside upstream's)

### The user's own features (added 2026-10-16)

Not Hevy parity: features the user wants on top. Each needs a decision in DECISIONS.md before
it is built. Check [PIPELINE.md](PIPELINE.md) first, and prefer contributing upstream where
the feature is not Hevy-specific (it would remove fork code).

1. ~~**Body weight from Health Connect.**~~ Built as D27 (2026-10-17), upstream's v1.4.3 rules, until that merge; the "only source" part below built as D32 (2026-10-17). Read weigh-ins *from* Android Health. Upstream only
   writes workouts and weigh-ins *to* it (#371). Needs a native read permission, which is fork
   Android code beyond seam S7. **Health Connect becomes the only source** (user, 2026-10-16):
   with it on, the app's own weigh-in entry is turned off (the body-weight card, the check-in's
   weight prompt and the add sheet), and upstream's write of weigh-ins *to* Health Connect is
   skipped so they don't echo back. The weights read are still stored as openGym's body-weight
   log, since bodyweight exercises, the charts and strength level (item 3) read it from there.
2. ~~**Heart rate pulled in after the finish.**~~ Built as D27 (2026-10-17), upstream's v1.4.3 reading, until that merge. On finishing, fetch the workout's heart-rate
   samples from Health Connect. They arrive late (watches sync minutes after), so retry later:
   on the next app open, back-fill the *previous* workout's heart rate if it is still missing.
   Upstream 1.4.2 has per-set heart rate on the Apple Watch: reuse its data shape.
3. ~~**Strength level per exercise, typed in by the user**~~ (user's choice, 2026-10-16). Decided as D19 (2026-10-17), built: all-time best 1RM, no re-enter prompt. The app
   bundles no standards: strengthlevel.com's terms forbid automated access (scraping, scripts),
   and its tables are theirs. Instead, exercise details get a **Compare strength** button that
   opens strengthlevel.com in the browser (the exercise's page if we know its slug, else the site's
   search). There the user enters their own numbers, then types the five thresholds it
   shows (Beginner · Novice · Intermediate · Advanced · Elite, in kg or lb) into a small form in
   the app. The app saves them for that exercise, then shows a **progress bar through the
   levels** from the user's best estimated 1RM (upstream's `onerm.js`): the current level, and
   how far it is to the next.
   - The thresholds depend on body weight and age, so the form saves the date and the body weight
     they were entered at, and suggests re-entering when either has drifted (say 5 %).
   - Storage: per exercise, in `S` (a fork-only field upstream ignores, like routine folders,
     D13), so it syncs and is in backups, including the Google Drive sync (item 7). Not
     device-local.
   - A pure helper with tests in `hevier/lib/` (level and progress from the thresholds and the
     1RM history), shown in exercise details (M5 Summary).
   - An optional slug table (openGym exercise id → strengthlevel.com page) only makes the link
     land on the right page. It holds no data from them.
4. ~~**Gyms.**~~ Decided with item 5 as D28 (2026-10-17). No prompt at the start (the user's choice,
   2026-10-17): the workout's gym line shows and changes it from the first second. Item 17 (2026-10-17) adds Hevy's gym picker. The original note: Tag each workout with a gym, as Hevy does. Upstream 1.4.3 adds gym *locations*
   for the gym reminder, kept on the phone only: reuse that list if it fits, rather than a
   second one.
5. ~~**Gym and brand labels for machine and cable exercises.**~~ D28 (2026-10-17). A machine exercise can carry a
   gym and/or an equipment brand label (e.g. "Life Fitness", "my gym"). Exercise stats can show
   either everything, or only the sets done with the current labels, since the same exercise
   on two machines isn't comparable. Machines and cables only, not free weights.
6. **Gym at workout start picks the backups.** *Waits for upstream 1.4.2's backups (the merge of v1.4.2).* Starting a workout or routine at a tagged gym
   swaps in, straight away, the backup exercise that gym has, using upstream 1.4.2's
   *backups for an exercise* (up to five per routine exercise).

7. ~~**Automatic sync to Google Drive**~~ (user, 2026-10-16). Done, no code: decided as D20 (2026-10-17): a sync
   app over upstream's auto-backup folder, no fork code. Setup on the phone: Settings → Data &
   backup → turn on **Auto-backup on changes** (optionally choose a folder); install a sync app
   and pair `Documents/openGym` (or the chosen folder) with a Drive folder, upload only, on any
   change. Check after the next workout that a dated `opengym-backup-….json` lands in Drive.
   Restore: download the newest file, then Settings → Data & backup → **Import backup**. It
   replaces the data; signed in, it offers **Merge them in** when the server has workouts the
   backup lacks.
   The original note: The user's data is backed up to their
   own Google Drive without a manual export. Start from what upstream has: Android auto-backup
   after a workout or an edit (v1.x), into a folder the user picks (#161, "for example a sync
   app's folder"). The cheapest route may be pointing that folder at Google Drive (the system file
   picker, or a sync app) and adding nothing. A real Drive API client is a fork-only opt-in: a
   Google account, OAuth and a dependency, all against upstream's "no third-party account" and
   dependency-light rules. So decide whether the folder route is enough before building it. Restore:
   upstream's import with "Merge them in" (1.4.2). From here on, fork data that matters goes in
   `S`, not localStorage, so that it is part of this sync.

8. ~~**Volume as sets per muscle group**~~ (user, 2026-10-16; decided as D18, built). Hevy measures volume as tonnage
   (weight × reps). The user wants a Settings switch between **total weight** and **sets per
   muscle group**, the sets counted over whatever period the screen shows (a workout, a week, a
   month…). The fork's Statistics already counts sets per muscle (`hevier/lib/muscle-sets.js`,
   upstream's `loadOfWorkouts`), and Workout Detail's muscle split counts sets. Decide which places
   switch (feed card Volume, the workout's stats row, Profile's weekly chart Volume, Statistics)
   and where the setting lives (`S`, so it syncs, per §4), in DECISIONS.md first.

### Fixes and features from the second session (added 2026-10-17)

Same rule: a decision in DECISIONS.md before each is built, PIPELINE.md checked first.

9. ~~**No screen rotation.**~~ Decided as D24 (2026-10-17), built. The app stays portrait. The PWA manifest already says
   `"orientation": "portrait"`, but the Android activity (`AndroidManifest.xml`, `.MainActivity`)
   sets no `screenOrientation`, so the APK rotates. Fix without a new seam: a fork-owned
   `src/hevier/AndroidManifest.xml` that the manifest merger folds in, adding
   `android:screenOrientation="portrait"` to `.MainActivity` (`tools:node="merge"`), added to both
   build types' source sets in `hevier.gradle` (seam S7). iOS, if it is ever built: the
   supported orientations in `Info.plist`. Check on the emulator that turning the device leaves
   the workout screen as it is. Upstream may take this too (a gym app rarely wants landscape):
   ask before carrying it.
10. ~~**Keep the screen on during a workout, as a Settings switch.**~~ Decided as D25 (2026-10-17): upstream's switch works in the APK, checked on the emulator; no fork code. Upstream already has it:
    Settings → Workout → *Before and during* → **Keep screen awake** (`S.keepAwake`, default
    on; `lib/wakelock.js`, used in `App.jsx` while a workout runs), and the fork's pruning
    (D16) does not hide it. But the row is only drawn when the Screen Wake Lock API exists
    (`wakeOK || !MOBILE`), and the native app runs in Android's WebView, so first check on
    the emulator and the phone whether the row shows and the screen actually stays on. If the
    WebView lacks `navigator.wakeLock`, the row is hidden and the screen sleeps: the fix is a
    native fallback (the activity's `FLAG_KEEP_SCREEN_ON`, set and cleared from JS through a
    tiny bridge, the way upstream's own Java talks to the page), which also helps upstream's
    Android build, so offer it upstream first. The fork's quick-access copy could also sit on
    the workout's ⏱/⋮ sheet (upstream's `WorkoutSettingsSheet` has the same switch).
11. ~~**Security gates on release builds.**~~ Decided as D26 (2026-10-17), built: `hevier/tools/release-check.sh`
    and the `release-check` skill; local only, no APK checks yet. **The APK checks: agreed with
    the user on 2026-10-17, to build** (item 16). The original note: Before an APK (or image) is called final, check it for
    leaked secrets and malicious code. Upstream's GitLab CI already Trivy-scans the images (OS
    packages and npm trees, HIGH/CRITICAL fixable fails) and writes SBOMs, but nothing scans the
    APK or the source for secrets, and the fork builds its APK locally
    (`hevier/tools/emulator.sh`). Proposed gates, all run by a fork-owned script
    (`hevier/tools/release-check.sh`) and by the `verify` skill before a release:
    - **Secrets:** gitleaks (or trufflehog) over the git history and the working tree, and over
      the unpacked APK and `dist/` (no API keys, keystore passwords, `.env` values, Hevy API
      keys from testing, private VAPID keys).
    - **Dependencies:** `npm audit --omit=dev` for frontend, api and mcp (high and above
      fails), plus Trivy `fs` over the repo and the APK's bundled JS.
    - **Malicious code:** a lockfile diff since the last release (new or changed packages,
      install scripts, packages that are new on npm) reviewed by hand; grep the built bundle
      for unexpected network endpoints (anything that isn't the user's own server, Hevy's API
      during import, or the media CDN), `eval`/`new Function`, and obfuscated blobs.
    - **APK checks:** the permissions in the merged manifest match an allow-list (a new one
      fails), `debuggable` is false and the release is signed with the fork's key; optionally
      MobSF for a static report.
    These are tools run *by* the build, not dependencies *of* the app, so the dependency-light
    rule is kept. A GitHub Actions workflow is fork-owned only if it lives under a new file
    name upstream won't use (`hevier-release.yml`).
12. ~~**Better import from Hevy (API and CSV): exercises map wrongly.**~~ Decided as D29 (2026-10-17), built: a fork fix table, one-limb titles as per-side sets, `(brand: X)` as D28 brands; the fixes written up for upstream in `hevier/upstream/hevy-map-fixes.md`. The review step built as D33 (2026-10-17). The original note: Upstream imports both:
    the API (`lib/import-hevy.js`, Hevy Pro key) and a detected Hevy CSV (`lib/import-csv.js`).
    Both resolve exercises only through the generated table `lib/hevy-id-map.js` (template id
    for the API, English title for the CSV, built by `scripts/build-hevy-id-map.mjs`); a
    template it doesn't know becomes a custom exercise, and non-English CSV titles fall back to
    name matching. In practice exercises land on the wrong openGym exercise. Steps:
    - **Collect the failures first:** import the user's own export and API account, and list
      every Hevy exercise → openGym exercise pair with how it was matched (table, name
      fallback, custom). Mark each wrong one; that list becomes the test fixture.
    - **Fix the cause** where it is: a wrong row in the generated table, a name fallback that
      grabs a near miss (e.g. "Bench Press (Dumbbell)" vs the barbell bench, "Lat Pulldown
      (Cable)" vs machine), equipment ignored when matching, or the CSV's title not matching
      the API's. Fixes to the table or the matcher are upstream logic: send them upstream
      (their tests cover the import) rather than patching the fork (rule 2).
    - **A review step before import** (fork UI if upstream doesn't want it): a list of the
      Hevy exercises with the openGym match each got, unmatched and low-confidence ones first,
      each changeable with the library picker or "keep as custom". The choices are remembered
      (in `S`, so a re-import maps the same way), and the import then runs with them.
    - Tests: a pure helper in `hevier/lib/` (or upstream's `lib/` if it goes upstream) with the
      collected pairs as fixtures, for both the API and the CSV paths.

### Third session (added 2026-10-17)

Picked by the user from the review of what was left and from PIPELINE.md's other forks. Same
rule: a decision in DECISIONS.md before each is built (take the next free number then: another
session is adding D numbers for the Hevy import).

13. ~~**Keep added exercises in the routine, without a prompt**~~ Built as D35 (2026-10-17), with
    every kind of change (added, removed, swapped, order, work sets, warm-ups/rest/note), one tap
    for all with Undo, and no Workout Detail entry. The original note: (user, 2026-10-17). Hevy asks
    "Update routine?" on Save; the user finds a prompt that comes up often annoying. Instead,
    after a routine workout that added exercises the routine doesn't have, a **small button in a
    corner** of the "Nice work!" page (`+ Add 2 to Leg Day`) that **fades after 5 seconds**.
    Ignoring it changes nothing; a tap adds them (with Undo) at the place they were done, in
    the routine's own prescription format. The same action sits in Workout Detail's ⋮, so a
    missed button isn't lost. Swapped exercises are not "added" (the swap already has its rule).
    A pure helper with tests in `hevier/lib/` (which entries are new, where they go); start from
    vinayakgupta62/openGym `9ce5015f8`, `2e4e56286`, `502d63818` (~150 lines, AGPL, credit).
14. ~~**Search exercises by machine name**~~ Built as D36 (2026-10-17). The original note: (user, 2026-10-17). The Add Exercise / swap picker
    finds an exercise by its D28 brand labels (`S.hvMachines`, and the `hvBrand` on logged
    entries): typing "Life Fitness" lists the exercises done on one. A fork addition to
    `hevier/lib/exercise-picker.js`'s search, with tests. Look at frdc/openGym `940e6f410`
    (search by machine names, +414 lines) for the idea; upstream's `searchExercises` unchanged.
15. ~~**Routine preview before starting**~~ Built as D37 (2026-10-17). The original note: (user, 2026-10-17). In Hevy a tap on a routine opens a
    preview (its exercises with sets × reps, the muscles, **Start Routine**, ⋮ → Edit); in the
    fork the name opens the editor. A fork view (`/plan/r/:id/preview` or a sheet) reading the
    routine as `RoutineEditHevy` does, nothing stored. Packebusch/openGym `49c494328` has the
    idea (637 lines across 29 files, partly a workout-screen restyle): take the idea only.
16. ~~**APK checks in the release gates**~~ Built as D38 (2026-10-17). The original note: (user, 2026-10-17; the part D26 left out). Added to
    `hevier/tools/release-check.sh` when it is given an APK: the merged manifest's permissions
    against an allow-list in `hevier/security/` (a new one fails), `debuggable` false, the APK
    signed with the fork's certificate (its SHA-256 pinned in `hevier/security/`). `aapt2` /
    `apksigner` from the SDK already installed for the emulator, no new tool. Note: upstream
    1.4.3 adds location permissions (gym reminder), so the allow-list changes at that merge.
17. **Gym tagging as Hevy does it, without membership cards** (user, 2026-10-17; replaces item
    4's "prompt at start"). Two parts:
    - ~~**Drop upstream's Gym check-in**~~ Done 2026-10-17 (D12 changed). (membership QR / barcode cards, "Import a photo of your
      membership card"): not offered in the fork. Off the Home widgets (D12, `home-layout.js`'s
      `checkin`) and off Look & Home's "On Home" row (D16's hidden rows). `S.checkIn` and
      `S.gymCards` stay untouched, so upstream's UI reads them as before. D12 changes first.
    - **A gym picker list**, like Hevy's gym tag (*open: waits for the v1.4.3 merge*): from the workout header (D28's gym chip) and
      Save Workout, a sheet listing **nearby gyms** first, then the user's own gyms (D28's
      equipment profiles), then **Custom gym…** (type a name). Picking a nearby gym that is
      not yet a profile creates one with that name (equipment copied from the active profile),
      so the rest of D28 (brands per gym, stats per gym) works unchanged. "Nearby" needs the
      phone's position and a list of places: upstream 1.4.3's gym reminder brings both halves
      (foreground location permission, `currentPosition`, and OpenStreetMap lookups only on an
      explicit tap), so build on it **at the 1.4.3 merge** rather than carrying a location
      plugin; the places would come from OpenStreetMap (gyms tagged `leisure=fitness_centre`
      around the position, asked only when the sheet opens, never in the background) — a new
      host for D26's allow-list, and the position leaves the phone, so the decision says so
      and the sheet works without it (own gyms + custom). A profile remembers where it was
      tagged, so the next time your own gym is suggested first when you are there.
18. ~~**A weight unit per exercise**~~ Built as D41 (2026-10-17), fork-only. The original note (user, 2026-10-17; *open: ask upstream / the author first*). Hevy lets one exercise be logged in lb
    while the rest are in kg (a machine with lb plates). ifrankerem/openGym `6c4635a9e` builds
    it (+500 lines across 30 files, `lib/exercise-unit.js`, synced, with tests), but it touches
    upstream's sync stamps (`api/sync-stamps.js`) and the logging path, which are upstream
    logic (rule 2). So first ask upstream / the author whether it is going upstream; if not, a
    fork-only display unit (`S.hvExUnit`, `{ [exId]: 'lb' }`): the row shows and takes lb and
    stores the profile unit, converted unrounded, so progression, sync and stats see one unit.
    Decide then how increments and plate rounding read on such an exercise.

19. ~~**Export to Hevy.**~~ Decided as D34 (2026-10-17), built (user, 2026-10-17: "if api key is
    provided, save it securely and use it for exports each time there's something new. There
    needs to be a toggle"). Settings → Data & backup → **Send to Hevy**, APK only: the key kept
    encrypted with an Android Keystore key (`HevierSecretPlugin.java`, seam S24); workouts saved
    and routines changed since the switch went on, edits updated, exercises Hevy lacks created
    as custom templates. Not done: deleting in Hevy (the API cannot), weigh-ins and measurements.

### Fourth session (added 2026-10-17)

The user's list, in their order. Same rule: a decision in DECISIONS.md before each is built,
PIPELINE.md checked first. Items 26 and 27 are bugs to look into first.

20. ~~**Themed Android icon**~~ Done 2026-10-17: the fork's `mipmap-anydpi-v26/ic_launcher(_round).xml` (in `src/hevier/res`, which overrides upstream's) add a `<monochrome>` layer, the dumbbell in white from the fork's foreground (`ic_launcher_monochrome.png` per density); checked in the built APK with aapt2. The original note (user, 2026-10-17): Android 13+'s themed (monochrome) launcher icon,
    so Go Hevier follows the wallpaper colours like other apps: a `<monochrome>` layer in the
    fork's adaptive icon (`frontend/android/app/src/hevier*` resources, D39's icon set).
21. **Home-screen widget: a compact month calendar** (user, 2026-10-17). An Android app widget
    with this month's calendar, trained days marked, and the month's **number of workouts** and
    **sets**. Native fork code (an `AppWidgetProvider` in the fork's Java source set), fed from
    the app when it saves (nothing read in the background). Check upstream / PIPELINE.md for
    widgets first.
    **The user's choices (2026-10-17):** 4×2 and resizable; the month grid with trained days
    filled in item 25's colours (cardio / strength / deload) and `N workouts · N sets` for the
    month; the sets are ticked work sets (D18's count, as the monthly report); a tap opens
    Profile → Calendar on this month.
22. ~~**Hevy import: more fix-table rows**~~ Checked 2026-10-17 against the user's export: no row needed. `Belt Squat (Machine)` lands on *lever belt squat* (2950) and `Deficit Bulgarian Split Squat (Smith Machine)` on *smith unilateral bulgarian split squat from deficit* (11568) by upstream's own match, now held by a test. The misses are the export's older titles with a bare brand bracket, `… (Smith Machine) (LifeFitness)`, which D29 never guesses at: renamed to `(brand: LifeFitness)` in Hevy, or picked in Check exercise matches (D33), they land right. The original note (user, 2026-10-17): The user has seen a *deficit Smith
    machine Bulgarian split squat* in openGym's library, and probably a *belt squat machine*:
    check what Hevy's titles for those land on now and add D29 fix rows (and the upstream
    write-up) where they miss.
23. **Cable setup on cable exercises** (user, 2026-10-17, with the user's choices). A cable
    exercise carries a **Cable setup** label, as D28 does a brand (a per exercise and gym
    default, changeable in the workout, stored on the logged entry, a stats filter, so a 2:1
    machine's numbers are never compared with a 1:1 machine's):
    - **Single pulley (1:1)** and **Double pulley (2:1)**: the weight logged is the stack's
      number, as Hevy logs it; the ratio is only the label. Optional later, display only: a
      grey "≈ 10 kg at the handle".
    - **Two stacks (×2)** (a crossover, both sides loaded): logged **per stack**, the way openGym
      logs a dumbbell per hand, shown "15 kg × 2", so volume and the PR rule read it as they read
      dumbbells. (Both handles on one stack is one stack: 1:1 or 2:1.)
    - **Hevy import** reads it from the title, the user's own convention like `(brand: X)`
      (D29 step 1): a bare bracket with exactly the ratio, `(1:1)`, `(2:1)` or `(x2)`, spaces and
      case ignored, before or after other brackets: `Lat pulldown (Cable)(x2)`. It is cut out of
      the title; any other bracket is left as it is. **A cable exercise with no ratio is taken as
      1:1, and the import asks to confirm or change it** before importing (a step beside D33's
      Check exercise matches, one row per cable exercise, remembered like `S.hvImportMap`).
24. ~~**Compare strength opens a section, not only the browser**~~ Done 2026-10-17 (D19 changed). The original note (user, 2026-10-17): D19's
    **Compare strength** expands a collapsed section in exercise details with the five level
    fields and the buttons to look the levels up (strengthlevel.com) and save them, in place of
    the separate sheet.
25. ~~**Calendar**~~ Done 2026-10-17 (`hevier/lib/calendar.js` `workoutKind` / `dayKind` / `dayTitle`): each trained day shows its first workout's title under the number, and is filled blue (strength), green (cardio) or orange (deload), with a legend; the year view and the monthly report's grid (D23, the same `Month`) take the colours too. A day with several workouts: deload over strength over cardio. The original note (user, 2026-10-17):
    - Each trained day labelled with **the day's first workout's title**, as newer Hevy
      versions do.
    - **Colours by workout type:** **cardio** when the day's workout has only cardio exercises,
      **strength** when it has any strength exercise, **deload** when "deload" is in the
      workout's title or notes (deload wins). A legend; the same colours in the monthly report's
      calendar (D23).
26. ~~**Bug: the workout header's timer button does nothing**~~ Fixed 2026-10-17 (D10): a countdown when no rest runs; a stopwatch not added. (user, 2026-10-17). The button
    beside **Finish** (D10's ⏱) should open Hevy's timer setup (rest timer / stopwatch).
27. ~~**Save Workout page**~~ Done 2026-10-17, on the "Nice work!" summary (the page with the two Done buttons): the header's Done hides while the bottom one shows; the closing could not be reproduced on the emulator (3 min idle, lock, background), so the page now keeps its workout once shown instead of going Home when the record changes under it (a sync, a Health Connect stamp). If it still closes, note what was on (signed in, Health Connect, Send to Hevy). The original note (user, 2026-10-17):
    - The header's **Save** / Done button hides once the same button at the bottom is scrolled
      into view.
    - **Bug:** the page seems to close by itself when left alone. Check whether D35's 5-second
      fade, an update check, or the session timer causes it.
28. ~~**Statistics: secondary muscles as fractional sets, as a setting**~~ Done 2026-10-17 (D42): Settings root → Preferences → **Muscle sets**. The original note (user, 2026-10-17).
    Fractional sets (openGym's count, a secondary muscle in part) show in Statistics now; a
    setting chooses **main muscle only** (D18's count) or **secondary muscles too, as
    fractions** (upstream's own fractions). **The user's choice (2026-10-17):** it steers every
    place sets per muscle show: Statistics, the live workout's and Save Workout's muscle line,
    Workout Detail's split, the weekly chart's tap and the monthly report; default main muscle
    only.
29. **Battery** (user, 2026-10-17; *after every other item*). Go over what keeps the phone awake
    or busy: timers and intervals left running, the Health Connect and Hevy export loops (D27,
    D34), wake lock, re-renders while a workout runs, media downloads.

Items 4–6 share one model (gyms, their equipment and labels), so design them together.
Items 1–2 share the Health Connect read plumbing.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Upstream restructures `Workout.jsx` around `blockProps` / layouts | `contract.test.js` fails loudly. The fix is in the fork's adapter, not in upstream code. |
| Upstream adds a feature to the workout screen that the Hevy layout doesn't render | Read each sync's CHANGELOG for workout-screen items; add to `HevyWorkout` (CONFLICTS.md, "silent drift"). |
| `S.workoutView = 'hevy'` reaches an upstream build (the shared server, a backup imported into official openGym) | Upstream reads unknown values as `cards` (LIST_VIEW.md), so it degrades safely. Keep that test. |
| Locale coverage for fork strings | English only at first. Add a fork overlay pack only if you need another language. |
