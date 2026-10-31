# Upstream pipeline: what is merged

Moved from [PIPELINE.md](../PIPELINE.md) on 2026-10-31, as written: the refresh notes up to
2026-10-26 and the rows of v1.4.2 and v1.4.3, both merged. What is still to come stays there.

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

