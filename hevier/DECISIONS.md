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
| D2 | **Prefilled values are grey until touched.** openGym pre-fills each set with its progression target. In the Hevy row, an untouched value of an unticked set renders grey (like Hevy's hint text) and turns bold once it is edited or the set is ticked. Ticking logs the values exactly as upstream does, so there is **no logic change**. "Touched" is view state derived from the set (done, or edited in this session), not a new persisted field. **The grey value is the field's placeholder** (changed 2026-10-17, at the user's request, as Hevy does): a tap neither selects it nor opens the copy/paste menu, typing replaces it, and a field left empty keeps it, with whatever the typing had copied down the sets put back (`hevier/components/HintNumberField.jsx`). A firm value behaves as upstream's field (focus selects it). |
| D3 | **PREVIOUS column.** Last time's value for the same set number: same routine first, else any workout (`lastEntryFor(S, exId, rid)`). Tap copies it into the row. Replaces openGym's "Last time / Best set" recap line. |
| D4 | **No ± steppers** in the Hevy rows. Values are typed with the system numeric keypad. |
| D5 | **Set types.** Tap the set number to open the sheet: Warm-up · Normal · Failure · Drop · Remove (Hevy's), then openGym's extras (rest-pause, left/right sides, timed). Drops render as indented `D` rows under their parent set, matching openGym's nested `drops`. Labels: `W` yellow, number, `F` red, `D` blue. |
| D6 | **Effort column** only when Settings → effort is RIR or RPE, labelled accordingly, opening openGym's effort picker. |
| D7 | **Exercise block**: thumbnail · blue name (→ exercise details) · ⋮ · "Add notes here…" · "⏱ Rest Timer: 2min 0s" · set table · "+ Add Set". Muscle/equipment chips, "Plan: 4 × 8" and the large animation move to exercise details. |
| D8 | **Progression guidance lives behind ⋮** (⋮ → Progression shows the guidance line and its settings). Nothing about progression is on the card itself. |
| D9 | **Swipe left deletes a set** (with undo), as in Hevy. openGym's swipe-right-to-copy stays as an unadvertised extra. |
| D10 | **Header and finish flow.** ⌄ · duration · ⏱ · **Finish** (⏱ adjusts the running rest, or with none starts a countdown at Settings' rest time, with the rest's alert; changed 2026-10-17, it was disabled without a rest), then a stats row (Duration · Volume · Sets). ⏱ opens **Timer · Stopwatch** (added 2026-10-17, at the user's choice): the Timer is the wheel above; the Stopwatch only counts, nothing is logged. It has Start / Stop / Resume and Reset, keeps counting in the background, and is kept on the device (`hevier_stopwatch`) for that workout only. While it has time, its time shows beside ⏱ and the sheet opens on it. Finish → **Save Workout** page (title, duration, description = session note, Discard; no date or start time, as Hevy's has none: removed 2026-10-17, review B4) → **"Nice work!"** summary from openGym's own PRs, 1RM records and finish comparison. Discard Workout also sits at the bottom of the workout. Upstream's `finishWorkout` / `doFinishWorkout` do the saving, unchanged. |

## Routine editor

Added 2026-10-16, at the start of M3.

| # | Decision |
|---|---|
| D15 | **Hevy's table over openGym's plan, not per-set plans.** An openGym routine exercise is one prescription (`sets × reps @ weight`, a warm-up count, back-off, an intensifier, "last set to failure"), and the progression engine moves it as one. Only a pyramid has per-set reps and weights. So the routine editor draws Hevy's SET · KG · REPS table *from* that prescription: a flat exercise's rows share one weight and one rep target (typing in any row changes them all), back-off rows show their derived weights read-only, a double/triple-progression exercise shows **REP RANGE** (`8–12`, tap to edit), and only a pyramid's rows are edited one by one. Set types map to what the plan can hold: **W** = the warm-up count (weights are worked out at session start), **F** = "last set to failure" (the last set only; a pyramid's is **Max**), drop sets / rest-pause / back-off / pyramid / per side / progression stay in upstream's exercise settings behind ⋮ → **Settings & progression** (D8). Edits save as they are made, as upstream's editor does: the header has **Done**, not Cancel / Save. Exercises are **dragged to reorder** by a handle; a superset moves as one (upstream's `reorderRoutineUnit`). Routine-wide Progression, Deload and the body map stay below the exercises. |

## Navigation

| # | Decision |
|---|---|
| D11 | **Three tabs: Home · Workout · Profile.** No Coach tab. **The AI coach is disabled by default** and appears nowhere in the fork's navigation; only upstream's own opt-in under Settings remains. |
| D12 | **Home is configurable.** Home is a list of widgets the user can **add, remove and rearrange** (an "Edit Home" mode with drag handles and switches). It always includes the **workout feed** (Hevy-style cards of finished workouts) as one widget. The widgets are existing openGym pieces: today's plan + week strip, workout feed, body weight, week streak, muscle recovery map, weekly chart. Show/hide reuses upstream's existing switch where it exists (`S.showWeightCard`). **No gym check-in** (changed 2026-10-17, at the user's request; was a widget): upstream's membership QR / barcode cards are not offered in the fork, neither as a Home widget nor as Look & Home's "Gym check-in" row (D16's hidden rows); `S.checkIn` and `S.gymCards` are left as they are, so upstream's UI reads them as before. Hevy-style gym tagging replaces it (PLAN.md §5 item 17). The order and the other widgets' visibility are device-local (`localStorage`, key `hevier_home`), not added to `S`, so nothing changes in sync or exports. |
| D13 | **Workout tab**: Quick Start ("+ Start Empty Workout") · a **Today card** ("Today: Leg Day · Start", from openGym's schedule or rotation) · Routines header with **New Routine**, **Explore** (→ openGym's starter plans) and a **Schedule** button (→ openGym's weekly plan / rotation editor) · Hevy-style routine cards with **Start Routine**. **Routine folders** (changed 2026-10-16, at the user's request; was "backlog"): "My Routines" first, then the folders, each folding shut; a folder is the routine's own `folder` field, so it syncs and is backed up with the routine (upstream ignores the field; shared plan files leave it out). The folders' order is their first routine's place in `S.routines`, so moving a folder moves its routines as a block and nothing else is stored. An empty folder and which folders are folded are device-local (`hevier_folders`, `hevier_folders_closed`). Deleting a folder keeps its routines. **Drag to reorder** routines inside a folder and the folders themselves, by a handle; across folders with ⋯ → Move to folder. |
| D14 | **Profile**: header with the weekly chart (Duration / Volume / Reps) · a 2×2 dashboard: Statistics · Exercises · Measures · Calendar · then the workout list. openGym's muscle map, recovery, muscle balance and progress photos live under Statistics and Measures. ⚙ opens Settings. |

## Settings

Added 2026-10-16, at the start of M7 (was "still open"), at the user's choice.

| # | Decision |
|---|---|
| D16 | **Hevy's root, upstream's pages.** The Settings root is regrouped under titles: **Account** (the account card, Notifications), **Preferences** (Workout, Timer alerts, Plan & schedule, Units & language, Equipment, Look & Home), **More** (AI Coach where upstream shows it, Data & backup, About). Upstream's search and row previews stay. Each row opens upstream's own page unchanged, except that the rows which only steer upstream's workout layouts are left out: Layout, Collapse completed exercises, Shown under each exercise, Exercise animations (D1, D3, D7), in Look & Home the Gym check-in (D12, 2026-10-17), and in Fine-tuning the steppers (D4), set shortcuts, exercise chips, superset and move/swap buttons. Their stored values are untouched, so upstream's UI reads them as before. No fork-built Workout Settings page: copying upstream's rows would drift on every merge. |

## Look

Added 2026-10-16, before phase 2, at the user's choice.

| # | Decision |
|---|---|
| D17 | **Hevy's dark theme with Hevy blue, only.** The fork has one look: Hevy's dark surfaces, grey secondary text, blue accent, green completed rows. No light theme and no accent choice are offered in the fork's UI; upstream's theme settings stay in the code and their stored values are untouched. |

## Volume

Added 2026-10-16, at the user's request (PLAN.md §5 item 8), with the user's choices.

| # | Decision |
|---|---|
| D18 | **Volume as tonnage or as sets per muscle group.** Settings root → Preferences gets one row, **Volume: Sets per muscle / Total weight**, stored in `S.hvVolume` (`'sets'` or `'weight'`; a fork-only field upstream ignores, so it syncs and is in backups), **default sets**. A muscle's sets count **each ticked work set once, for the exercise's main muscle** (Hevy's way; warm-ups left out, a per-side or drop set is one set), so the numbers are whole. In sets mode: the workout stats rows (the live workout, Save Workout, feed cards, Workout Detail) drop **Volume** and get a line under them, `Chest 8 · Triceps 5 · Shoulders 3`, biggest first; Workout Detail's Muscle Split counts the same way; Profile's weekly chart shows **Sets** per week instead of Volume, and a tap on a week lists its sets per muscle. Unchanged in both modes: exercise details' Best Set Volume and Best Session Volume (one exercise's records), and the stored `w.vol`. Weight mode is today's look. |

## Strength level

Added 2026-10-17, at the user's request (PLAN.md §5 item 3), with the user's choices.

| # | Decision |
|---|---|
| D19 | **Strength level from thresholds the user types in.** The app bundles no standards and never fetches strengthlevel.com (its terms forbid automated access). Exercise details → Summary gets a **Strength level** section, for an exercise that has an estimated 1RM (weighted, not assisted). Empty, it offers **Compare strength**, which folds open in the section itself (changed 2026-10-17, PLAN.md item 24; it was a browser button and an Enter levels sheet): **Look up on strengthlevel.com** (opens the exercise's standards page in the browser if a small slug table knows it, else the standards index), five fields, Beginner · Novice · Intermediate · Advanced · Elite, in the profile unit, rising, and Cancel / Save. Filled, it shows a five-band bar with a marker at the user's **all-time best estimated 1RM**, the page's own Best 1RM record (upstream's read-back, unchanged), the level reached and how far it is to the next (`Intermediate · 7.5 kg to Advanced`; below the first, `Below Beginner`; past the last, `Elite`), and the date the levels were entered. **No re-enter prompt**: the date is shown, nothing else. Stored per exercise in `S.hvStrength` (`{ [exId]: { lv: [5 numbers], u: 'kg' \| 'lb', d: 'YYYY-MM-DD' } }`, a fork-only field upstream ignores, so it syncs and is in backups). Each entry keeps its own unit and is converted for display, since sync brings weights into one unit only for the fields it knows. Sync merges the field as a whole, like the fork's other settings (the newer copy's). **Edit** folds the same fields open under the bar, with **Remove levels**. |

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
| D26 | **Release builds pass three local gates, and a failure blocks.** `hevier/tools/release-check.sh` (also the `release-check` skill, and `verify` before a release) builds the mobile bundle and runs: **secrets** (gitleaks over the whole git history, the built bundle, and an APK when given), **vulnerable dependencies** (Trivy over all four lockfiles, dev dependencies included, every severity) and **supply chain** (`hevier/tools/supply-chain.mjs`: every npm package pinned by a lockfile must be in a reviewed baseline, come from the npm registry and carry an integrity hash, so a new or bumped package or a new install script fails until it is read and accepted; and the built JS may name only allow-listed hosts and holds no `eval`, `new Function`, long base64 or escaped blobs, WebSocket, `sendBeacon` or `importScripts` unless listed). Any finding fails. An exception is an entry in a fork-owned allow-list under `hevier/security/` with its reason (Trivy's also scoped to the package version and expiring), so accepting one is a reviewed diff. Local only, no CI: the fork builds its APK on the developer's machine. The scanners are pinned binaries installed user-local with checksums (`hevier/tools/install-scanners.sh`), not npm dependencies and not Docker. APK checks (permissions, debuggable, signing certificate) were left out at first; D38 adds them. Upstream files are not touched. |

## Health Connect reads

Added 2026-10-17, at the user's request (PLAN.md §5 items 1 and 2): built now, replaced by upstream's
own when the fork merges v1.4.3.

| # | Decision |
|---|---|
| D27 | **Heart rate and weigh-ins read from Health Connect, as upstream's v1.4.3 will, until it does.** Upstream's unreleased `release-1.4.3` reads both (commit `f9c03474`, #544, #127); the fork carries the same behaviour now and drops its copy at that merge. **What is stored is v1.4.3's, field for field**, so upstream's code takes the data over unchanged: an imported weigh-in is a body-weight entry with `src: 'hc'`, a set gets `hr` / `restHr` `{ avg, max }`, a workout `hr { avg, max, src, n }` (stamped as an edit, so it syncs). **The rules are upstream's, ported word for word** (`hevier/lib/health-read.js`, `heart-rate.js` with upstream's tests): one weigh-in a day, the latest; a day with a weigh-in typed into openGym is never replaced and typing over an imported one makes it yours; openGym's own records are never read back (the fork's `…opengym.hevier` id included); a weigh-in deleted in openGym does not come back; a set's heart rate is worked out from its tick time and its reps, and only when the watch saved samples densely enough. **Reading** is upstream's loop (`hevier/lib/health-read-sync.js`): only while the app is open (at launch, on coming back, after a save), the heart rate of workouts finished in the last 24 hours, weigh-ins since the last read (30 days the first time); no background or history permission. **Switches:** **Heart rate from your watch** and **Weigh-ins from other apps** (upstream's words) on Settings → Data & backup, under upstream's Health Connect card, each asking for its one permission; off by default; kept on the phone in `hevier-health-read.json`, not in `S`. **Native:** a fork plugin, `HevierHealthReadPlugin.java`, with v1.4.3's `readWeights` / `readHeartRate` replies, in the fork's Java source set, registered by seam S17. **Three upstream rules are backported verbatim** (seam S18), so the v1.4.3 merge meets identical lines: an imported weigh-in is not written back to Health Connect, a typed weigh-in beats an imported one in a sync merge, and the weigh-in sheet clears `src`. **Shown** on the fork's Workout Detail: "♥ Heart rate 128 avg · 161 max" under the stats and ♥ bpm on each set that has one (fork UI, which stays after the merge). Not done here: PLAN item 1's "Health Connect as the only source" (the app's own weigh-in entry turned off), which waits for its own decision. **At the v1.4.3 merge:** delete the plugin, S17, the three hevier/lib files and the Data-page insert; keep S18's lines as upstream's; turn the two switches on again in upstream's rows. |

## Gyms and machine labels

Added 2026-10-17, at the user's choice (PLAN.md §5 items 4–5; item 6 waits for upstream 1.4.2).

| # | Decision |
|---|---|
| D28 | **A gym is one of upstream's equipment profiles, and a machine exercise carries a brand label per gym.** Settings → Equipment's profiles (`S.equipProfiles`, synced and backed up) are the gyms; upstream 1.4.3's gym-reminder locations stay apart (phone only, not in backups). **Gym:** a workout is tagged automatically with the active profile (`S.activeEquipId`) and the tag can be changed from the workout's header, live or when editing a past workout; a change in a live workout also makes that profile the active one. **No prompt at the start** (the user's choice, 2026-10-17): the gym line under the workout's stats row shows the active gym from the first second, and a tap changes it. **Brand:** a machine or cable exercise (catalogue equipment `cable`, `leverage machine`, `smith machine`, `sled machine`, `assisted`, and custom exercises with one of those) shows a label line under its name, filled automatically from the brand last used for that exercise at that gym (`S.hvMachines`: `{ [exId]: { [gymId or '']: 'Life Fitness' } }`, a fork-only field synced as a whole), changeable during the workout (which also changes that default) or when editing a past workout (only that workout). **Stored** on each logged exercise of the finished workout: `hvGym` (profile id) and `hvBrand` (text), fields upstream ignores and its workout editor carries through unchanged, so the gym lives on the entries rather than on the workout, and an edit that changes it is saved by upstream's own path. Upstream's finish drops unknown fields, so the Save Workout page writes them onto the saved record right after `doFinishWorkout`; a finish that bypasses the page saves no labels. **Stats:** exercise details gets a chooser of every gym · brand the exercise was done with, plus All; Summary (chart, records, set records) and History follow it. Unchanged: progression, upstream's stored PRs, the PREVIOUS column, the strength level (D19, all sets) and every other screen. Free weights get no brand line; every workout gets the gym. |

## Hevy import

Added 2026-10-17, at the user's choices (PLAN.md §5 item 12), after the user's own Hevy export was
run through upstream's matcher and every match was checked against its catalogue artwork.

| # | Decision |
|---|---|
| D29 | **A fork step after the Hevy importer's own reading: fixed matches, one-limb sets and brand labels.** Upstream's two Hevy importers (the CSV, `lib/import-csv.js`, and the API, `lib/import-hevy.js`) ask `hooks.importExercise(title, source)` first (seam S19) and pass their result through `hooks.importDone` before returning it; the fork fills both in only with the flag on, so upstream's tests still test upstream's import. In `hevier/lib/hevy-import.js`, for a Hevy title, in this order: **(1) `(brand: X)`** anywhere in a title, from any app, is cut out and X becomes the entry's D28 brand (`hvBrand`), whatever the equipment. This is **the user's own naming convention**, not Hevy's: the user renames such exercises in Hevy (`Leg Press (Machine) (brand: LifeFitness)`, `Calf Extension (Machine) (brand: Achilles Rehab)`) before exporting, so a bracket that merely looks like a brand is never guessed at. **(2) A fix table**, Hevy's English title → catalogue id, for the matches upstream gets wrong (`Seated Leg Curl (Machine)` → seated, not lying; `Air Bike` → the fan bike, not the crunch; dips and back extensions that are not machines; …) and for Hevy titles upstream leaves unmatched. Each row is also offered upstream as a fix to its title map, and is deleted here when upstream has it. **(3) One limb:** a title with *Single/One Arm/Leg* whose rest is a machine or cable exercise (D28's `MACHINE_EQ`) imports as that exercise with upstream's **per side** sets: each Hevy row, which holds the reps of one side, becomes an L/R set with that weight and those reps on both sides (upstream's `sides`, `r` the both-sides total). `Single Leg Extensions` is the leg extension, per side. Free weights keep upstream's match. **(4) Otherwise** upstream's match, unchanged. Hevy only for (2) and (3). No review step before the import for now. Not changed: progression, upstream's merge (a day already in the history is never replaced, so re-importing means deleting the earlier import's days first) and every screen. |

## Hevy routine folders

Added 2026-10-17, at the user's request, with the user's choice: a folder changed in openGym is kept.

| # | Decision |
|---|---|
| D30 | **The Hevy API import brings each routine's folder.** Hevy's API has `GET /v1/routine_folders` (`id`, `title`, `index`, the folders' order) and a `folder_id` on each routine; upstream reads neither. Seam S20: `parseHevyRoutines` keeps a routine's `folder_id` on the parsed routine, the Hevy import sheet fetches the folders with the same key right after upstream's fetch (a failure there imports the routines without folders rather than failing the import), and after `mergeHevyRoutines` the fork writes each routine's folder as D13's `folder` field (`hevier/lib/hevy-folders.js`), so it syncs and is backed up. **New routines** go into their Hevy folder, the new ones grouped in Hevy's folder order (no folder first). **A re-imported routine** (upstream finds it by its Hevy id and replaces it in place) takes Hevy's folder only while its folder is still the one the last import gave it: a folder changed in openGym, or a routine put back into My Routines, is kept. What the last import gave is kept on the routine as `hvHevyFolder` (`''` for none; a fork-only field upstream ignores). A routine imported before this, without that field, counts as given no folder: one in a folder keeps it, one without gets Hevy's. Hevy's empty folders are not brought over (an empty folder lives only on the device, D13). |

## More from the Hevy API

Added 2026-10-17, at the user's request: everything the Hevy API offers that upstream's import
leaves out, but the incremental sync (`/v1/workouts/events`), and each imported workout linked to
its routine, the ones imported earlier included.

| # | Decision |
|---|---|
| D31 | **The Hevy API import also brings measurements, a routine's rest and rep range, the notes, the routine link, custom exercises' muscles and equipment, and warns about units.** Seam S21, in upstream's parse and import sheet, filled by `hevier/lib/hevy-more.js` only with the flag on. **Body measurements:** `/v1/body_measurements` (which upstream already fetches for the weight alone) into openGym's measurements (`S.measurements`, cm): neck, shoulders, chest, abdomen, waist, hips, left/right bicep → upper arm, forearm, thigh, calf, and `fat_percent` → body fat. Hevy's unsuffixed fields (abdomen, waist, hips, thighs, calves) are taken as cm, like its `_cm` ones; lean mass has no openGym field and is left out. One entry a day; **a day that already has measurements is kept**, as upstream does with weigh-ins; a field that gets a value is switched on in the measurement list. Its own row and switch on the import sheet. **Routines:** a set's `rep_range` becomes the exercise's range under double progression (`repsMin`–`reps`, `prog: 'double'`; a range of one number is that rep count), and the exercise's `rest_seconds` its rest (`restSec`). Upstream already brings a routine exercise's notes. **Workouts:** the description becomes the workout's note and an exercise's notes its entry note (280 characters, as the CSV import does), and the Hevy routine's id is kept on the workout (`hvHevyRoutine`, a fork-only field). **Routine link:** after the merge, every workout with an `hvHevyRoutine` and no routine gets `routineId` = the openGym routine with that Hevy id, if there is one (upstream's import leaves `routineId` empty), so the PREVIOUS column's "same routine" (D21), rotation and history read it as a workout of that routine. **Earlier imports** (a CSV, or this import before D31): their days are never re-imported, so a workout already here on the day of a Hevy workout, starting within two minutes of it and without a routine, takes that Hevy workout's routine id the same way, stamped as an edit so it syncs. This runs on every API import, whatever is switched on, and a routine imported later links its workouts then. A routine link set in openGym is never changed. **Custom exercises:** a custom exercise an import made from a Hevy template and that still has no muscles gets the template's primary and secondary muscle groups (mapped onto openGym's muscle map: abdominals → abs, lats and upper back → upper back, glutes and abductors → glutes, …; cardio, neck, full body and other are left out) and its equipment (none → body weight, machine → leverage machine, cable or Smith machine when the title says so, plate → weight plate, …; other is left as it is). One edited in openGym is left alone. **Units:** `/v1/user/info`'s weight unit; when it differs from the profile's, the sheet says so (Hevy's API gives kg either way, so the import is right; the line only explains why the numbers look different from Hevy's screen). A failed read of either new endpoint imports without it. Not done, and dismissed by the user on 2026-10-17: the workout events (an incremental sync; workouts now go *to* Hevy, D34), lean mass (openGym has no field for it) and Hevy's distance unit (its API gives metres either way). |

## Weigh-ins from Health Connect only

Added 2026-10-17, at the user's choice (PLAN.md §5 item 1, the part D27 left out).

| # | Decision |
|---|---|
| D32 | **While "Weigh-ins from other apps" is on, Health Connect is the only source of weigh-ins.** No new switch: D27's read switch (device-local, `hevier-health-read.json`) decides it. While it is on, the fork's **Log** buttons (Home's body-weight widget, Profile → Measures) are hidden, and upstream's weigh-in sheet does not open (seam S22 in `bwSheet`, `hevier/lib/weigh-in-source.js`): a plain **Log** elsewhere shows "Weigh-ins come from Health Connect", and the check-in before a workout starts it straight away, as **Start without weighing in** does. The weigh-ins already logged stay, can be seen and deleted. Upstream's write of weigh-ins *to* Health Connect has nothing to write any more (an imported one is never written back, S18), so nothing echoes. The read weigh-ins are still openGym's body-weight log, as everything else reads them there. The switch's subtitle says so while it is on. Off, everything is as before. |

## Hevy import review

Added 2026-10-17, at the user's choice (PLAN.md §5 item 12's review step).

| # | Decision |
|---|---|
| D33 | **A review of the exercise matches before an import, remembered for the next one.** Both import summaries (a CSV file from any app, and the Hevy API sheet) get a **Check exercise matches** row (seam S23), above upstream's "Not in the library" chips. It opens a list of every exercise title in the file, the user's own exercises first ("Your own exercise"), then the rest by title, each with the exercise it becomes. A tap offers **Pick from the library** (the fork's exercise picker; the user's own exercises included), **Keep as your own exercise** and, for one already chosen, **Use the automatic match**. A choice is stored in `S.hvImportMap` (`{ 'Hevy\|seated leg curl (machine)': exId \| 'custom' }`, keyed by the app and the title without its D29 brand; a fork-only field upstream ignores, so it syncs and is in backups) and the file is read again at once, so the summary's numbers, the chips and what the import writes follow it. **The choice comes first** in D29's order, before the fix table; a brand still applies, and a one-limb title chosen as a machine or cable exercise is still per side. A chosen exercise that no longer exists counts as no choice. What the list shows for a title the fork leaves to upstream is upstream's title or name match, worked out again for the list (the API's own template map gives the same answer for Hevy's English titles). Changing what an earlier import already wrote is not part of this: its days are never re-imported (D29). |

## Export to Hevy

Added 2026-10-17, at the user's request, with the user's choices: workouts and routines, from the
switch on, edits updated, exercises Hevy lacks created there.

| # | Decision |
|---|---|
| D34 | **With a Hevy API key saved, new workouts and changed routines go to Hevy by themselves.** Settings → Data & backup gets **Send to Hevy** (a switch, off by default), in the APK only: turning it on asks for the Hevy Pro API key, checks it (`/v1/user/info`) and keeps it **on the phone, encrypted** with a key from the Android Keystore (a fork plugin, `HevierSecretPlugin.java`, no new dependency, registered by seam S24); never in `S`, a backup or a sync. Turning it off forgets the key. A PWA has no safe place for it, so the row is not offered there. **What is sent:** every workout saved after the switch went on (the workouts already in the log then, and every imported one, never), and every routine created or changed after it; the check runs at launch, on coming back to the app and a little after each change, only while the app is open, and the row shows when it last sent and any error, with **Send now**. **A workout edited after it was sent is updated in Hevy** (PUT); one deleted in openGym stays in Hevy, as Hevy's API cannot delete. **A routine** imported from Hevy (`hevyId`) updates that Hevy routine; a new one is created and keeps its Hevy id as `hevyId`, so a later import replaces it in place; its folder becomes the Hevy folder of that name (made when missing), and D30's `hvHevyFolder` is set to it, so a later import does not take it for a folder changed in openGym. **Exercises:** each openGym exercise is sent as the Hevy template it came from: D29's fix table and upstream's template map read backwards, an imported custom exercise's own template, or a template of the same title; one Hevy lacks is **created there as a custom exercise** (name, equipment, main and other muscles, type), once, and reused. **Sets:** warm-up, failure and normal as Hevy's types; a drop set's drops and a rest-pause set's bursts as Hevy drop-set rows after it; a per-side set as one row with the heavier side's weight and reps (Hevy logs one side, D29); timed and cardio sets as duration and distance; RPE (or 10 − RIR) rounded to Hevy's steps from 6 to 10; supersets and notes kept; weights in kg. A routine is sent as D15's table: warm-ups, work sets, a rep range, rest, "last set to failure". The workouts go as Hevy's default makes them (not private). What was sent, as what, and the templates and folders made are kept on the phone (`hevier-hevy-export.json`), with a fingerprint of each sent item to see a change; a workout or routine Hevy refused is tried again only once it changes. |

## Update routine after a workout

Added 2026-10-17, at the user's choices (PLAN.md §5 item 13): no prompt, a button that goes by
itself; every kind of change; one tap keeps them all.

| # | Decision |
|---|---|
| D35 | **Hevy's "Update routine?" as a small button that goes by itself.** After a routine workout that changed the routine, the "Nice work!" page shows a small **Update Leg Day** button in its top-left corner, with what it would change under it (`+1 · −1 · 1 swapped · 2 changed · new order`); after **10 seconds** it fades away (5 until 2026-10-17, review U1). Ignored, nothing changes; a tap writes **all** the changes into the routine and shows a toast with **Undo** (the routine's exercise list as it was). A combined workout updates each of its routines (`Update 2 routines`). **What counts** (`hevier/lib/routine-update.js`), read from the session as it stood at Save (the saved record drops an exercise with no ticked set, so it cannot tell one taken out from one left undone): an exercise **added** mid-workout joins the routine where it was done, copied as upstream's Save as routine copies it; one **removed** from the workout leaves the routine, one left undone stays; a **swap** (a removed slot with the new exercise in its place) keeps the slot's prescription through upstream's own `replaceSlotExercise`, as the routine editor's Replace does; the **order**; the number of **work sets**, counted against what the session opened with, so a set the progression added is not one you added (pyramids, rest-pause and cardio left out); and what upstream's per-exercise ⋮ → Update routine copies (**warm-up sets, rest, note**). **Never** weights or reps: the progression moves those from what was logged. A routine whose every exercise was taken out is left alone, never emptied; superset partners follow upstream's `cleanupSg`. Not offered for an edited past workout, nor later from Workout Detail (the saved record lacks what was removed). An exercise added to the routine itself *during* the workout reads as one the workout removed: the button's summary shows it and Undo puts it back. Nothing new is stored. |

## Search by machine brand

Added 2026-10-17, at the user's choice (PLAN.md §5 item 14).

| # | Decision |
|---|---|
| D36 | **The exercise picker finds an exercise by its machine brand.** A brand label (D28: the defaults in `S.hvMachines` and the `hvBrand` of logged entries) is searchable in the fork's picker (Add Exercise, swap, Replace, Profile → Exercises): the typed text is compared with spaces, punctuation and case left out, so "Life Fitness", "lifefitness" and "life fit" all find an exercise labelled Life Fitness at any gym; words that are part of no brand narrow by the exercise's name with upstream's search ("life fitness press" keeps the presses). A brand word needs two letters. The exercises a brand reaches come first, inside the filters already set, with the brand after the muscle under the name (`Glutes · Life Fitness`); upstream's results follow, unchanged. Upstream's `searchExercises` and its ranking are not touched; nothing is stored. |

## Routine page

Added 2026-10-17, at the user's choice (PLAN.md §5 item 15).

| # | Decision |
|---|---|
| D37 | **A tap on a routine's name opens its page, not the editor.** On the Workout tab the routine card's name opens `/plan/r/:id/view` (a fork route), Hevy's routine page: ‹ · Routine · ✎ (→ the editor, D15), the name, its folder (D13) · N exercises · N work sets, a full-width **Start Routine** (upstream's `startFlow`; **Resume** while a session is open, which goes back to it rather than starting another), then each exercise as the editor draws it, read-only: thumbnail and name (→ exercise details), its note, its rest, and the D15 table from the same helper (`hevier/lib/routine-table.js`): W rows with Auto weights, F for "last set to failure", REP RANGE, Max, back-off weights in grey, cardio's MIN and speed. Supersets are grouped as in the editor. Below them, the routine's body map ("What this session hits"), as in the editor. The card's ⋯ → Edit routine still opens the editor, and a new routine still opens straight in it. Nothing is stored. |

## APK checks

Added 2026-10-17, at the user's choice (PLAN.md §5 item 16, the part D26 left out).

| # | Decision |
|---|---|
| D38 | **Given an APK, the release check also checks the APK itself, and a failure blocks.** `release-check.sh --apk <file>` adds three gates to D26's, with `aapt2` and `apksigner` from the Android SDK already installed for the emulator (newest build-tools, apksigner on the same JDK 21), no new tool. **Signing certificate:** the signature verifies, there is one signer, it is not the Android debug key, and its SHA-256 digest is pinned in `hevier/security/apk-cert.txt`. The list starts empty, so the gate fails until the user pins the fork's release key (the keystore stays outside the repo; updates only install over an app signed with the same key); the failure prints the digest. **Release build:** the app id is `ch.duartesantos.opengym.hevier` (not the debug build's `.test`) and `android:debuggable` is not set. **Permissions:** every `uses-permission` of the merged manifest is in `hevier/security/apk-permissions.txt`, each with what uses it (the app's own id written `$PKG`), so a permission a plugin or an upstream merge adds fails until it is read and listed; one listed but no longer asked for is reported, not failed. Upstream's 1.4.3 location permissions (its gym reminder) are reviewed at that merge. **Added 2026-10-17** (the part first left out): **signature scheme**, v2 or later must verify (not only the v1 JAR signature); **native libraries**, every `.so` the APK ships, by name, in `hevier/security/apk-native-libs.txt`; **exported components**, every activity, alias, service, receiver and provider other apps can reach (`android:exported="true"`), with the permission that guards it, in `hevier/security/apk-exported.txt`. Each list is read as the permissions' is: a new entry fails until it is read and listed with its reason, one listed but gone is reported. Upstream files are not touched. |

## App name

Added 2026-10-17, at the user's request.

| # | Decision |
|---|---|
| D39 | **The app is called "Go Hevier".** It is the name under the launcher icon and in the recent-apps list (the fork's `hevier-release` strings; the debug build is "Go Hevier Test"), the installed PWA's name (`public/hevier/manifest.json`), and the browser tab's and iOS home-screen title, which the fork sets at boot because `index.html` is upstream's (`hevier/lib/pwa-icons.js`, beside the icon swap). Health Connect and Android's settings show the launcher name. **Unchanged:** the app id `ch.duartesantos.opengym.hevier` (a new id would install as a second app and could not update the first), the repository and its `hevier/` names, the native plugin names, and upstream's own screens that name openGym (About, the login, the licence), which credit the project the fork is built on. |

## Weights to the hundredth

Added 2026-10-17, at the user's request: a Hevy import rounded 20.41 kg to 20.4.

| # | Decision |
|---|---|
| D40 | **An imported weight keeps its hundredths, and a typed one already does.** Upstream's importers round every weight to a tenth in the profile's unit: the Hevy API's `weight_kg` and body weights (`lib/import-hevy.js`), and a CSV row converted between kg and lb, or an Apple Health weigh-in converted (`lib/import-csv.js`). With the flag on, seam S25 hands the weight to `hooks.importWeight` instead, which rounds to 0.01 (`hevier/lib/hevy-import.js`), so Hevy's 20.41 kg stays 20.41 and 45 lb read into a kg profile is 20.41 kg. A CSV weight in the profile's own unit was never rounded. **Logging** needs no change: the set fields store what is typed (upstream's `NumberField`, no rounding), and upstream's Settings → Units & language → **Weight decimals** shows weights to two decimals everywhere (`fmtNum`) on its second choice and to one on its default, while the value stays exact. The fork names the two choices for what they show, **0.1** and **0.01** (upstream's `0.5` and `0.25`), in the page's tree (seam S12, `relabelPage` in `hevier/lib/settings.js`); the stored `S.wdec` is upstream's. Unchanged: the progression's targets, which upstream rounds to its increment and to a tenth (`snapWeight`), and Health Connect weigh-ins, read to a tenth by upstream's v1.4.3 rule ported word for word (D27). Re-importing does not fix weights an earlier import already rounded: its days are never re-imported (D29). |

## Weight unit per exercise

Added 2026-10-17, at the user's choices (PLAN.md §5 item 18): fork-only, not asked upstream first.

| # | Decision |
|---|---|
| D41 | **One exercise can be shown and typed in the other unit, stored in the profile's.** The workout's ⋮ on a weighted reps exercise gets **Weight unit**: the profile's unit, or the other one with a step (lb: 2.5 · 5 · 10, 5 offered for a big lift and 2.5 for a small one; kg: 1.25 · 2.5 · 5). Stored in `S.hvExUnit` (`{ [exId]: { u, step, inc } }`, a fork-only field upstream ignores, so it syncs and is in backups); back to the profile's unit removes the entry. **Only the workout's rows and PREVIOUS follow it** (the user's choice): the weight column's header (`LB`), its fields and drop rows, PREVIOUS and the live PR toast; Save Workout, Workout Detail, the routine editor, stats and every other screen stay in the profile's unit. **Nothing stored changes:** a typed weight is converted unrounded into the profile's unit (45 lb is 20.41165665 kg), and a stored one is shown to the hundredth, snapped onto the unit's plate grid (2.5 lb, 1.25 kg) when it is within a progression's rounding of it (45 lb stored as 20.4 kg reads 45). **The step:** written, converted, into upstream's per-exercise `inc` on the open session's targets and the routines' exercises, only where `inc` is unset or was set by this (a step chosen in upstream's exercise settings is kept), and removed again when the exercise goes back; an entry added later takes it when the workout shows it. So upstream's progression and `snapWeight` step it 45 → 50 → 55 lb. Plate loading keeps the profile's unit. Upstream's sync stamps and logging path are not touched (ifrankerem/openGym's per-exercise unit changes them, so it is not taken). |

## Muscle sets

Added 2026-10-17, at the user's choices (PLAN.md §5 item 28).

| # | Decision |
|---|---|
| D42 | **Sets per muscle count the main muscle only, or a secondary muscle in part too, as a setting.** Settings root → Preferences gets **Muscle sets: Main muscle only / Secondary muscles too**, stored in `S.hvMuscleSets` (`'main'` or `'share'`, a fork-only field upstream ignores, so it syncs and is in backups), **default main muscle only**, D18's count: each ticked work set once, for its exercise's main muscle, whole numbers. **Secondary muscles too** is upstream's own load (`loadOf`, as its Muscle balance counts: a primary muscle 1, a secondary one its part), to one decimal, under upstream's muscle names. It steers every place sets per muscle show: Statistics' "Set count per muscle group" (its caption says which count), the muscle line of the live workout, Save Workout, feed cards and Workout Detail (D18's sets mode), Workout Detail's Muscle Split (in both volume modes), the weekly chart's week sheet and the monthly report's muscle split (D23). Unchanged: the body maps (upstream's load, shading, not a count), the workout's total Sets, upstream's own screens, and what is stored per workout. |

## Cable setup

Added 2026-10-17, at the user's choices (PLAN.md §5 item 23).

| # | Decision |
|---|---|
| D43 | **A cable exercise carries its setup, as D28 a brand: 1:1, 2:1 or ×2.** **Single pulley (1:1)** and **Double pulley (2:1)** log the stack's number, as Hevy does; the ratio is only the label. **Two stacks (×2)** (a crossover, both sides loaded) is logged **per stack**: the entry's target is stamped `dbLoad: 'each'`, upstream's own mark for a dumbbell logged per bell (`lib/dumbbells.js`, not tied to the equipment), so upstream's volume counts both stacks, its history reads "15 each × 8" and records compare like with like; switching back removes the stamp. **Where:** catalogue exercises with equipment `cable` (and custom ones), a **Cable 1:1** chip at the end of D28's brand line, opening a sheet of the three. The default is remembered per exercise and gym in `S.hvCables` (`{ [exId]: { [gymId or '']: '1:1' \| '2:1' \| 'x2' } }`, a fork-only field synced as a whole), changeable in the workout (which changes that default) or when editing a past workout (only that workout); with none, 1:1. **Stored** on each logged cable exercise as `hvCable`, written at Save with D28's labels; a cable logged before this or imported without a tag counts as 1:1. **Stats:** exercise details' label chooser tells the setups apart (`City Gym · 2:1`; 1:1 is not written out), so a 2:1 machine's numbers are never compared with a 1:1's; Workout Detail shows a setup other than 1:1 on the brand line. **Import** (D29 step 1, any app): a bare bracket with exactly the ratio, `(1:1)`, `(2:1)` or `(x2)` (spaces and case ignored, `×` too), before or after other brackets, is cut from the title and becomes the entry's setup (`Lat pulldown (Cable)(x2)`); ×2 is stamped per stack and the workout's volume counts both. A cable exercise with no tag is taken as 1:1, and both import summaries get **Check cable setups** beside D33's row (seam S23, no new seam): every cable exercise of the file, its setup and where it comes from (the title, your choice, or assumed); an untagged one can be confirmed or changed, the choice kept in `S.hvImportCable` (keyed as `S.hvImportMap`, synced and backed up) and the file read again at once. A routine has no setup. Not done: the grey weight at the handle (dismissed by the user, 2026-10-17), the progression (it moves the logged number, whatever the setup). |

## Month widget

Added 2026-10-17, at the user's choices (PLAN.md §5 item 21).

| # | Decision |
|---|---|
| D44 | **An Android home-screen widget with this month's calendar and its workouts and sets.** **Go Hevier month**, 4×2 and resizable, in the APK only (upstream 1.4.3's widgets are iOS-only, and an Android one is on its roadmap, #125): the month's name and `N workouts · N sets` (ticked work sets, D18's count, as the monthly report counts them; "No workouts this month"), the weekday letters from the week's first day, and the days, a trained day filled in the Calendar page's colours (strength blue, cardio green, deload orange, item 25), today ringed. **A tap opens Profile → Calendar** (`/calendar`), also from a cold start. **Fed by the app:** the page builds a small snapshot (`hevier/lib/month-widget.js`: this month and the last, each day's kind, each month's line in the app's language) and hands it over at launch, on coming back to the app and two seconds after a change of the log, only when it differs; the native side (`HevierWidgetPlugin.java`, registered by seam S26, and `HevierMonthWidget.java` with its receiver in the fork's manifest overlay) keeps it in the app's private preferences and draws the grid as a bitmap the widget's size. The widget never reads the log and runs no code in the background: it redraws when the app sends a snapshot, when it is resized, and once after midnight through an inexact alarm that does not wake the phone (no exact-alarm permission, no new permission at all), so the month turns over on its own; a month the snapshot lacks shows as empty until the app is next opened. Nothing is stored in `S`. The widget picker shows a picture of it. |

## Routine backups

Added 2026-10-17, at the user's request: build upstream's coming features now and let its release
replace them.

| # | Decision |
|---|---|
| D45 | **A routine exercise's planned backups, as upstream 1.4.2 has them, until the fork merges it.** Upstream's `a2345695` ("Routines: planned backups for an exercise, offered first in a swap"): an optional `subs` list of up to five exercise ids on the routine's entry, never the exercise itself, the field left out when empty. **Stored as upstream's, field for field**, so 1.4.2's code reads the fork's lists unchanged. **Routine editor:** ⋮ → **Backups** (its row lists them, or None) opens a sheet with the list, each removable, and **Add a backup** (the fork's picker, on the same muscle); edits save at once (D15). **Swap:** the workout's Replace exercise, and the routine editor's Replace, list the slot's backups first under **Your backups** while nothing is typed (the swap reads them from the entry's `target`, a copy of the slot). **Kept** wherever the fork rebuilds a slot: a save of upstream's exercise settings, a Replace (less the exercise now in the slot, upstream's rule) and D35's routine update. Not done here (upstream's code, coming with 1.4.2): its own editor and sheets, plan files carrying the catalogue's backups. **At the 1.4.2 merge:** `hevier/lib/routine-backups.js` keeps only `keepBackups` and `swapBackups` if still needed (drop the ported half, import upstream's), seam S13 passes upstream's new `backups` option through to the fork's picker, and the keep-alive calls that upstream's own code now covers go. |

## A gym's backups

Added 2026-10-17, at the user's choice (PLAN.md §5 item 6): learned from swaps.

| # | Decision |
|---|---|
| D46 | **A routine started at a gym swaps in the backups that gym took last time.** No setup: a swap in the live workout (the exercise's ⋮ → Replace exercise, upstream's swap) from a routine's exercise to one of its D45 backups, at a gym (D28's gym of the session), is remembered for that exercise and gym in `S.hvGymSwaps` (`{ [exId]: { [gymId]: backupExId } }`, a fork-only field upstream's sync stamps and merges as a whole, so it syncs and is in backups). **The last choice wins:** a swap to another of its backups replaces it; a swap back to the routine's own exercise forgets it. **Swapped:** when a routine session starts, and when the session's gym changes (D28's gym line), every routine exercise with nothing ticked whose gym has a remembered backup the slot still lists is swapped for it, built as upstream's swap builds a quick pick (the backup's default settings under the routine's prescription, `buildPlannedEntry`, in place through `swapActiveExercise`), and a toast says so, `Swapped for City Gym: Leg Press → Hack Squat`, with **Undo**, which swaps them back and forgets them (it is a swap back). Not in a workout logged into the past or an edited one, not without a gym, not for an exercise added mid-workout (only the swap's own picker teaches it; an added exercise also carries its routine's id). The routine itself never changes: the swap is the session's, as upstream's is. |

## Gym picker

Added 2026-10-17, at the user's choice (PLAN.md §5 item 17): nearby gyms only on a tap. Built now,
ahead of upstream 1.4.3's location code, which it ports.

| # | Decision |
|---|---|
| D47 | **The gym sheet lists your gyms, finds gyms nearby on a tap, and takes a custom gym.** D28's gym line (the workout, now shown with no gym yet as **No gym**) and a new **Gym** row on Save Workout open one sheet: your gyms (D28's equipment profiles) and No gym; **Find gyms nearby**; **Custom gym…**; Manage gyms. Nothing about location happens until **Find gyms nearby** is tapped. Then the phone's position is read once, asking for location the first time (while in use only, never in the background; an approximate grant is enough). The APK uses a fork plugin, `HevierLocationPlugin.java` (seam S27), which ports upstream v1.4.3's `currentPosition`: the same providers, the 25 s wait and the recent last-known fallback. The PWA uses the browser's geolocation. The position is sent in that one request to OpenStreetMap's Overpass API (`overpass-api.de`, allow-listed). The request asks for the named gyms (`leisure=fitness_centre`, `amenity=gym`, a sports centre tagged for fitness) within 2 km, and the position is kept nowhere. A second search within 10 minutes and 200 m is answered from the first, in memory only (added 2026-10-17: Overpass refuses a quick repeat). The sheet says so, and credits OpenStreetMap. **Your gyms here** come first: an own gym whose remembered place is within 250 m (or the fix's accuracy, up to 1 km). Then **Nearby**, nearest first, with the street and the distance; a place already picked as one of your gyms shows it. **A picked place** becomes a new equipment profile with its name, its equipment copied from the active gym (everything, with none), and is made the session's gym. **Custom gym…** adds a profile by name, with no place. The phone's own position is never kept as a gym's place (changed 2026-10-17, review U4: picked at home, it would sync home's coordinates); only a place picked from OpenStreetMap carries coordinates. A place is kept in `S.hvGymPlaces` (`{ [gymId]: { lat, lng, osm, name } }`, a fork-only field synced as a whole). Only the gym's coordinates are kept, never a trail of where you were. A failure says why (not allowed, location off, no fix, OpenStreetMap not answering) and offers Custom gym. The phone asks for `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION` (the fork's manifest overlay and the D38 list). **At the v1.4.3 merge:** upstream declares the same two permissions (the merger keeps one of each) plus its background one, reviewed then. The fork may call upstream's `currentPosition` instead of its plugin once upstream accepts an approximate grant; until then S27 stays. |
