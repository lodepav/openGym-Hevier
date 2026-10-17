# Design decisions

Agreed with the user on 2026-10-16, before implementation. These override anything in
PLAN.md or reference/SCREENS.md that says otherwise. Change a decision here first, with the
date, before changing the code.

**Scope rule:** openGym's functionality, Hevy's UX and UI. New features wait until phases 1–2
work well (PLAN.md §5, backlog).

## Workout screen

| # | Decision |
|---|---|
| D1 | **One layout.** The Hevy list (`workoutView = 'hevy'`) is the only workout layout in the fork. Upstream's Cards / List / Compact / Focus stay in the code but are not offered in the UI. |
| D2 | **Prefilled values are grey until touched.** openGym pre-fills each set with its progression target. In the Hevy row, an untouched value of an unticked set renders grey (like Hevy's hint text) and turns bold once it is edited or the set is ticked. Ticking logs the values exactly as upstream does, so there is **no logic change**. "Touched" is view state derived from the set (done, or edited in this session), not a new persisted field. |
| D3 | **PREVIOUS column.** Last time's value for the same set number: same routine first, else any workout (`lastEntryFor(S, exId, rid)`). Tap copies it into the row. Replaces openGym's "Last time / Best set" recap line. |
| D4 | **No ± steppers** in the Hevy rows. Values are typed with the system numeric keypad. |
| D5 | **Set types.** Tap the set number to open the sheet: Warm-up · Normal · Failure · Drop · Remove (Hevy's), then openGym's extras (rest-pause, left/right sides, timed). Drops render as indented `D` rows under their parent set, matching openGym's nested `drops`. Labels: `W` yellow, number, `F` red, `D` blue. |
| D6 | **Effort column** only when Settings → effort is RIR or RPE, labelled accordingly, opening openGym's effort picker. |
| D7 | **Exercise block**: thumbnail · blue name (→ exercise details) · ⋮ · "Add notes here…" · "⏱ Rest Timer: 2min 0s" · set table · "+ Add Set". Muscle/equipment chips, "Plan: 4 × 8" and the large animation move to exercise details. |
| D8 | **Progression guidance lives behind ⋮** (⋮ → Progression shows the guidance line and its settings). Nothing about progression is on the card itself. |
| D9 | **Swipe left deletes a set** (with undo), as in Hevy. openGym's swipe-right-to-copy stays as an unadvertised extra. |
| D10 | **Header and finish flow.** ⌄ · duration · ⏱ · **Finish**, then a stats row (Duration · Volume · Sets). Finish → **Save Workout** page (title, when, duration, description = session note, Discard) → **"Nice work!"** summary from openGym's own PRs, 1RM records and finish comparison. Discard Workout also sits at the bottom of the workout. Upstream's `finishWorkout` / `doFinishWorkout` do the saving, unchanged. |

## Routine editor

Added 2026-10-16, at the start of M3.

| # | Decision |
|---|---|
| D15 | **Hevy's table over openGym's plan, not per-set plans.** An openGym routine exercise is one prescription (`sets × reps @ weight`, a warm-up count, back-off, an intensifier, "last set to failure"), and the progression engine moves it as one. Only a pyramid has per-set reps and weights. So the routine editor draws Hevy's SET · KG · REPS table *from* that prescription: a flat exercise's rows share one weight and one rep target (typing in any row changes them all), back-off rows show their derived weights read-only, a double/triple-progression exercise shows **REP RANGE** (`8–12`, tap to edit), and only a pyramid's rows are edited one by one. Set types map to what the plan can hold: **W** = the warm-up count (weights are worked out at session start), **F** = "last set to failure" (the last set only; a pyramid's is **Max**), drop sets / rest-pause / back-off / pyramid / per side / progression stay in upstream's exercise settings behind ⋮ → **Settings & progression** (D8). Edits save as they are made, as upstream's editor does: the header has **Done**, not Cancel / Save. Exercises are **dragged to reorder** by a handle; a superset moves as one (upstream's `reorderRoutineUnit`). Routine-wide Progression, Deload and the body map stay below the exercises. |

## Navigation

| # | Decision |
|---|---|
| D11 | **Three tabs: Home · Workout · Profile.** No Coach tab. **The AI coach is disabled by default** and appears nowhere in the fork's navigation; only upstream's own opt-in under Settings remains. |
| D12 | **Home is configurable.** Home is a list of widgets the user can **add, remove and rearrange** (an "Edit Home" mode with drag handles and switches). It always includes the **workout feed** (Hevy-style cards of finished workouts) as one widget. The widgets are existing openGym pieces: today's plan + week strip, workout feed, body weight, check-in, week streak, muscle recovery map, weekly chart. Show/hide reuses upstream's existing switches where they exist (`S.checkIn`, `S.showWeightCard`). The order and the other widgets' visibility are device-local (`localStorage`, key `hevier_home`), not added to `S`, so nothing changes in sync or exports. |
| D13 | **Workout tab**: Quick Start ("+ Start Empty Workout") · a **Today card** ("Today: Leg Day · Start", from openGym's schedule or rotation) · Routines header with **New Routine**, **Explore** (→ openGym's starter plans) and a **Schedule** button (→ openGym's weekly plan / rotation editor) · Hevy-style routine cards with **Start Routine**. **Routine folders** (changed 2026-10-16, at the user's request; was "backlog"): "My Routines" first, then the folders, each folding shut; a folder is the routine's own `folder` field, so it syncs and is backed up with the routine (upstream ignores the field; shared plan files leave it out). The folders' order is their first routine's place in `S.routines`, so moving a folder moves its routines as a block and nothing else is stored. An empty folder and which folders are folded are device-local (`hevier_folders`, `hevier_folders_closed`). Deleting a folder keeps its routines. **Drag to reorder** routines inside a folder and the folders themselves, by a handle; across folders with ⋯ → Move to folder. |
| D14 | **Profile**: header with the weekly chart (Duration / Volume / Reps) · a 2×2 dashboard: Statistics · Exercises · Measures · Calendar · then the workout list. openGym's muscle map, recovery, muscle balance and progress photos live under Statistics and Measures. ⚙ opens Settings. |

## Settings

Added 2026-10-16, at the start of M7 (was "still open"), at the user's choice.

| # | Decision |
|---|---|
| D16 | **Hevy's root, upstream's pages.** The Settings root is regrouped under titles: **Account** (the account card, Notifications), **Preferences** (Workout, Timer alerts, Plan & schedule, Units & language, Equipment, Look & Home), **More** (AI Coach where upstream shows it, Data & backup, About). Upstream's search and row previews stay. Each row opens upstream's own page unchanged, except that the rows which only steer upstream's workout layouts are left out: Layout, Collapse completed exercises, Shown under each exercise, Exercise animations (D1, D3, D7), and in Fine-tuning the steppers (D4), set shortcuts, exercise chips, superset and move/swap buttons. Their stored values are untouched, so upstream's UI reads them as before. No fork-built Workout Settings page: copying upstream's rows would drift on every merge. |

## Look

Added 2026-10-16, before phase 2, at the user's choice.

| # | Decision |
|---|---|
| D17 | **Hevy's dark theme with Hevy blue, only.** The fork has one look: Hevy's dark surfaces, grey secondary text, blue accent, green completed rows. No light theme and no accent choice are offered in the fork's UI; upstream's theme settings stay in the code and their stored values are untouched. |

## Volume

Added 2026-10-16, at the user's request (PLAN.md §5 item 8), with the user's choices.

| # | Decision |
|---|---|
| D18 | **Volume as tonnage or as sets per muscle group.** Settings root → Preferences gets one row, **Volume: Sets per muscle / Total weight**, stored in `S.hvVolume` (`'sets'` or `'weight'`; a fork-only field upstream ignores, so it syncs and is in backups), **default sets**. A muscle's sets count **each ticked work set once, for the exercise's main muscle** (Hevy's way; warm-ups left out, a per-side or drop set is one set), so the numbers are whole. In sets mode: the workout stats rows (the live workout, Save Workout, feed cards, Workout Detail) drop **Volume** and get a line under them, `Chest 8 · Triceps 5 · Shoulders 3`, biggest first; Workout Detail's Muscle Split counts the same way; Profile's weekly chart shows **Sets** per week instead of Volume, and a tap on a week lists its sets per muscle. Unchanged in both modes: Statistics' "Set count per muscle group" (openGym's count, a secondary muscle in part, labelled so), exercise details' Best Set Volume and Best Session Volume (one exercise's records), and the stored `w.vol`. Weight mode is today's look. |

## Strength level

Added 2026-10-17, at the user's request (PLAN.md §5 item 3), with the user's choices.

| # | Decision |
|---|---|
| D19 | **Strength level from thresholds the user types in.** The app bundles no standards and never fetches strengthlevel.com (its terms forbid automated access). Exercise details → Summary gets a **Strength level** section, for an exercise that has an estimated 1RM (weighted, not assisted). Empty, it offers **Compare strength** (opens strengthlevel.com in the browser: the exercise's standards page if a small slug table knows it, else the standards index) and **Enter levels**: a sheet with five fields, Beginner · Novice · Intermediate · Advanced · Elite, in the profile unit, rising. Filled, it shows a five-band bar with a marker at the user's **all-time best estimated 1RM**, the page's own Best 1RM record (upstream's read-back, unchanged), the level reached and how far it is to the next (`Intermediate · 7.5 kg to Advanced`; below the first, `Below Beginner`; past the last, `Elite`), and the date the levels were entered. **No re-enter prompt**: the date is shown, nothing else. Stored per exercise in `S.hvStrength` (`{ [exId]: { lv: [5 numbers], u: 'kg' \| 'lb', d: 'YYYY-MM-DD' } }`, a fork-only field upstream ignores, so it syncs and is in backups). Each entry keeps its own unit and is converted for display, since sync brings weights into one unit only for the fields it knows. Sync merges the field as a whole, like the fork's other settings (the newer copy's). Edit and Remove sit in the same sheet. |

## Backup to Google Drive

Added 2026-10-17, at the user's choice (PLAN.md §5 item 7).

| # | Decision |
|---|---|
| D20 | **Google Drive through a sync app, no fork code.** Upstream's auto-backup (Settings → Data & backup → **Auto-backup on changes**) already writes the whole of `S` after a workout or an edit, one dated file a day, the newest 14 kept, into `Documents/openGym/` or a folder picked with the system picker (#161). A sync app on the phone (Autosync for Google Drive, FolderSync, …) mirrors that folder to Drive. The fork builds no Drive client: a Google sign-in, an OAuth client and a Play Services dependency would go against upstream's "no third-party account" and dependency-light rules, and be native code to carry across merges. Restore is upstream's **Import backup** (a replace; signed in, it offers **Merge them in** when the server has workouts the backup lacks). Everything that must be in the backup therefore lives in `S` (PLAN.md §4), not in `localStorage`. |

## Previous values

Added 2026-10-17 (PLAN.md §5, Hevy's "Previous Workout Values").

| # | Decision |
|---|---|
| D21 | **Where the PREVIOUS column reads from is a setting.** Settings root → Preferences gets **Previous values: Same routine / Any workout**, stored in `S.hvPrevious` (`'routine'` or `'any'`, a fork-only field upstream ignores), **default Same routine**, which is D3's rule: the same routine's last session, else any workout's. **Any workout** reads the newest workout with the exercise, whatever routine it came from. Only the PREVIOUS column follows the setting: the session's prefilled targets and the progression keep reading upstream's `lastEntryFor`, unchanged. |

## Live personal record

Added 2026-10-17 (PLAN.md §5), at the user's choice: no sound.

| # | Decision |
|---|---|
| D22 | **A personal record shows on the set as it is ticked.** While logging, the ticked work set that beats the exercise's heaviest weight gets the **PR** trophy badge, by upstream's own finish rule (`doFinishWorkout`: the session's best ticked working weight beats `bestWeightFor`, read the way the session logs a dumbbell), so it is the same set Workout Detail marks afterwards (`prSetIndex`). The tick that makes a new record also shows a toast, `New PR · 100 kg`. **No sound and no extra vibration**: the tick's own beep and buzz stay upstream's. Weight records only (openGym's PR); a heavier estimated 1RM stays in the finish summary. A workout logged into the past shows none, as upstream's finish awards none live. Derived on screen from the session, nothing stored. |

## Monthly report

Added 2026-10-17, at the user's choice (PLAN.md §5). The muscle-distribution radar is dropped, at
the user's request.

| # | Decision |
|---|---|
| D23 | **A monthly report page, from the log alone.** Profile → Statistics gets a **Monthly report** row → `/report`, Hevy's "October Report": ‹ month › (back to the first logged month, forward to this one, which reads "so far"); it opens on last month when last month has workouts, else on this one. Top to bottom: **Workouts · Duration · Volume** (Sets in place of Volume in D18's sets mode), each with its change against the month before; **PRs** with their count (upstream's own translated word: a new plural key would need forms in every upstream locale pack), upstream's stored PRs of the month's workouts (`w.prs`), one row per exercise; the month's **calendar** (the Calendar page's grid, trained days filled) with "N of M weeks trained"; the **muscle split**, sets per main muscle as bars (D18's count); **top exercises**, the five with the most work sets, with their heaviest weight. A tap on a day opens it as on the Calendar page; a tap on an exercise opens its details. Nothing is stored and no notification is sent. |

## Android app

Added 2026-10-17, at the user's choice (PLAN.md §5 items 9 and 10).

| # | Decision |
|---|---|
| D24 | **Portrait only.** The APK no longer turns with the phone, as the PWA already doesn't (`"orientation": "portrait"`). A fork-owned `frontend/android/app/src/hevier/AndroidManifest.xml` sets `android:screenOrientation="portrait"` on `.MainActivity` and the manifest merger folds it into upstream's; `hevier.gradle` (seam S7) makes it the debug and release source sets' manifest. No upstream file changes. Offering it upstream is left to the user. |
| D25 | **Keep the screen on: upstream's switch, no fork code.** Upstream keeps the screen on while a workout runs (`S.keepAwake`, default on, `lib/wakelock.js` through the Screen Wake Lock API), switched in Settings → Workout → **Keep screen awake** and in the workout's own ⏱ settings sheet, both of which the fork shows. Checked on the emulator (Android 16, WebView 133) on 2026-10-17: the WebView has `navigator.wakeLock`, the app held a screen wake lock for a running workout past a 15 s screen timeout, and the screen slept once the workout was discarded. No native fallback is built; if a phone's WebView lacks the API, upstream hides the row, and a fallback (`FLAG_KEEP_SCREEN_ON`) would be offered upstream, as it helps its Android build too. |

## Security gates

Added 2026-10-17, at the user's choice (PLAN.md §5 item 11).

| # | Decision |
|---|---|
| D26 | **Release builds pass three local gates, and a failure blocks.** `hevier/tools/release-check.sh` (also the `release-check` skill, and `verify` before a release) builds the mobile bundle and runs: **secrets** (gitleaks over the whole git history, the built bundle, and an APK when given), **vulnerable dependencies** (Trivy over all four lockfiles, dev dependencies included, every severity) and **supply chain** (`hevier/tools/supply-chain.mjs`: every npm package pinned by a lockfile must be in a reviewed baseline, come from the npm registry and carry an integrity hash, so a new or bumped package or a new install script fails until it is read and accepted; and the built JS may name only allow-listed hosts and holds no `eval`, `new Function`, long base64 or escaped blobs, WebSocket, `sendBeacon` or `importScripts` unless listed). Any finding fails. An exception is an entry in a fork-owned allow-list under `hevier/security/` with its reason (Trivy's also scoped to the package version and expiring), so accepting one is a reviewed diff. Local only, no CI: the fork builds its APK on the developer's machine. The scanners are pinned binaries installed user-local with checksums (`hevier/tools/install-scanners.sh`), not npm dependencies and not Docker. APK checks (permissions, debuggable, signing certificate) are left out for now. Upstream files are not touched. |
