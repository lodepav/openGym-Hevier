# Upstream pipeline: what is merged

Moved from [PIPELINE.md](../PIPELINE.md) on 2026-10-31 and 2026-11-09, as written: the refresh notes up to
2026-11-08 and the rows of v1.4.2, v1.4.3 and v1.4.4, all merged. What is still to come stays there.

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

## What touches the fork

**v1.4.2 merged** (2026-10-23, the tag, on `sync/v1.4.2`): the fork's ‹ carries `data-back` for
upstream's swipe back (iOS only, so it cannot meet D9 on Android); Skip completed exercises is in
`HIDDEN_ROWS` (D16); per-side warm-ups in the set-type sheet (D5); timed auto-advance is
Cards/Focus only (D1, skipped); the Apple Watch settings page is iOS only (skipped); the build
scripts build the `sideload` flavour; D45's port is gone; the boot screen is recoloured (D83). The
1.4.2 rows below are done.

**v1.4.3 merged** (2026-10-26, the tag, on `sync/v1.4.3`): D27's copy of the Health Connect reads
is gone for upstream's (turn its two switches on again), and S18 with it; S25, S30, S31, S33 and
S42 are gone, S32 is down to its hooks, S41 to its name half (D73's names are `S.exAliases` now),
D29's map keeps only #793's 11 rows, D54 only the fix-up of earlier imports. Hidden (D16): Seasonal
themes (and Halloween stored off), Planned sessions start from (D69 stays), Muscle map at the top,
the Gym reminder, the support links and "I own no dumbbells" (seam S49). D21's Previous values is
upstream's Last time means; the fork's volumes follow Count warm-ups in volume (D18); D5's sheet
has Rest after this set and a cardio set's RPE. The 1.4.3 rows below are done but for the checks
the emulator walk and the journeys answer.

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


## Moved 2026-11-09: the v1.4.4 notes and rows (merged into the fork 2026-11-03)

**v1.4.4 is released (2026-11-03).** The tag `v1.4.4` (`5f5832db`, tagged 2026-11-03, five days
before its milestone's 2026-11-08) is `release-1.4.4`'s tip, and `upstream/main` now points at the
same commit. It is the `release-1.4.4` read on 2026-11-02 plus 14 commits: the changelog under
`## v1.4.4 (2026-11-03)`, the api's version, the website's downloads, `main`'s README and
ROADMAP commits merged in, and **two server hardening fixes** (push subscriptions capped in size and
checked before they are kept, oversized rows dropped at boot; the workout nudge no longer stalls the
server on a very large saved state; `4ae1cbc10`, `0817ac5f9`, advisories to follow). No feature
came in after 2026-11-02, so the four "What release-1.4.x …" sections below are now **the 1.4.4
merge list**: merge the tag (`git merge v1.4.4`, CONFLICTS.md), not the branch. `release-1.4.5`
(`11302d2d`) has not moved and is all in 1.4.4; no new `release-*` branch yet. **Six of the fork's
PRs are in the release**, see "The fork's PRs and issues upstream".

**Checked 2026-11-06.** `upstream/main` has moved past the tag with fixes only (tests, CI, #982's
Coach programme week, @hono/node-server 2.1.6, the README's phones), merged into the fork with the
1.4.4 merge. Still no new `release-*` branch; v1.4.5 is due 2026-11-29 and none of the fork's open
PRs is on it (#849, which overlaps #931, is).

**Checked 2026-11-08.** No upstream commit on `main` since 2026-11-04 and still no `release-1.4.5`
branch to read, so nothing new to merge. 34 PRs and issues opened since 2026-11-06, none on a
milestone yet; the few that meet the fork are under "New since 2026-11-06 that meets the fork".

**Decided 2026-11-03: merge v1.4.4.** The decision round is done: each item below has its answer in
DECISIONS.md, as an "At the 1.4.4 merge" note on the decision it touches or as D97 to D101 (section
"openGym 1.4.4"). **The merge is #5** (`sync/v1.4.4`, 2026-11-03): the conflicts, S35 and S47 gone,
and the decisions the merge needs (D18, D41, D61, D66, D70, D74, D90, D100's rows and Android
overlay, D11's re-tap, the Stats links). Still to build after it: D97 and D102 (Modules in the
fork's screens, a switch per part), D98, D99, D101, D5's Note, D45's suggestions, D37's Share, the
`hevier.css` restyle (D17), and on the release machine the Wear OS library left out, the Gradle
lock and `release-check.sh --apk`.
What v1.4.5 plans on top, with no code yet, is in "v1.4.5, planned, not built".

**Refreshed 2026-11-02.** `release-1.4.4` (now `1f15e1db`, 121 commits past `fef710b6`) **took
`release-1.4.5` whole**: `release-1.4.5` (`11302d2d`, 33 commits past `d0a85546`) has nothing that
is not in `release-1.4.4`, and the CHANGELOG has one `## Unreleased` again, so everything under
"What release-1.4.5 brings" ships as **1.4.4**. The 1.4.4 store build is made (2026-11-01: iOS build
54, Android versionCode 31) and its milestone is still due **2026-11-08**; v1.4.3 is still the latest
tag and `upstream/main` is still `b6cfe2bb`. The new work since 2026-10-29 is in "What release-1.4.4
added after 2026-10-29": **Modules** (switch whole parts of the app off), **Settings → Integrations**
and webhooks, a **Stats redesign** and a look-and-feel pass over every screen, an **F-Droid**
flavour, Wear OS as a beta, Garmin and Zepp OS watches. One new fork PR upstream (#931), none of
the open ones taken since; 152 PRs open upstream.

**Refreshed 2026-10-29.** v1.4.3 was tagged on 2026-10-26 (`7c8290ca`) and is merged (see the archive).
`release-1.4.4` (now `fef710b6`) has grown 96 commits past 45512b2f, see "What release-1.4.4 added
after 2026-10-26"; its milestone is now due **2026-11-08**. A new **`release-1.4.5`** (`d0a85546`,
21 commits on it, with the `wins-145`, `design-review-145`, `integrations-145` and `wear-os` stages)
is under `## Unreleased (v1.4.5)` in its CHANGELOG, see "What release-1.4.5 brings". The milestones
were re-planned, see the roadmap section. `upstream/main` is `b6cfe2bb`.

## What release-1.4.4 brings (2026-10-26, released in v1.4.4)

`release-1.4.4` (45512b2f, due 2026-11-15). Its v1.4.3 part is in [the archive](archive/PIPELINE-merged.md); these are
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

## What release-1.4.4 added after 2026-10-26 (2026-10-29, released in v1.4.4)

`45512b2f..fef710b6`, 96 commits. Also under `## Unreleased` in its CHANGELOG, so they ship with 1.4.4.

| Upstream item | Fork impact |
|---|---|
| **Each gym keeps its own equipment** (#808): plates, dumbbells, bars and machine stacks belong to an equipment profile | **Meets D28 / D62 / D67** (the fork's gyms are upstream's equipment profiles). The fork's gym filter and "Needs …" lines read the active profile's equipment: check they read the per-profile lists after the merge, and that D47's new gym (equipment copied from the active one) copies the new per-profile plates and stacks too. |
| **Rest timer fixes** (#853): the last set of an exercise rests, also before the next exercise's warm-ups; a per-side set's own rest is the pause between its sides | **Overlaps D70** (`hevier/lib/rest-extra.js`), which starts these rests itself. At the merge: drop the cases upstream now covers, or two rests start; keep the after-the-workout's-last-set one if upstream still has none. |
| **Timed holds that run themselves**: rest over, 3-2-1, the hold, logged at zero, its rest, round again (a switch in Settings → Workout) | **Meets D89** (the big countdown ring via ⏱) and D53's set timer. Check the switch drives the fork's `HevyWorkout`, or hide the row (`HIDDEN_ROWS`). |
| **Warm-ups that build themselves** (#156) and **your own warm-ups kept** in a routine (#525) | With #658 above: decide D69's seam S40 at the merge. D5's set-type sheet: check typed warm-ups keep their type. |
| **Freestyle settings mid-workout** (#910): No rule by default; the sheet says it repeats last time | Progression is off in the fork (D61, D69): check nothing new shows on the fork's exercise ⋮. |
| **Film a set**: a form video per set, from the camera or the gallery, played beside the set | Needs **`CAMERA`**, which D50 removed and D38's `apk-permissions.txt` does not list: the APK gate fails at the merge. Decide: drop the permission again (overlay `tools:node="remove"`) and hide the set menu row, or take it with its reason. The fork's set-type sheet (D5) has no Film row either way. |
| **NFC stickers**: tap to start today's workout, show the gym code, jump to a machine's exercise (`NFC` permission, an `NDEF_DISCOVERED` filter, App Links) | New permission and exported filters for D38's lists. The check-in it serves is hidden in the fork (D12); a machine sticker is near D28's machine labels. Hide the Settings row unless wanted. |
| **Android widgets you set up yourself** (streak, weight goal, this week, next workout, records, volume) and a streak with backup | **Meets D44** (the fork's widget). Keep one: compare at the merge. The streak's backup meets D59's streak. |
| **Siri, Shortcuts and Assistant** (`shortcuts.xml`, `voice_actions.xml`, a `meta-data` on every launcher alias) | App Actions on Android: check S7's manifest overlay and D24's portrait-only aliases still merge. |
| **Several weigh-ins a day, each with its time** (#859); a kind recovery hint on Home | D27 / D32's weigh-in flows are upstream's now: check D12's body-weight widget and D14's Measures read the timed list. |
| **Monthly challenges**, streak and challenges polish (medals, confetti), **Your year in openGym** (Dec–Jan), **a shareable workout card**, **Share a routine**, **Christmas** with an advent calendar and a festive app icon | Drawn on upstream's Home, Stats and summary. The fork's Home (D12) and summary don't show them; D59's streak is the fork's. Christmas: hide with Seasonal themes as Halloween; the festive icon is a ninth alias for S7's recolour check. |
| **Tour v2** with four tutorials; **tidier menus** (common actions first, the rest under More) | The tour stays off (the row above). The menus are upstream's ⋯, not the fork's ⋮. |
| **Imports** from Liftosaur, Liftoff, StrongLifts, Fitbod, JEFIT (#862); Strong's set order and notes | Upstream's import page: check D33's import map runs after them too. |
| **Back from a page opened from a sheet** (#837, the fork's PR) | At the merge: seam S47 goes. |
| Docker healthchecks (#844), cardio fatigue by duration (#841), barcodes at check-in (#854), Apple Health discard (#776) | Server, model or hidden screens: nothing to do. |

## What release-1.4.4 added after 2026-10-29 (2026-11-02, released in v1.4.4)

`fef710b6..1f15e1db`, 121 commits, `release-1.4.5`'s 33 included. All under `## Unreleased`, so they
ship with 1.4.4 on about 2026-11-08. The rows the fork must act on come first.

| Upstream item | Fork impact |
|---|---|
| **Modules** (`lib/modules.js`): Settings → Modules switches off Effort, Plates and warm-ups, Strength levels, Form videos, Watch, Gym check-in, Body, Health, Motivation, AI Coach, Integrations and Seasonal themes, with three presets; `S.modules` (`{ [id]: boolean }`, a missing key is on) syncs per key (`sync-merge.js` PER_KEY, `sync-stamps.js`); every upstream view asks `isOn(S, id)`; the preset choice is on the tour's first card | **The fork's screens don't ask `isOn`**, so a module switched off hides upstream's part and leaves the fork's: D6's effort column, D84's plate line (and its own switch, which "Plates and warm-ups" now overlaps), D19 / D81's strength levels (beside upstream's own, the 1.4.5 row above), D12's Home widgets and D14's Measures (Body), D27 / D79's heart rate (Health), D59's streak (Motivation), D44's widget. At the merge, decide: the fork's screens follow `isOn` for the modules they draw (a fork helper beside `settings.js`), or the Modules row goes into `HIDDEN_ROWS` and everything stays on (no key means on, so nothing changes for a profile that never opened it). With the tour off (1.4.4 row above), the onboarding preset choice never shows: check a fresh install still lands on every module on. Check D20's carry-through: `S.modules` is a new synced key, nothing for the fork to add. |
| **Settings → Integrations**: one page for Apple Health / Health Connect (their switches move here from Data & backup, which keeps a way in), the Hevy and file imports, CSV export, Coach, MCP; Garmin, COROS, Polar and friends as "works with" | **Meets D27 / D32** (the fork's Health Connect reads and "Weigh-ins from other apps" switch) and D30 / D31 / D34's Hevy API rows. Check the fork's rows still sit where its Settings (D16) put them and that the moved Health Connect switches still reach D27's plugin. The page's Hevy import card is upstream's importer, not D29 / D33's step after it: check the card opens the fork's flow. |
| **Webhooks** (`INTEGRATIONS=webhook`, api): signed, retried for about an hour, Home Assistant, n8n, ntfy, Node-RED; `INTEGRATIONS_ALLOW_LAN` | Server only, off unless set. D26's endpoint check and supply chain: new api code, no new dependency. Nothing in the fork's screens. |
| **A Stats redesign**: Overview, Body, Lifts and Effort with a sticky index; `#/stats?section=lifts` deep links; Home's weekly-sets line opens Stats on Lifts | **The fork owns `/stats`** (`hevier/routes.jsx`: its Statistics page, upstream's `Stats` only under `/stats/all`). Upstream's links to `/stats?section=…` land on the fork's page and lose the section: point them at `/stats/all?section=…` or drop the query. Check `/stats/all`'s `PhaseFilter` (D93) and `WithBack` still sit above the new sticky index, and D18 / D42 / D74's numbers beside its Muscles card. |
| **A look-and-feel pass over every screen** (P1 to P13): one rem type scale, `--surface-raised`, one pressed state per tier, a readable ink for the accent, Home's card headers, the end of a workout as one list, the routine editor's actions, the Library's filters in one sheet, empty states, settings previews as subtitles | **The largest CSS drift yet for `hevier.css` (D17, D49):** rem tokens move every size the fork's overrides were matched against, and new surface and ink tokens need the fork's dark values. Run the hevy-side-by-side and UX checks on every fork screen after the merge. The fork's own screens keep their layout; upstream's pages the fork shows (D16) change look. |
| **Cards and rows with a control of their own are no longer one big button** (`d7b8d939f`) | Upstream's `Row` and cards change their markup: check the fork's screens built on them (Settings rows, D12's Home cards, D14's Profile) still open on a tap, and seam S2 / S15 tests. |
| **F-Droid flavour** (`fdroid`, beside `sideload` and `play`): no Google Play services or ML Kit, a browser barcode scanner, no updater, Wear OS left out; fastlane metadata in 20 languages; `check-fdroid.sh` | A third `channel` flavour. `release-apk.sh` already builds `assembleSideloadRelease` by name, so D26 / D38's release keeps working; check S7's manifest overlay and the `src/hevier` resources don't break the `fdroid` variant's build or lint. The fork already drops ML Kit (D50), so nothing to take; D77's updater stays the fork's. |
| **Google Play build**: no donation links, a Play rating row, "plan B" without background location hiding the gym reminder (`ChannelPlugin`) | Play only. The fork is sideloaded: check the rating row and the hidden reminder never show in `sideload`. |
| **Wear OS ships in 1.4.4 as a beta** ("openGym Beta" on the watch), was the 1.4.5 row above | The same decision as that row, now at the 1.4.4 merge: D38's exported-components list, `play-services-wearable` in the phone APK (D26), the Gradle lockfile. |
| **Zepp OS (Amazfit) watches** through the server: `api/watch-relay.js`, `/api/watch/pair`, `redeem`, `links`, `unlink`, `snapshot`, `events`, `ack`, `box`, a scoped watch token; Settings → Zepp OS watch | api routes and a new token kind: D26's endpoint check. The Watch module covers it; hide the Settings row unless wanted. No APK change. |
| **Garmin Connect IQ app** (`garmin/`, Monkey C), the phone sends a cut-down snapshot when a Garmin is linked | Not in the APK; nothing for the fork until upstream ships its phone bridge. |
| **Sync: a save that changed nothing is not an edit** (`68a523f57`, `sync-merge.js`): an untouched save keeps its old stamp | Good for D20 (fewer stamp bumps on the fork's fields). Run the fork's sync tests at the merge; #925 (a workout saved with nothing changed no longer brings a deleted one back) is the same idea, still a PR. |
| **Exercise names in European Portuguese and Swedish** (5,632 each), Swedish a catalogue language | D73's shown names and D36's brand search read the name packs: check the search tests in pt and sv. |
| Privacy policy (health data as explicit consent, age 13 and over), a ticked set fades its parts not its number, Stats index fixes, Safari fallbacks | Upstream's pages and workout: nothing for the fork. D71's highlighted next set is the fork's own. |

## What release-1.4.5 brings (2026-10-29, released in v1.4.4)

`release-1.4.5` (`d0a85546`, due 2026-11-29 as "Google Play, F-Droid & integrations"). Most of it
meets something the fork already has. **2026-11-02:** all of it is in `release-1.4.4` now and ships
there, so these rows are 1.4.4 merge work too; the Wear OS row is a beta in 1.4.4 (the section above).

| Upstream item | Fork impact |
|---|---|
| **Every set against last time ↑ = ↓** (#907, the fork's issue, upstream's own build): in the workout and in History, weight then reps, the 1RM breaking a tie, assisted and holds handled; a Settings switch | **Replaces D66.** At the merge: Workout Detail calls upstream's helper instead of the fork's, and the fork's workout rows take the arrows if wanted (D66 had them only in Workout Detail). |
| **Strength level per lift** from published standards, your best estimated 1RM against your latest weigh-in, sex and age; a Stats card | **Meets D19 / D81**, which bundle no standards on purpose (the user types levels in). Decide at the merge: keep D19's, take upstream's, or show upstream's where D19 has none. |
| **A note on any set** (set menu → Note), under the row and in History, in the CSV and MCP | The fork's set-type sheet (D5) replaces upstream's set menu: add Note there, and show the note line in `HevyWorkout` and Workout Detail. |
| **Workouts left this week** on Home (#753), a weekly target for rotations | Upstream's Home: check D68's planned days count the same; the widget snapshot carries it (D44). |
| **Weekly sets per muscle against a target range**: a Stats card and an optional Home line | Counts by upstream's primary / helper weights, while D74 counts one main muscle per exercise: two different numbers for "sets per muscle". Decide whether to show it. |
| **Merge an exercise into another** (#656): history, routines, settings, aliases move, with Undo | Check the fork's fields move with it: `hvBrand` / `hvCable` on entries, `hvExUnit` (gone after 1.4.4's #657), D73's `hvShownName`, D45's backups (upstream's since 1.4.2), D28's machine labels, `hvStrength`. |
| **Spoken cues** (TTS, a `TTS_SERVICE` query in the manifest) | Check they fire from the fork's rest bar (D10, D70). |
| **Your week, your month** recap cards on Home | Upstream's Home: nothing appears in the fork's. |
| **Wear OS watch app** (`frontend/android/wear`, its own module; the phone gains `play-services-wearable`, an exported `WatchListenerService`) | Android, so it reaches the APK: D38's exported-components list, D26's supply chain (a Google Play services library in the phone APK), the Gradle lockfile (G1), the sideload flavour. Decide whether the fork ships it; D79's strap heart rate overlaps the watch's. |
| Design review (contrast, one label style), weekly-sets bar colour fallback | Upstream's tokens: check D17's overrides. |

## v1.4.5, planned, not built (2026-11-03)

**No code yet.** `release-1.4.5` (`11302d2d`) holds nothing past v1.4.4 and `upstream/main` is the
tag; no topic branch has commits past v1.4.4 but seven from about 2026-10-13, older work. What
follows is the plan: the v1.4.5 section of ROADMAP.md at the tag, and the milestone "v1.4.5:
Google Play, F-Droid & integrations" (due 2026-11-29: 30 open items, mostly community PRs).
**Judged from titles only**; upstream often writes its own version instead of merging a PR, so the
shape may change. Read the code here once `release-1.4.5` gets commits of its own.

**Already shipped in 1.4.4** (`release-1.4.5` was folded in): the F-Droid build (#325), Settings →
Integrations and webhooks, timed holds that run themselves (#490 as a PR is still open; upstream's
own version shipped), switching off features (#240, as Modules). Their fork answers are in
DECISIONS.md (D97, D100, D16's 1.4.4 note).

| Planned item | Fork impact |
|---|---|
| **A daily backup to Nextcloud or any WebDAV folder** (#582) | **Meets D20** (Google Drive through a sync app, no fork code) and S52's five copies (PR #4, not merged yet). If it lands, decide whether it replaces D20's sync-app route, and whether its copies follow S52's count. It would be an Integrations part (D102). |
| **Strava upload** (#478), **intervals.icu**, **FIT files** for Garmin, COROS and Suunto, **planned workouts as a calendar feed** | New Integrations cards: parts of the Integrations module (D102). Strava and intervals.icu reach outside the server: D26's endpoint check. The calendar feed reads the plan: check it agrees with D68's planned days. FIT export exists since 1.4.3; check it still carries the fork's fields cleanly. |
| **MCP over HTTPS with OAuth** (#314, #781: an opt-in `mcp` container at `/mcp`) and **scoped API tokens** (#480; `PLANNER_TOKENS`, #566) | Server and auth: new endpoints and token kinds for D26's endpoint and supply-chain gates. The fork's MCP use is upstream's. |
| **A sound for each kind of rest, a count-in you hear from a pocket, the volume buttons during a rest** (#165) | **D10 / D70's rest bar** is the fork's: wire it there, as spoken cues (D10's 1.4.4 note). The volume buttons need native code: check S17's plugin list and D38's exported components. |
| **Tempo per set** (#572, an issue) | A new set field: D5's set sheet and D15's table would need a place for it, and D3's PREVIOUS column a way to show it. A decision when it lands. |
| **A warm-up or cool-down that runs itself, as one card** (#775) | A workout-screen feature `HevyWorkout` would have to follow (CONFLICTS.md, silent drift); with D69's warm-ups and #610's phases. |
| **Choose which exercises to import from a CSV** (#849) | **Overlaps D33** (the review of an import's matches) and the fork's own #931: one review step, not two. If it lands first, rebuild D33's step on top of it and say so on #931. |
| **A session counts as done only when it has been** (#567, queue and rotation, app and reminder) | Training logic the fork reuses (rule 2): check D68's planned days, D98's Workouts left this week and the rotation chip on D13's Workout tab. |
| **Italian, Persian, Czech, Lithuanian, Vietnamese**, better Chinese names (#399, #513 to #518, #535, #576, #606, #499, #629) | Locale packs: take upstream's (rule C). The fork's own strings stay English; check D73's search and D36's brands with the new name packs. |
| **Google Play** (a closed test with 12 testers for 14 days first) | Store only; the fork is sideloaded. |
| Coach fixes (#387, #520, #537, #546) | The Coach is off in the fork (D11): nothing to do. |

