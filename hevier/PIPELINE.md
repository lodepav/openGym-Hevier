# Upstream pipeline

What upstream has finished but not yet tagged, and what its roadmap plans, so the fork doesn't
build something that is already coming. Read this before starting a milestone, and refresh it after each `git fetch upstream`.

The refresh notes up to 2026-10-26 and the rows of v1.4.2 and v1.4.3, all merged, are in
[archive/PIPELINE-merged.md](archive/PIPELINE-merged.md).

**Refreshed 2026-10-29.** v1.4.3 was tagged on 2026-10-26 (`7c8290ca`) and is merged (see the archive).
`release-1.4.4` (now `fef710b6`) has grown 96 commits past 45512b2f, see "What release-1.4.4 added
after 2026-10-26"; its milestone is now due **2026-11-08**. A new **`release-1.4.5`** (`d0a85546`,
21 commits on it, with the `wins-145`, `design-review-145`, `integrations-145` and `wear-os` stages)
is under `## Unreleased (v1.4.5)` in its CHANGELOG, see "What release-1.4.5 brings". The milestones
were re-planned, see the roadmap section. `upstream/main` is `b6cfe2bb`.

```bash
git fetch upstream
git branch -r | grep release-                        # new release branches?
git show upstream/release-X.Y.Z:CHANGELOG.md | awk '/^## v1.4.1/{exit} {print}'   # since our base
```

## What release-1.4.4 brings (2026-10-26)

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

## What release-1.4.4 added after 2026-10-26 (2026-10-29)

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

## What release-1.4.5 brings (2026-10-29)

`release-1.4.5` (`d0a85546`, due 2026-11-29 as "Google Play, F-Droid & integrations"). Most of it
meets something the fork already has.

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

## Upstream's roadmap (ROADMAP.md, read 2026-10-18)

