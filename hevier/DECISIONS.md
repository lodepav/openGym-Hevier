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
| D31 | **The Hevy API import also brings measurements, a routine's rest and rep range, the notes, the routine link, custom exercises' muscles and equipment, and warns about units.** Seam S21, in upstream's parse and import sheet, filled by `hevier/lib/hevy-more.js` only with the flag on. **Body measurements:** `/v1/body_measurements` (which upstream already fetches for the weight alone) into openGym's measurements (`S.measurements`, cm): neck, shoulders, chest, abdomen, waist, hips, left/right bicep → upper arm, forearm, thigh, calf, and `fat_percent` → body fat. Hevy's unsuffixed fields (abdomen, waist, hips, thighs, calves) are taken as cm, like its `_cm` ones; lean mass has no openGym field and is left out. One entry a day; **a day that already has measurements is kept**, as upstream does with weigh-ins; a field that gets a value is switched on in the measurement list. Its own row and switch on the import sheet. **Routines:** a set's `rep_range` becomes the exercise's range under double progression (`repsMin`–`reps`, `prog: 'double'`; a range of one number is that rep count), and the exercise's `rest_seconds` its rest (`restSec`). Upstream already brings a routine exercise's notes. **Workouts:** the description becomes the workout's note and an exercise's notes its entry note (280 characters, as the CSV import does), and the Hevy routine's id is kept on the workout (`hvHevyRoutine`, a fork-only field). **Routine link:** after the merge, every workout with an `hvHevyRoutine` and no routine gets `routineId` = the openGym routine with that Hevy id, if there is one (upstream's import leaves `routineId` empty), so the PREVIOUS column's "same routine" (D21), rotation and history read it as a workout of that routine. **Earlier imports** (a CSV, or this import before D31): their days are never re-imported, so a workout already here on the day of a Hevy workout, starting within two minutes of it and without a routine, takes that Hevy workout's routine id the same way, stamped as an edit so it syncs. This runs on every API import, whatever is switched on, and a routine imported later links its workouts then. A routine link set in openGym is never changed. **Custom exercises:** a custom exercise an import made from a Hevy template and that still has no muscles gets the template's primary and secondary muscle groups (mapped onto openGym's muscle map: abdominals → abs, lats and upper back → upper back, glutes and abductors → glutes, …; cardio, neck, full body and other are left out) and its equipment (none → body weight, machine → leverage machine, cable or Smith machine when the title says so, plate → weight plate, …; other is left as it is). One edited in openGym is left alone. **Units:** `/v1/user/info`'s weight unit; when it differs from the profile's, the sheet says so (Hevy's API gives kg either way, so the import is right; the line only explains why the numbers look different from Hevy's screen). A failed read of either new endpoint imports without it. Not done: the workout events (an incremental sync), lean mass, Hevy's distance unit. |

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
