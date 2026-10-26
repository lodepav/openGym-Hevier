# Upstream pipeline

What upstream has finished but not yet tagged, and what its roadmap plans, so the fork doesn't
build something that is already coming. Read this before starting a milestone, and refresh it after each `git fetch upstream`.

Saved 2026-10-16 from `upstream/release-1.4.2` and `upstream/release-1.4.3`, refreshed
2026-10-21. **Refreshed 2026-10-24** from `release-1.4.3` (a96064d8, 75 commits past the last
refresh's 6204387d; its milestone is due 2026-11-01). **Refreshed 2026-10-25** at e107bbe5, 41
commits on: most are the Watch, the Live Activity, iOS 15 booting, Coach and Spanish; the rows
marked *(2026-10-25)* below are the ones that meet the fork. v1.4.2 is tagged and merged into the fork
(2026-10-23); `upstream/main` (7a3ace53) is two README and website commits past it (the App Store
launch). The new `wp1-deps` … `wp15-machines` branches (2026-10-23/24) are stages of
`release-1.4.3`, with nothing past it; the older work branches hold Coach, Apple Watch and
store-screenshot commits only. The full notes are upstream's own CHANGELOG on those branches (the
commands below print them).

**Refreshed 2026-10-26.** `release-1.4.3` has not moved (e107bbe5) and v1.4.3 is not tagged yet
("in App Review", ROADMAP.md). The new **`release-1.4.4`** (45512b2f) holds it all and 86 commits
more: 1.4.3's version bump and its last items (Halloween, iPhone app icons, pictures on the printed
plan) under `## v1.4.3`, then 1.4.4's under `## Unreleased`. The `n144-*`, `airpods-hr-818`,
`datepicker-809` and `pdf-images-817` branches are its stages, with nothing past it but two Coach
commits. **Four of the fork's PRs are in it** (#788, #806, #811, #812) and #814's default rule
(the fork's commit, `e0802a24d`); see the section after the next one. `upstream/main` (08eabf4f) is
three template and FAQ commits on.

```bash
git fetch upstream
git branch -r | grep release-                        # new release branches?
git show upstream/release-X.Y.Z:CHANGELOG.md | awk '/^## v1.4.1/{exit} {print}'   # since our base
```

## What touches the fork

**v1.4.2 merged** (2026-10-23, the tag, on `sync/v1.4.2`): the fork's ‹ carries `data-back` for
upstream's swipe back (iOS only, so it cannot meet D9 on Android); Skip completed exercises is in
`HIDDEN_ROWS` (D16); per-side warm-ups in the set-type sheet (D5); timed auto-advance is
Cards/Focus only (D1, skipped); the Apple Watch settings page is iOS only (skipped); the build
scripts build the `sideload` flavour; D45's port is gone; the boot screen is recoloured (D83). The
1.4.2 rows below are done; the 1.4.3 ones are kept for that merge.

| Upstream item | Fork impact |
|---|---|
| **Swipe from the left edge to go back**, the previous page sliding in | Don't build a fork back gesture. Check that it doesn't fight D9's set swipes or the fork's sheets and drag handles. |
| **Backups for an exercise** (up to 5, in the routine editor, listed first in a swap) | Built ahead as D45 (2026-10-17): ⋮ → Backups in `RoutineEditHevy`, Your backups in the fork's picker, `subs` as upstream stores it. At the merge, follow D45's list. |
| Settings → Workout: **Animation quality**, **Skip finished exercises** (Cards/Focus only), **Rest between warm-ups** | Skip finished only steers upstream layouts: add it to `HIDDEN_ROWS` (D16). Keep the other two. |
| Settings → Equipment: **Your bars**, plate quick picks, change plates | Nothing to do (upstream pages, D16). |
| Settings → Account: **Delete account**, **Add another device** | The fork's root repeats the account card (S11): check it still links to these. |
| Settings → Reminders: **Gym reminder** (1.4.3) | An upstream page. The fork's gym picker (D47) ports its `currentPosition` as `HevierLocationPlugin.java` (in `HevierPlugins.java`, seam S17) and declares the same two location permissions. At the merge: the merger keeps one of each; review the background permission (D38 list); keep it unless upstream's plugin takes an approximate grant |
| Health Connect reads: **heart rate per set, weigh-ins from other apps** (1.4.3, `f9c03474`, #544, #127) | The fork carries a copy now (DECISIONS.md D27). At the merge: delete `HevierHealthReadPlugin.java` and its line in `HevierPlugins.java`, `hevier/lib/health-read*.js`, `hevier/lib/heart-rate.js` and the Data-page insert (`HealthReadSection`); S18's backported lines become upstream's own; turn the two switches on again in upstream's rows (the data needs nothing) |
| Settings → About: **support links** (1.4.3) | Nothing to do. |
| **Notifications asked for at the start**, a start logo | Onboarding: don't add a fork prompt. |
| **Running workout saved on every change** and on background | Nothing to do (store logic). |
| Timed exercises move on by themselves; per-side warm-ups; bodyweight has no weight step | `HevyWorkout` and its set-type sheet (D5) must follow: check after the merge. |
| **Progress photos for any day**, delete with Undo; **body weight for an earlier day** | M6 Measures (D14): use upstream's flows, don't build our own. |
| Muscle balance: tap an untrained muscle to see its exercises | M6 Statistics: reuse it. |
| The Undo toast gains an × | Fork toasts use upstream's: nothing to do. |
| Effort stats average the whole training | M6 Statistics: reuse it. |
| Android targets 16, minSdk 24, Standard/Plus/HD APKs | `hevier/tools/emulator.sh` and seam S7 (gradle): check the flavours on merge. |
| iOS app, Watch, widgets, Apple Health | Out of scope for the fork (Android). |
| **Keep what you added** (1.4.3, #592): the finish summary's "New in this workout" (`KeepInRoutine` in `sheets.jsx`) adds an exercise added mid-session to its routine | D35's Update routine prompt covers it and more. The fork's summary draws `LastAndNext` and `CardioDone`, not `KeepInRoutine`: don't add it, or the summary asks twice. |
| **A tiny body on routines and the workout's chips** (1.4.3, #670): Plan page, Home's session, the chip strip, a sheet of sets per muscle; off in Fine-tuning | The fork's Workout tab and Hevy list (D1, D13) show neither: nothing appears by itself. If wanted on the fork's routine cards, reuse upstream's component. Add its Fine-tuning row to `HIDDEN_ROWS` if it steers only upstream's layouts. |
| **Lats & upper back** as one muscle in Stats, the body map and the custom muscle picker (1.4.3, #607) | D74 names Lats and Upper Back apart from the catalogue's targets, so the fork's counts are unchanged. Check that `muscle-groups.js` and D76's sheet still find a custom exercise's `primaries` after the merge. |
| **Cardio as sets × reps or timed** (1.4.3, #678): jumping jacks, burpees | D53's TIME column and D55's hold mode read the entry's mode: check a cardio exercise switched to reps draws the reps columns. Open PR #717 does the same for jumping jacks' default. |
| **Rest after this set** from the set's number (1.4.3, #609); a per-side hold's switch pause can be off (#636) | The fork's set-type sheet (D5) replaces upstream's set menu: offer #609's row there at the merge. #636 is upstream's per-side setting, no fork change; D70's rest after a side stays. |
| **Rest days and repeats in the rotation** (1.4.3, #536) | Upstream's rotation editor (D13's Schedule): check D68's planned days and the Today card skip a rest day. |
| **Export as a spreadsheet** (1.4.3, #647), GymMane import | Check the CSV leaves out `hvBrand` / `hvCable` cleanly or carries them; D34's Hevy export is separate. |
| **Fatigue in percent** (1.4.3, #662), Muscle balance's untrained muscles offer exercises (#553) | Upstream's Stats pages: nothing to do. |
| **Settings pages slide in** from the right | The fork's Settings root (D16) is upstream's page: check the slide and D49's page bar together. |
| **Faster on long histories**: fewer renders on Home and Stats, a smaller start script | Check the fork's Home (D12) and Profile still render once per change. |
| **The fork's own PRs** taken into 1.4.3: Hevy titles (#672), chart labels (#677), weights to the hundredth and note line breaks (#690), holds as timed holds (#694), one-limb exercises per side (#736), the rest wheel on the rest that applies (#735), and the dependency bumps (#754, #766, #767, #768: 1.4.3 has the same versions) | At the merge: delete D29's fix rows #672 covers (its regenerated map was not taken, see below) (`hevier/upstream/hevy-map-fixes.md`), seam S25 and its `importWeight` hook (D40), and D54's line-break step in `importDone` for new imports (keep the fix-up of earlier imports' `\n`); seams S33 and S42 and `hevier/lib/rest-default.js` (D56); S32's per-side half and `sideOff` (D75), keeping the fork's "last logged per side" and "last logged as holds" rules, and D55's id list where upstream's catalogue defaults give the same mode; S44's rows, whose lines become upstream's. The PRs show open until upstream ships them. |
| **Other names** for an exercise (1.4.3, #624): `S.exAliases` (`{ [exId]: [names] }`) and a custom exercise's own `aliases`, found by upstream's search | **Overlaps D73** (`S.hvAliases`, seam S41). At the merge: move the fork's names into `S.exAliases` (one list, synced by upstream), keep only D73's **Show as its name** as the fork's, and drop S41's search half. |
| **A planned backup in one tap** from the exercise's ⋯ during a workout (1.4.3, #649) | The fork's ⋮ (`HevyWorkout`) is its own, so nothing appears. D46 / D86 swap a backup in by gym; if a one-tap pick is wanted in the fork's ⋮, call upstream's helper rather than building one. |
| **Machine weight stacks** under Plate loading (1.4.3, #688): progression, warm-ups and drops land only on the stack's weights | The fork's ⋮ → Plate loading is upstream's page, so it comes as is. A stack is per exercise, not per brand (D28 / D82): two brands' machines share it. Check it against D41's `inc` in the other unit. |
| **"Your last session"** (1.4.3, #217, #519): Fine-tuning → Planned sessions start from; with progression off an exercise opens at last time's weight and reps | **Overlaps D69**, which does this for every routine without progression, warm-ups and D82's labels included. At the merge: decide whether D69 sets upstream's choice or keeps its own seam (S40), and whether the Fine-tuning row stays shown. |
| **"Last time means → Any workout"** (1.4.3, #770): the rows, the last-time line and progression alike | **Overlaps D21** (`S.hvPrevious`, the PREVIOUS column only). Two settings for one thing: at the merge, map D21 onto upstream's or hide upstream's row (D16), the user's call. |
| **Count warm-ups in volume** (1.4.3, #719), a switch in Units & language; **Lifted in total** on Stats | D18 / D42 count work sets only. The fork's volumes (D57's `counted.js`) should follow the switch, or the row goes into `HIDDEN_ROWS`. Check the new tile goes through D57's filter (S34). |
| **"No timer"** for one exercise (1.4.3, with #735) | The fork's rest wheel opens upstream's sheet (D56), so the choice comes with it: check the exercise block's rest line (D7) reads it, as Hevy's "Rest Timer: OFF". |
| **Back** returns to where the page was scrolled, titles beside it aligned (#704, #763, #764); **Android back** stops touring the tabs (#705); Discard only in the Finish sheet (#751) | Check the fork's page bars (D49) and `HevyTabBar` with them: Android back from a fork tab. The Discard move is in upstream's layouts; the fork's (D10) is its own. |
| **Weekly rate** under the body-weight chart, Home and Stats (1.4.3, #759); weigh-in Undo (#756); custom measurement units (#699, #718) | Check D12's body-weight widget and D14's Measures show what upstream's cards now do. D31's Hevy measurements stay in cm. |
| **Equipment needs**: an inverted row needs a bar, a fly or pullover a bench (1.4.3) | D62 / D67 read upstream's needs: check "Needs …" lines and the gym filter after the merge. |
| **Increase Contrast, Reduce Transparency** (1.4.3, #707, #708) | Check D17's colours with Increase Contrast on (the fork's theme overrides upstream's tokens). |
| **The Android update installs** after a switch away, reuses a downloaded APK; About names the Standard / Plus / HD build | D52 / D77 use upstream's updater: take it. Check About's row for the fork's sideload build. |
| **New dependencies** in 1.4.3: `leaflet` (the gym reminder's map, tiles from `tile.openstreetmap.org`, places from `nominatim.openstreetmap.org`), `@capacitor/splash-screen` (`lib/boot.js`), `fast-check` (dev) | D26's supply-chain gate fails on all three until they are read and added to the baseline, and on the two OpenStreetMap hosts until they are allow-listed (Photon and Overpass already are, D47). The splash-screen plugin meets D83's boot screen and the fork's black native splash: check the colours at launch. |
| Bodyweight view in Exercise progress (#729), volume in the workout's progress bar (#774), Swedish (#721), MCP `log_workout` (#739) | Upstream's pages and layouts: nothing appears in the fork's. |
| **Hevy import leftovers** *(2026-10-25)*: 12 more Hevy titles (#793, another user's), seated leg curl stays seated and lifts never matched by title stay out of the Hevy id map (#784, #785) | At the merge: delete the 11 rows `hevier/lib/hevy-import.js` took from #793 (marked there) and D29's fix rows these cover (`Seated Leg Curl (Machine)` among them; compare with `hevier/upstream/hevy-map-fixes.md`). |
| **Health Connect history permission** *(2026-10-25, #801)*: turning on weigh-ins asks for `READ_HEALTH_DATA_HISTORY` too, and the first read goes a year back | D27 reads 30 days and asks for no history permission. At the merge, D27's copy goes anyway; add the new permission to D38's `apk-permissions.txt` with its reason, or the APK gate fails. |
| **Jump rope starts as sets × reps** *(2026-10-25, #796)*: nine catalogue entries moved from cardio to full body | D55 / D75's `defaultConfig` (S32) answers first only for holds and one-limb lifts, so upstream's default comes through. Check D53's TIME column is not drawn for them, and D64's Cardio muscle group loses them. |
| **RPE for a cardio set** from its set menu, read by the fatigue model *(2026-10-25)* | The fork's set-type sheet (D5) replaces upstream's set menu: offer the row there at the merge, as #609's. D6's effort column shows only for RIR / RPE settings. |
| **"I own no dumbbells"** switch on Settings → Equipment → Dumbbells *(2026-10-25)*: stands in for the active profile, so the library, picker and missing-equipment flags hide dumbbell exercises | The fork's picker filters by the gym (D62), not upstream's active profile, so it would ignore the switch. **Hide the row** (the user's choice, 2026-10-25: not needed, a gym without dumbbells says it): add it to `HIDDEN_ROWS` (D16) at the merge; its stored value stays off, so upstream's library reads no change. |
| **A run is a run** in Health Connect *(2026-10-25, #799)*: a cardio-only workout is written with its activity type | Upstream's write: nothing to do. Check D79's strap heart rate still lands on such a workout. |
| **Boot watchdog** *(2026-10-25)*: a boot that never finishes says why on the boot screen, with a lime **Reload** button (`#boot.fail` in `index.html`) | D83 recolours `#boot` by S45's style: add `#boot.fail button` in Hevy blue, or the one screen that shows when things break is upstream's lime. |
| **Safari 15 build target** and a bundle syntax check *(2026-10-25)*, in `vite.config.js`'s `build` | Seam S45 is in the same file's `plugins`: expect a nearby but separate hunk. The fork's newer syntax must pass `scripts/check-bundle-syntax.mjs`; run it after the merge. |
| **color-mix() fallbacks** *(2026-10-25)*: `color-mix-fallback.test.js` checks every `.css` under `frontend/src`, so the fork's too | `frontend/src/hevier/hevier.css` has 8 `color-mix()` without plain fallbacks: upstream's test would fail on fork CSS (rule 3). At the merge: add the fallbacks (the Android WebView needs none, but the test is upstream's), not an exception in the test. |
| Security fixes, owner role, CSP | Server side: take as is. CSP: the fork loads nothing external, but check it on merge. |
| **Halloween** *(v1.4.3, on `release-1.4.4`)*: until the end of October a spider at every open, bats in the header, cobwebs, a pumpkin on Home, a corner on Stats; Settings → Seasonal themes | Drawn over upstream's screens, so check what shows over the fork's Home, Profile and `HevyWorkout` next October, or switch it off with the Seasonal themes row. 1.4.3 merges after October, so nothing shows at the merge. |
| **Pictures on the printed plan** *(v1.4.3, #817)* | Upstream's print page: nothing to do. |

## What release-1.4.4 brings (2026-10-26)

`release-1.4.4` (45512b2f, due 2026-11-15). Its v1.4.3 part is in the table above; these are
under `## Unreleased`. The rows the fork must act on come first.

| Upstream item | Fork impact |
|---|---|
| **A weight unit per exercise** (#657): `S.exUnit` (`{ [exId]: { unit, _ts } }`, synced with stamps), `lib/ex-unit.js`; the exercise is shown and typed in its unit everywhere (rows, steppers, plates, warm-ups, last time, records, history, its chart); an Exercise settings row | **Replaces D41** (`S.hvExUnit`, the workout's rows and PREVIOUS only). At the merge: move each `hvExUnit` entry into `S.exUnit` (D41's `step` / `inc` onto upstream's increment), point the fork's ⋮ → Weight unit at upstream's, and drop D41's own conversion. The fork's screens (Save Workout, Workout Detail, the routine editor, records D51, the PR toast D22) must then read the exercise's unit as upstream's do: a check of every fork screen with a lb exercise. D19's thresholds and D28's labels keep their own units. |
| **Swap suggestions and a gym row in the swap picker** (#674): up to three substitutes under the planned backups; a Gym row filters the list for another gym, for this swap only | The fork's picker (D45, D62, D67) is its own, so nothing appears. Its gym filter is the same idea as D62's: read #674's helper before the next gym change; the substitutes could sit under D45's "Your backups" through upstream's helper. |
| **"Your last session" brings your warm-ups too** (#525, #658): typed warm-ups come back, automatic ramps stay automatic | **Overlaps D69** further (with 1.4.3's #217, above): decide at the merge whether D69 (seam S40) gives way to upstream's choice. |
| **Programmes** (#159): Plan → Programmes runs routines as a 1–16 week block with %1RM / RPE / deload weeks, takes over the plan while it runs, a chip on Home and Plan, in plan files and the sync | The fork's Workout tab (D13) and Home (D12) show no Programmes entry or chip: upstream's Plan page still has it. Decide whether the fork offers it (a row on the Workout tab) or leaves it on Plan. A %1RM week opens a session at its own weights, so D69 must not override it, and D57's deload handling should count a programme's deload week as a deload routine's. D13's folders stay the fork's. |
| **A 1-minute tour** after the first setup, and Settings → About & updates → Show the tour again; anchors are `data-tour` on upstream's screens | **The fork's screens have none of its anchors**, so on a fresh install the tour would ask and then point at nothing. At the merge: turn it off under `HEVIER` (don't offer it, hide the Settings row in `HIDDEN_ROWS`), or later add `data-tour` to the fork's own screens. Its practice workout is upstream's store sandbox (`enterTourSandbox`): check `HevyWorkout` never sees it. |
| **App icon picker on Android**: nine launcher `activity-alias` entries in `src/main`'s manifest (`.IconDefault` enabled), `AppIconPlugin.java`, Settings → Look & Home → App icon | `IconDefault` uses `@mipmap/ic_launcher`, which S7's `src/hevier/res` recolours, so the fork's icon stays. The other eight are openGym's colours and `recolour-icons.py` does not cover them: **hide the App icon row** (`HIDDEN_ROWS`, D17's one look) unless the user wants them. Check D24's portrait-only overlay manifest still applies through the aliases, D38's exported-components list (eight new exported aliases), and `AppIconPlugin` in S17's plugin list and R8's keep rules. |
| **Tap the tab you are on** scrolls its page to the top (Exercises: into the search); a **back-to-top** arrow on long pages (`App.jsx`, `TabBar.jsx`) | `App.jsx` gains ~60 lines near seams S2 and S15: expect a conflict there. The fork's `HevyTabBar` (S2) gets no tap-to-top; worth copying as Hevy does the same. Check the arrow on the fork's long pages (Profile's feed, the picker) and that it stays out of `HevyWorkout`. |
| **Count body weight in bodyweight lifts** (#794), a switch in Units & language, off by default | Like 1.4.3's #719: D18 / D42 and D57's `counted.js` volumes should follow the switch, or the row goes into `HIDDEN_ROWS`. |
| **Dates pick like the rest of openGym** (#809): every date field is upstream's own picker | The fork has no date field of its own (only a test): nothing to do. |
| **YouTube demos inline** (#613): a "Watch video" card from youtube-nocookie.com, the CSP's `frame-src` | Shows in upstream's exercise details and routine notes; the fork's details (D7, D58) don't draw it. D26's endpoint check: allow-list `www.youtube-nocookie.com`. |
| **The gym reminder's map redrawn** (#614) | Upstream's page; still `leaflet` and the OpenStreetMap hosts (the 1.4.3 row above). |
| **Tap the picture in a past workout for the how-to** (#805) | Upstream's history; the fork's Workout Detail (D66, D88) is its own: nothing appears. |
| **The fork's PRs** #788 (D74's catalogue targets), #806 (S44's CVE pins), #811 (D90's weight and rep checks), #812 (D88), and #814's default rule | At the merge: D74's name rules that #788's targets now give (check `muscle-groups.js` reads them), S44's rows, D90's checks (the fork keeps the cardio-timer one), D88's `exercise-time.js` (keep the fork's Muscle and Gym grouping over upstream's helper), and D61 / D69's default (the profile setting replaces the fork's own). Each becomes upstream's. |
| AirPods heart rate (#818), Coach gateways (#804), iPhone web app height (#810), Halloween and app icons on iOS | iOS or Coach: nothing for the fork. |

## Upstream's roadmap (ROADMAP.md, read 2026-10-18)

`ROADMAP.md` on upstream's main (last changed 2026-10-09) describes the themes; its version numbers
have slipped. The **GitHub milestones** are the live plan, a release every two weeks on a Sunday
(checked 2026-10-24, unchanged but for 1.4.3's name; checked again 2026-10-26, unchanged, though
the new ROADMAP.md on `release-1.4.4` makes 1.4.5 remote MCP and Google Play):
1.4.2 App Store & Watch (shipped) · 1.4.3 gym reminder, health data & community features (11-01) · **1.4.4 Programmes
& phases** (11-15) · 1.4.5 Google Play & progression I (11-29) · 1.4.6 progression II (12-13) ·
1.4.7 cardio, alternatives, groups (12-27) · 1.4.8 search & catalogue (2027-01-10) · 1.4.9
accounts · 1.4.10 trainer & MCP write · 1.4.11 wearables · 1.4.12 looks, social · later: database
storage. Refresh:

```bash
for n in $(gh api repos/DuarteSantos8/openGym/milestones --jq '.[].number'); do
  gh api "repos/DuarteSantos8/openGym/issues?milestone=$n&state=open&per_page=50" \
    --jq '.[]|"\(.milestone.title|split(":")[0])\t#\(.number)\t\(.title)"'; done
```

What would meet the fork's own work (milestone in brackets; "roadmap" = in ROADMAP.md only, no issue):

| Roadmap item | Fork impact |
|---|---|
| **Database storage** (#191, later, the one compatibility break): tables per kind of record, a migration, the state file kept as the backup format | **The biggest risk.** The fork keeps its own fields in `S` and on records (`hvVolume`, `hvMachines`, `hvStrength`, `hvImportMap`, `folder`, `hvGym`/`hvBrand`/`hvCable` on entries, `hvHevyRoutine`, …), relying on upstream carrying unknown fields through sync and backups (D20). A table schema would drop them. Before that merge: list every fork field, and ask upstream for a pass-through (a JSON column, or an "extra" map per record), better before the schema is fixed. |
| **"Different gyms"** (roadmap only, no issue): a location on a logged set, separate histories and PRs per location | Overlaps D28 / D47 / D51. The fork decided the gym is only where and splits nothing, while the **brand** splits records. If upstream's lands: map D28's gyms onto its locations, keep the brand label as the fork's, and decide again whether a location splits records (upstream's yes against D51's no). |
| **Programmes** (1.4.4, #159): routines grouped into named blocks over weeks, "folders" in its Discord thread | Overlaps D13's routine folders (`folder` field). If upstream adds its own grouping, move the fork's folders onto it rather than keeping two. |
| **Session phases** and completion-only stretching kept out of volume and PRs (1.4.4, #57, #140; open PR #610) | `HevyWorkout` must follow; D18 / D42 counts and D51 records must leave those exercises out as upstream does. |
| **Progression engine I and II** (1.4.5, 1.4.6): a v2 training engine (#186, open PR #312), per-set rep/set ranges and AMRAP (#154), %1RM with a training max and target RPE/RIR (#153), 5/3/1 waves (#70), a warm-up generator (#156) | D15's table is drawn from today's single prescription: per-set ranges would need the table to edit rows one by one. D35's routine update, D34's routine export and D37's routine page read the same prescription. Expect the largest drift in `routine-table.js`. |
| **Assisted exercises as negative weight** (roadmap; #176 closed) | D51 treats the help as the weight (least help is the record) and D34 sends it as weight: follow upstream's sign at that merge. |
| **Cardio** (1.4.7): intervals, C25k, rucking, **distance for cardio** (#177, #169; roadmap) | D53's TIME column and set timer: add the distance column as upstream stores it; intervals may replace the count-up timer for those sets. |
| **Alternatives per routine slot** (#649, "when the machine is taken") | **Shipped in 1.4.3** as the one-tap backup (the table above): no per-gym choice, so D46 / D86 stay the fork's. |
| **Search your history, import aliases by name** (roadmap; the aliases shipped in 1.4.3, #624) | D33's import map and D36's brand search stay the fork's; D73 moves onto upstream's aliases (the table above). |
| **kg ↔ lb switching converts stored values** (roadmap; the per-exercise unit #657 is in `release-1.4.4`, see above) | D41 (per-exercise unit, stored in the profile's), D19 (`hvStrength` entries keep their own unit) and D28's labels: check the conversion leaves the fork's fields right, and that D41's `inc` is converted with upstream's. |
| **Android & health**: Health Connect sessions, an Android **home-screen widget** (1.4.5, #125; PR #299), logging a set from the lock screen, the **timer rework** (#165), **media cached for offline** (#123) | Widget: D44 is the fork's; if upstream ships one, keep one. Timer rework: D10's Timer / Stopwatch and D53's set timer. Offline media: D50 left the media (90% of the APK) alone; upstream's cache may let the fork stop bundling it. |
| **Looks** (1.4.12): skins, wallpapers, a big-screen layout (#129, #134, #135); **social** (PR #180) | D17 (one dark look) and D49's page bars: skins stay unoffered, like the accent. Social: D14's Profile and Hevy's feed. |
| **Body composition** in measurements: fat %, muscle mass and more (1.4.4, #648) | D31 maps Hevy's `fat_percent` to body fat and leaves lean mass out for want of a field: add it to the Hevy import when #648 brings one. |
| **CSV export** (1.4.3, #647) | Check it carries the fork's entry labels (`hvBrand`, `hvCable`) or leaves them out cleanly; D34's Hevy export is separate. |
| Accounts (password, OIDC), trainer role, MCP write, the iOS app | No fork impact expected (iOS out of scope). |

## The fork's PRs and issues upstream (2026-10-24, checked 2026-10-25)

On 2026-10-25 upstream closed #672, #677, #690, #694, #736, #766, #767 and #768 unmerged: each
came into 1.4.3 through `release-1.4.3`, and the maintainer's closing comment says so. Checked
commit by commit against the branch the same day: everything is in **except #672's last commit**
(below). #754 is still open, though its commit came in with #766; #735 is still open, upstream
having written its own version into 1.4.3 (`8727ee090`); #788 and #806 are open, not in the branch; #807 offers #672's last commit again.

**2026-10-26:** #735 and #754 are closed (covered in 1.4.3). #788, #806, #811 and #812 are in
`release-1.4.4`, still open until it ships, and so is #814's commit; the maintainer will retarget
#813, #814 and #815 to `main` once 1.4.3 is out. #813 and #815 are not in any branch yet.

| # | What | State |
|---|---|---|
| #672 | Hevy titles land on the exercise Hevy's own artwork shows (D29) | Closed, 3 of its 4 commits in `release-1.4.3`. **Not taken:** the last, "map Hevy templates to the exercise their own artwork shows" (`fc5ba8450`, pushed after the review), which regenerates `hevy-id-map.js` from the thumbnails: 429 of Hevy's 451 templates mapped, where 1.4.3 has 297, so 132 still import as custom and 78 land elsewhere. **Offered again as #807** (2026-10-25, on `release-1.4.3`, regenerated there: 429 of Hevy's 503 templates mapped, 1.4.3's own title rows kept), the maintainer told why |
| #677 | Chart x-axis labels never repeat a date or a month | Closed, in `release-1.4.3` |
| #690 | Imports keep converted weights to the hundredth, Hevy notes keep line breaks (D40, D54) | Closed, in `release-1.4.3` |
| #694 | A plank or a wall sit starts as a timed hold (D55) | Closed, in `release-1.4.3`, with #717's cardio defaults, for fresh picks only |
| #735 | An exercise's rest wheel opens on the default rest (D56) | Closed; upstream's own version is in `release-1.4.3`, with its "No timer" |
| #736 | A one-arm or one-leg exercise starts per side (`pickedExerciseConfig`, D75) | Closed, in `release-1.4.3` (its rename commit too) |
| #754, #766, #767, #768 | Dependency bumps: Vite and Vitest past their CVEs, in-range bumps, mcp on zod 4, `@capacitor/assets` through npx (S44) | All closed; all four in `release-1.4.3` (#766 with #769) |
| #788 | Each exercise filed under the muscle it is known for (D74's catalogue targets) | Open; in `release-1.4.4` (planned for 1.4.4, as it shifts everyone's fatigue numbers) |
| #806 | The release gate's CVEs: body-parser, fast-uri, zod, ip-address 10.7.4, happy-dom 21 (S44) | Open; in `release-1.4.4` |
| #807 | #672's last commit: Hevy templates mapped by their artwork (D29) | Open, on `release-1.4.3`; not taken yet |
| #811 | Ask before logging a likely typo (D90's weight and rep checks) | Open; in `release-1.4.4` |
| #812 | How long each exercise takes (D88) | Open; in `release-1.4.4`, a Stats card without the fork's Muscle and Gym grouping |
| #813 | An exercise kept out of progression is kept out of the statistics, a deload routine's still counted (D57) | Open, to be retargeted to `main` after 1.4.3 |
| #814 | A default progression rule for the profile (D61, D69) | Open, to be retargeted to `main` after 1.4.3; its commit is in `release-1.4.4` already |
| #815 | More from the Hevy API import: notes, rest and rep ranges, measurements, routine links, muscles (D31) | Open, to be retargeted to `main` after 1.4.3 |
| #638 | Split shoulders into front, side and rear delts (D65) | Issue open; no answer since the fork's comments of 2026-10-19 and 2026-10-21 |

## Open pull requests (2026-10-16, new ones added 2026-10-21)

Upstream had 100 open PRs, 147 on 2026-10-21, 156 on 2026-10-24. Some are already in the release
branches as upstream's own version (#526, #530, #539, #548, #564, #565, #570, #579, #581; since
2026-10-21 also #574, #591, #595, #608, #622, #624, #625 as #609, #636, #700, #705, #717, #728,
#729, #763, #764). The rest may or may not land. Judged
from their **titles only**, so read a PR before acting on it. Refresh:
`gh pr list -R DuarteSantos8/openGym --state open --limit 100`.

**Overlaps the fork's plan: watch these before building the matching item**

| PR | What | Fork item |
|---|---|---|
| #590 | Home: health widgets, a pencil to arrange the cards | D12 configurable Home: if it lands, back the fork's Edit Home with it |
| #589, #463, #434 | Health area (body composition, activity, heart, sleep) reading Apple Health; weigh-in from Apple Health; weight provenance | **Done** as D27 / D32 (upstream 1.4.3's Android reads, ported); watch for the Android side of these |
| #568, #495 | Gym check-in with barcode membership cards | **Won't do:** the fork hides upstream's check-in (D12, 2026-10-17); gyms are D28, the picker D47 |
| #531 | QR codes on machines: scan to jump to the exercise | Machine labels **done** as D28, without QR codes |
| #509 | Social: friendships and progress on Profile | D14 Profile, Hevy's feed |
| #484 | Home: favourite lifts with their best e1RM | D12 Home widget candidate, M6: take it if it lands |
| #528 | Liquid Glass redesign (tokens, glass surfaces) | **Phase 2 theme**: a large CSS change, conflicts with `hevier.css` |
| #549 | Dark mode inverts exercise artwork | Phase 2 theme |
| #312 | Prescription engine v2, smart warm-ups, v1→v2 migration | **D15 routine editor** reads the v1 prescription: big drift if it lands |
| #674 (2026-10-17) | Substitutes in the swap picker, and switching gyms from it | **In `release-1.4.4`** (2026-10-26, see above). D45 / D46 / D47 / D62: read it before the next gym change |
| #702 | Exercise goals with progress tracking | A Hevy-like idea: take upstream's if it lands, don't build one |
| #706 | A guided warm-up before workouts | Not Hevy; upstream's |
| #709, #710, #711 | Apple HIG colours, 11 px tab labels, a floating capsule tab bar | **Theme conflicts** with D17 / D49 and `hevier.css`, like #528 |
| #680 | Settings as a tab | D11's three tabs stay; nothing to take |
| #681 | A music bar in the workout | `HevyWorkout` would need to follow if it lands |
| #661 | Life Fitness consoles: scan the end-of-workout QR code into a cardio set | Near D28's brands; nothing to take now |
| #723 | Gym membership barcodes | **Won't do** (D12), like #568 |
| #658 | Warm-ups: "Your last session" carries last time's warm-ups (#525) | **In `release-1.4.4`** (2026-10-26). D69 does this for routines without progression: decide at the merge (with 1.4.3's #217, above) |
| #785 (2026-10-24) | Hevy import: seated / lying leg curl, cable / machine reverse fly and the dumbbell skull crusher kept apart; Crunch, Side Plank, Squat (Machine) and Triceps Extension (Cable) left out of the template map too | **In `release-1.4.3`** (with #784 and #793; closed 2026-10-25). **D29's fix table** maps some of these: at the merge, delete the rows it covers, as with #672. Its four titles left out would make custom exercises where D29 or D33 picked one: check the user's history imports the same. |
| #773 (2026-10-24) | Android slim APK, animations downloaded on demand (a proof of concept, discussion #744) | **D50** left the media alone: if it lands, the fork's APK can shrink with it, through upstream's build |
| #775 (2026-10-24) | A warm-up or cool-down runs itself, as one card | `HevyWorkout` would need to follow, with #610's phases |
| #749, #790 | Rest by heart rate on the Apple Watch; a forgotten workout ends at its last set (watch) | iOS; near D79 / D80 and D60, nothing to take |
| #657 (issue) | A per-exercise weight unit | **In `release-1.4.4`** (2026-10-26), upstream's own, in every screen: it replaces D41 (see above) |

**Workout-screen features `HevyWorkout` would need to follow** (CONFLICTS.md, silent drift):
#563 a persistent Complete / Next button · #490 a timer bar that says what it times, timed
exercises that run themselves · #610 workout phases (reorder, colours, skip/resume) · #626
automatic superset intervals, editable round rest · #587 extra exercises counted as training ·
#507 interval training mode · #613 YouTube demos inline (in `release-1.4.4`) · #299 Android widget, early finish ·
#712 Focus card width · #714 measurements back chevron. (#608, #622, #595, #574, #625 as #609,
and #636 are in 1.4.3 now; #650 was closed.)

**Other features, no fork impact expected:** #478 Strava upload · #391 OpenID Connect sign-in ·
#538 a routine more than once in a rotation · #485 progression "Repeat last session" · #519 last
session carries weight with progression off · #542 any plate weight · #604 global bar weight
(shipped as "Your bars") · #441 admins publish custom exercises · #591, #504 Strong import fixes ·
#567, #566, #480 planner and API tokens · #643, #588, #492 and others: Coach (off in the fork, D11) ·
#435 Apple Watch, #314, #310, #326 MCP · locale PRs (take upstream, rule C).

## Other forks (2026-10-17, rescanned 2026-10-21)

**Rescan 2026-10-21:** 1,623 forks; 296 pushed since the last scan, 82 of them ahead of upstream's
main. Most are again deployments, rebrands, iOS build workflows, nutrition, social or Coach work.
What touches the fork:

| Fork · commits | What | Fork item |
|---|---|---|
| omer-go/openGym `cc6cd6446`, `b42fa1449`, `e85c0ada5`, `f2e763e11`, `d1929553a` | Muscle roles per exercise for the catalogue (core, chest, back, shoulders, arms, legs); a tapped muscle splits into its parts; weekly volume by group | **Near D74 / D64 / D65** and upstream #638. Read it before offering D74's main muscles upstream: one catalogue change, not two |
| omer-go/openGym `e230dffa3`, `7d6129c8d` | Drops the check-in scanner (ML Kit) and the check-in | **Done** as D50 / D12, by the build alone |
| grahamsshaw/openGym `974397109`, `54359f94c`, `8798a869f`, `4405413bb` | Health Connect reads: ask for permission instead of failing, say why a read failed, never hang (a bounded wait), reach Health Connect through the write path's accessor | **Check against D27's plugin**: a hung read is the risk. Upstream 1.4.3's own reads replace D27 at that merge |
| WostPT/PerForm, X3M4/openGym | Health Connect: sleep, heart rate, HRV, steps, weigh-ins, body fat | Beyond D27; nothing to take |
| kayloehmann/openGym | Future training shown as planned in the calendar | **Done** as D68 |
| ifrankerem/openGym (#8–#22) | Its per-exercise unit carried into the settings sheet, details, history, stats | D41 stays the fork's display unit; still not taken |
| maksiksay/openGym | Warm-up routines of their own; goals on a lift | Like upstream #706 and #702: upstream's |
| its-everdred/openGym | Set how long an exercise took | **Done** as D88, worked out from the set ticks rather than typed in |
| Dos2Locos/openGym | Any plate weight, equipment instances | Upstream #542: upstream's |

The first scan's findings follow.

Upstream has ~1,575 forks. 501 were pushed after v1.4.1 (2026-10-10), and 99 of those have
commits that aren't on any upstream branch or PR head (default branches only; most add 1–5
commits). Most are rebrands, hosting set-ups (Vercel, Railway, Cloudflare, Postgres, Supabase),
nutrition and social features, or iOS build workflows: nothing for the fork. What's left, by
fork item. All are AGPL like us, so code may be reused with credit, but asking the author to
send it upstream is better (rule 2: it would come in through a merge, not as fork code). Read
the commit before taking anything: none of it is reviewed upstream.

```bash
# the scan: list forks, compare, then fetch candidates and drop anything reachable from upstream
gh api --paginate "repos/DuarteSantos8/openGym/forks?per_page=100" --jq '.[]|[.full_name,.pushed_at,.default_branch]|@tsv'
gh api "repos/DuarteSantos8/openGym/compare/main...OWNER:REPO:BRANCH" --jq '[.ahead_by,.behind_by]'
git log --no-merges <fork-ref> --not <all upstream heads and refs/pull/*/head>
```

**Matches a planned fork item** (marked 2026-10-17)

| Fork · commit | What | Fork item |
|---|---|---|
| hpeppitt/opengym `7a689334c`, `d3c01db9b` | Health Connect *read* plugin (`HealthReadPlugin.java`, `lib/health-read.js` with tests), backfills body weight; tagged "[upstream]" by its author | **Done** as D27 from upstream's own 1.4.3 code instead, so not taken |
| awkaplan/openGym `2105f02ef` | Health Connect: read weigh-ins other apps logged, extends upstream's own `HealthConnectPlugin` / `health-sync.js` (tests) | **Done** as D27 from upstream's 1.4.3 code instead, so not taken |
| frdc/openGym `3eae35eac` | Wear OS controls and heart-rate tracking (3.8k lines) | **Done** as D27 with upstream 1.4.3's data shape; Wear OS not taken |
| hpeppitt/opengym `69d1db2c7` | Import review step: search the whole library for a match | **Done** as D33 (the idea only) |
| linjames890828/openGym `8cf2010f5` | CSV import reads Chinese and Japanese dates | **Won't do** in the fork: upstream's importer, for upstream |
| camilopez/openGym `168205bb7` | Fixes up Strong exports before import | **Won't do** in the fork: Strong, upstream's importer |
| frdc/openGym `940e6f410` | Search exercises by machine names | **Done** as D36 (the idea only, over D28's brands) |
| kdaneshmir-gif/lift `05b7b51dd`, `14c44f184` | "Machine taken" swap; several gyms each saved as a profile | **Done** as D28 (gyms are profiles), and the swap as D45 / D46 |
| Hugo-Mllr/Biscotos (2026-10-14 "chore(security)"), geniok1980/openGym (CI structural checks) | gitleaks pre-commit hook and history audit; CI checks for secrets, big files, line endings, lockfiles | **Done** as D26 (gitleaks over the history, local, no CI) |
| solhren/openGym (2026-10-10) | Drops `@capacitor/assets` tooling for a vulnerable dependency | D26's Trivy gate scans every lockfile, dev dependencies included, so a vulnerable one fails there |
| alikulovuzz/kuch (2026-10-14/15) | Signed APK built on GitHub Actions; a "storage boundary" test that fails when an upstream merge touches the store; a sync runbook | The signing check **done** as D38 (local, no CI); the rest fork upkeep ideas (CONFLICTS.md) |

**Hevy behaviours and other ideas (backlog candidates, marked 2026-10-17)**

| Fork · commit | What | Note |
|---|---|---|
| vinayakgupta62/openGym `9ce5015f8`, `2e4e56286`, `502d63818` | After finishing, offer to keep exercises added mid-workout in the routine; also from History. Pure helper `lib/session-routines.js` with tests | **Done** as D35 (every kind of change, a fading button on "Nice work!") |
| vinayakgupta62/openGym (2026-10-15 "automatically advance") | Move to the next exercise after the last set, every layout | Open: compare with upstream PR #563 first |
| soldsawn/openGym `be14748ab` | Running-workout bar above the tab bar with Resume and Discard | **Done** in the fork: `HevyTabBar`'s resume bar has Resume and Discard (M2) |
| ifrankerem/openGym `997992509` → `6c4635a9e` | Per-exercise weight unit (kg on one, lb on another), synced, with tests (`lib/exercise-unit.js`) | **Done** as D41, a fork display unit: this one touches sync (`api/sync-stamps.js`), so not taken |
| ifrankerem/openGym `debf782c9`, `2c27004cf`, `1d9fe8a75` | Warm-ups carry over from the last session; "Repeat last session" progression incl. warm-ups | **Won't do** in the fork: progression logic; upstream PR #485 is the same idea, follow that |
| jeanluyac-sketch/openGym `eac00d74a` | Swap opens on the same muscle | **Done** in the fork: the Hevy picker's Replace and swap open on the same muscle (M3) |
| Packebusch/openGym `49c494328` | Show what a workout holds before it starts | **Done** as D37, the routine page (the idea only) |
| its-everdred/openGym `ad781c945` | Set how long an exercise took | **Done** as D88 (2026-10-25), from the set ticks, not typed in |
| furittsu-desu/openGym `6287c7efb` | Body-weight unit separate from the lifting unit | Small, not picked (2026-10-17) |
| slippylabs/opengym (2026-10-16) | Live PR toasts while logging | **Done** as D22 (the fork's own) |
| em4go/openGym `37e4b4d60`, `4be1c540e` | Percentage-of-training-max loading; ordered program blocks | **Won't do**: not Hevy; progression logic, upstream's call |
| camilopez/openGym `36d34ade7` | Progression says why it restarted | **Won't do**: not Hevy; for upstream |

Not taken: dafepro/openGym's Google Drive sync through a snapshot provider (D20 chose the sync-app
route); everything Coach (D11), nutrition, social and hosting.