`ROADMAP.md` on upstream's main (last changed 2026-10-09) describes the themes; its version numbers
have slipped. The **GitHub milestones** are the live plan, a release every two weeks on a Sunday
(checked 2026-10-24, unchanged but for 1.4.3's name; checked again 2026-10-26, unchanged, though
the new ROADMAP.md on `release-1.4.4` makes 1.4.5 remote MCP and Google Play). **Re-planned by
2026-10-29:** 1.4.3 shipped (10-26) · **1.4.4 Programmes, tour & fixes** (11-08) · 1.4.5 Google
Play, F-Droid & integrations (11-29) · 1.4.6 Wear OS & Health Connect (12-13: body composition
#648, the Android widget #125 / PR #299, OIDC) · 1.4.7 progression engine & circuits (12-27: the v2
engine #186, ranges #154, %1RM #153, phases #57 / #610, distance #177, supersets and circuits) ·
1.4.8 search, catalogue & equipment (2027-01-10: the shoulder split **#638**, dual-cable stacks
#671, any plate weight #542) · 1.4.9 accounts · 1.4.10 trainer, Coach & MCP write · 1.4.11 looks,
social & goals · later: database storage. Refresh:

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
| **Session phases** and completion-only stretching kept out of volume and PRs (1.4.7, #57, #140; open PR #610) | `HevyWorkout` must follow; D18 / D42 counts and D51 records must leave those exercises out as upstream does. |
| **Progression engine** (1.4.7): a v2 training engine (#186, open PR #312), per-set rep/set ranges and AMRAP (#154), %1RM with a training max and target RPE/RIR (#153), 5/3/1 waves (#70), a warm-up generator (#156) | D15's table is drawn from today's single prescription: per-set ranges would need the table to edit rows one by one. D35's routine update, D34's routine export and D37's routine page read the same prescription. Expect the largest drift in `routine-table.js`. |
| **Assisted exercises as negative weight** (roadmap; #176 closed) | D51 treats the help as the weight (least help is the record) and D34 sends it as weight: follow upstream's sign at that merge. |
| **Cardio** (1.4.7): intervals, C25k, rucking, **distance for cardio** (#177, #169; roadmap) | D53's TIME column and set timer: add the distance column as upstream stores it; intervals may replace the count-up timer for those sets. |
| **Alternatives per routine slot** (#649, "when the machine is taken") | **Shipped in 1.4.3** as the one-tap backup (the table above): no per-gym choice, so D46 / D86 stay the fork's. |
| **Search your history, import aliases by name** (roadmap; the aliases shipped in 1.4.3, #624) | D33's import map and D36's brand search stay the fork's; D73 moves onto upstream's aliases (the table above). |
| **kg ↔ lb switching converts stored values** (roadmap; the per-exercise unit #657 is in `release-1.4.4`, see above) | D41 (per-exercise unit, stored in the profile's), D19 (`hvStrength` entries keep their own unit) and D28's labels: check the conversion leaves the fork's fields right, and that D41's `inc` is converted with upstream's. |
| **Android & health**: Health Connect sessions, an Android **home-screen widget** (1.4.6, #125; PR #299; 1.4.4 already brings configurable widgets), logging a set from the lock screen, the **timer rework** (#165), **media cached for offline** (#123) | Widget: D44 is the fork's; if upstream ships one, keep one. Timer rework: D10's Timer / Stopwatch and D53's set timer. Offline media: D50 left the media (90% of the APK) alone; upstream's cache may let the fork stop bundling it. |
| **Looks** (1.4.11): skins, wallpapers, a big-screen layout (#129, #134, #135); **social** (PR #180) | D17 (one dark look) and D49's page bars: skins stay unoffered, like the accent. Social: D14's Profile and Hevy's feed. |
| **Body composition** in measurements: fat %, muscle mass and more (1.4.6, #648) | D31 maps Hevy's `fat_percent` to body fat and leaves lean mass out for want of a field: add it to the Hevy import when #648 brings one. |
| **CSV export** (1.4.3, #647) | Check it carries the fork's entry labels (`hvBrand`, `hvCable`) or leaves them out cleanly; D34's Hevy export is separate. |
| Accounts (password, OIDC), trainer role, MCP write, the iOS app | No fork impact expected (iOS out of scope). |

## The fork's PRs and issues upstream (2026-10-24, checked 2026-10-25 and 2026-10-29)

On 2026-10-25 upstream closed #672, #677, #690, #694, #736, #766, #767 and #768 unmerged: each
came into 1.4.3 through `release-1.4.3`, and the maintainer's closing comment says so. Checked
commit by commit against the branch the same day: everything is in **except #672's last commit**
(below). #754 is still open, though its commit came in with #766; #735 is still open, upstream
having written its own version into 1.4.3 (`8727ee090`); #788 and #806 are open, not in the branch; #807 offers #672's last commit again.

**2026-10-26:** #735 and #754 are closed (covered in 1.4.3). #788, #806, #811 and #812 are in
`release-1.4.4`, still open until it ships, and so is #814's commit; the maintainer will retarget
#813, #814 and #815 to `main` once 1.4.3 is out. #813 and #815 are not in any branch yet.

**2026-10-29:** #837 is merged into `release-1.4.4`. #807, #813 and #815 now target `release-1.4.4`
but are not in it; #814 still targets `release-1.4.3`. The issue #907 (D66's arrows) is built by
upstream in `release-1.4.5`. The new PRs #901, #902, #905, #906 target `release-1.4.4`, none in it
yet. #638 (the shoulder split) is on the v1.4.8 milestone.

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
| #807 | #672's last commit: Hevy templates mapped by their artwork (D29) | Open, retargeted to `release-1.4.4`; not taken yet |
| #811 | Ask before logging a likely typo (D90's weight and rep checks) | Open; in `release-1.4.4` |
| #812 | How long each exercise takes (D88) | Open; in `release-1.4.4`, a Stats card without the fork's Muscle and Gym grouping |
| #813 | An exercise kept out of progression is kept out of the statistics, a deload routine's still counted (D57) | Open, retargeted to `release-1.4.4`; not in it yet |
| #814 | A default progression rule for the profile (D61, D69) | Open, still on `release-1.4.3`; its commit is in `release-1.4.4` already |
| #815 | More from the Hevy API import: notes, rest and rep ranges, measurements, routine links, muscles (D31) | Open, retargeted to `release-1.4.4`; not in it yet |
| #837 | Back from a page opened from a sheet keeps its place (S47) | Merged into `release-1.4.4` |
| #901 | Explorer: equipment by group, each opening on its kinds (D63; PR 1 of 3, then a gym checklist by group, then muscle groups after #900) | Open, on `release-1.4.4` |
| #902 | A picked exercise starts the way it was logged last time (D55, D75, S32) | Open, on `release-1.4.4` |
| #905 | A search filtered by a gym says how many it hid (D67) | Open, on `release-1.4.4` |
| #906 | All done? for a workout left running (D60) | Open, on `release-1.4.4` |
| #900 | Muscle filter: pick a group, or open it into its muscles (D64) | Issue open, no answer |
| #903 | Show one of an exercise's other names as its name (D73, S41) | Issue open, no answer |
| #907 | Mark each set against the same set last time (D66) | Issue open; **built by upstream in `release-1.4.5`** |
| #638 | Split shoulders into front, side and rear delts (D65) | Issue open; no answer since the fork's comments of 2026-10-19 and 2026-10-21; on the **v1.4.8** milestone |

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

## Other forks (2026-10-17, rescanned 2026-10-21 and 2026-10-26)

**Rescan 2026-10-26:** 1,869 forks; 387 pushed since 2026-10-21, 109 of them ahead of upstream's
main, with ~950 commits of their own since then. Again mostly deployments (Passenger, Workers,
GitHub Pages), rebrands, health hubs, habits, water and drinks, friends and social, liquid-glass
themes, Coach, remote MCP over OAuth (four forks: upstream's 1.4.5 plans its own) and a Go
backend. What touches the fork:

| Fork · commit | What | Fork item |
|---|---|---|
| nicosagasti/openGym `092355060` (on `12b7504fd`, its own D35) | "A backup used today is not a change": a swap to one of the slot's planned backups doesn't ask to update the routine, and Update leaves that slot as it was | **Check D35 against D45 / D46 / D86:** `routine-update.js` knows nothing of backups, so a gym's swap (D46, D86) or a backup picked from ⋮ likely counts as "1 swapped" and Update would replace the slot for good. **Done** 2026-10-26: a swap to a planned backup is no change (D35) |
| nicosagasti/openGym `bf46aaa46` | The workout screen no longer re-renders on every rest tick (it took all of `useUI`) | Not needed: `HevyWorkout` already selects only `s.timer` |
| michaelportale/openGym `11f4d4193` | Share your week as an image card, from the workout share card's layout | Near D87 (workout and monthly report cards): a week card is a small step if wanted |
| michaelportale/openGym `3d6ea904b` and its streak fixes | A rotation streak counting sessions, with rest passes and **pauses** (a holiday doesn't break it) | Near D59, whose one week off does the same without a pause button: nothing to take |
| michaelportale/openGym `80a7fb5dc` | The rest countdown as a ring beside the clock, pulsing at Ready | D10 / D70's rest bar is Hevy's: not taken |
| michaelportale/openGym (a11y) | Workout sheets keyboard-accessible, text zoom allowed, 4.5:1 small text | UX STANDARDS' A rules already cover these: a lens for the next UX round |
| omer-go/openGym `b31af9fad`, `5a1fda6de` | A short quiet rest sound as the default, no 3-2-1 before the end | Upstream's rest alert: nothing to take |
| omer-go/openGym (catalogue, stats) | More muscle roles (arms, legs, core), movement patterns and one-sided flags; muscle balance by group | Still **near D74 / D64** and #788, which is now in 1.4.4 |
| omer-go/openGym, orbenda83/openGym `1938d7efa`, `c2fa3e49e` | Holds timed, one-sided lifts per side; completed and routine exercises first in the library | Done as D55 / D75 (upstream 1.4.3); a "recent first" picker order is an idea, not Hevy's (Hevy sorts by name) |
| tibi-iorga/openGym, WostPT/PerForm, Kinau-Guatemala/openGym | Health Connect: daily steps, runs, walks and rides read in; weigh-ins with their time and a 7-day average | Beyond D27; upstream 1.4.3 brings the weekly rate. Nothing to take |
| Hugo-Mllr/Biscotos | Programs: routines grouped under a name (PPL) | Done as D13's folders; upstream 1.4.4's Programmes too |
| DylanQ/openGym | Fitbod-style display names over the catalogue | Done as D73's shown name |
| edoardo-rva/openGym | Routine overview, failure-set controls | Done as D37 and D5's F sets |
| rplusautomation/openGym | The rest's end buzzes a strap instead of a push | Near D79; standard heart-rate straps can't buzz, nothing to take |
| czepter/openGym, NicolaiGoon/openGym | Jefit import | Not Hevy: upstream's importer |

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
