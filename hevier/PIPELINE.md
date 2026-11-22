# Upstream pipeline

What upstream has finished but not yet tagged, and what its roadmap plans, so the fork doesn't
build something that is already coming. Read this before starting a milestone, and refresh it after each `git fetch upstream`.

The refresh notes up to 2026-11-08 and the rows of v1.4.2, v1.4.3 and v1.4.4, all merged, are in
[archive/PIPELINE-merged.md](archive/PIPELINE-merged.md).

The fork's own PRs and issues upstream, live: `node hevier/tools/upstream-status.mjs` prints each
one's state, milestone, base branch and the upstream branch that already carries it (`--open`,
`--json`). The older dated log, the roadmap read of 2026-10-18, the open-PR lists of 2026-10-16
and 2026-10-21 and the other-forks scans are in [archive/PIPELINE-2026-11.md](archive/PIPELINE-2026-11.md).

**v1.4.5 is merged** into the fork (2026-11-14, tagged the same day; branch `sync/v1.4.5`). The
fork's own code for what upstream now has is gone (D103): Forgotten workouts replaces D60's All
done?, Check and choose replaces D33's import review (the fork's matches, per-side sets and brand
labels still run under the user's picks, S19), `lib/counted-log.js` replaces D57's helper, Shown as
replaces D73's shown name. Seams S23, S32, S39, S41 and S56 went, S34 and S19 shrank, S60 (no
microphone, D106) and S61 (All statistics without the new screens, D109) came. What D109 and D104
leave out is hidden: the Journal, Tools, Your month, daily form, levels, deload weeks, Numbers per
gym, Community, the Wear OS and Zepp pages. Garmin is in the APK and Watch is a module again
(D106). Every routine opens as before the merge (`routine-check.sh`: no difference). **Still to
build on top, each its own branch:** D105 (the new set fields in the fork's set row), D108 (upstream's routine folders, favourites, a
routine from a past workout, Start picks), D111 (rest before the next exercise, text size).
D107 (Pause, the next exercise after the rest, the trophy switches) is built (2026-11-20). D112 (the profile picture) is built, at the top of Settings since D126 took the Profile tab away. The rows hidden until then are in `HIDDEN_ROWS` (`hevier/lib/settings.js`).
The fork's PRs and issues that 1.4.5 released (#807, #813, #815, #902, #905, #906, #931, #900,
#903) were closed 2026-11-14; #901 is still open.

**Checked 2026-11-20: no v1.4.6 tag yet.** `release-1.4.6` is at `da62470d3` (2026-11-17), 60
commits past v1.4.5, merges included (117 files, about 2,800 lines added); `upstream/main`
(`e4a68a94c`) has only two doc commits past the tag. No new npm dependency in `frontend`, `api` or
`mcp`. What it brings and means for the fork is in "What release-1.4.6 brings" below. The fork's
issue #1089 was closed 2026-11-18 with cubetes's #1201 in the branch; nothing else of the fork's
moved (see the PR section).

**v1.4.4 is merged** into the fork (#5, 2026-11-03), and the fork's PRs that came after it (#3,
#4, #7, #11, #14) are in `hevier/main` at `5bb06f501` (2026-11-08): D97, D98, D99, D101, D102, D5's
Note, D45's suggestions, D37's Share, the `hevier.css` restyle and D100's Wear OS link left out of
the APK are built. The v1.4.4 notes and rows are in the archive.

**Checked 2026-11-12: still no v1.4.5 tag.** `release-1.4.5` moved to `4df89397b` (2026-11-11,
iOS build 70, Android versionCode 44): 153 commits since the last check, 797 past v1.4.4 (4,238
files, about 399,000 lines added). They are release QA: watch sync (Wear OS, Garmin, Apple Watch),
the live widget, right-to-left layouts, accessibility and server fixes, with no new npm dependency
and no manifest change. What meets the fork is in "Since 2026-11-09" under "What release-1.4.5
brings". `upstream/main` (`50ab7f24e`) gained three Cloudflare failover commits for the website,
nothing for the fork. **Nothing moved on the fork's PRs and issues**: no comment, no close, no
milestone. The fork itself is at Go Hevier 2.7.0 (2026-11-11) with D114 (more of the fork in
Modules), D115 (the lean APK that downloads its pictures) and D116 (Android 13 and later); the
1.4.5 round (D103 to D113) still waits for the tag.

**Checked 2026-11-09: v1.4.5 is about to be tagged.** `release-1.4.5` (`e8f028cd`, 2026-11-09) is
633 commits past v1.4.4, with the version strings already at 1.4.5 (`pretag-146`: iOS build 65,
Android versionCode 39, Helm chart 0.2.4, the API reference rebuilt). Its milestone is still due
2026-11-29 with 36 open items, but the branch is ready to tag. It is **the biggest release yet**
(4,125 files, about 383,000 lines added, most of it locales, the catalogue, watches and the
website), and it **builds most of what the fork offered upstream**: #807, #813, #815, #849, #900,
#902, #903, #905, #906, #931, #988 and #638 are in its changelog with the fork credited, though
GitHub still shows them open. What it brings and what it means for the fork is in "What
release-1.4.5 brings". `upstream/main` (`8fb98b16`) has nothing new since 2026-11-04 (11 README
and fix commits past the tag, merged with v1.4.4).

**Decided 2026-11-09: the 1.4.5 decision round is done** (DECISIONS.md, "openGym 1.4.5", D103 to
D113). Upstream's versions of the fork's PRs replace the fork's (D103: S19 shrinks, S32, S34, S41
go); numbers per gym stay the fork's (D104); every new set field gets a place in the set row
(D105); the APK keeps Garmin and leaves out the microphone (D106); Pause, the next exercise after
the rest and the record trophy join the workout (D107); routine folders move onto upstream's (D108);
the new screens stay out (D109); upstream's workout notification comes beside D44 (D110); D17's
blue must survive upstream's new green default (a check, no decision). After the tag, **#901** is
rebased onto 1.4.5's muscle-groups explorer and pinged once.

```bash
git fetch upstream
git branch -r | grep release-                        # new release branches?
git show upstream/release-X.Y.Z:CHANGELOG.md | awk '/^## v1.4.1/{exit} {print}'   # since our base
```

## What release-1.4.6 brings (2026-11-20, `da62470d3`, not tagged yet)

Read from its CHANGELOG (`## Unreleased`, 26 entries) and a trial merge into `hevier/main`
(`git merge-tree`). Two files conflict: `lib/update.js` (S6) and `views/Stats.jsx` (S34, S61).
Everything else merges by itself, though 1.4.6 changes files that hold these seams: S3, S7, S9 to
S14, S17, S19 to S22, S24, S26, S27, S36, S43, S46, S49 to S51, S58 to S62, S65, S67 to S69.

| Upstream | Fork impact |
|---|---|
| **Home and Stats: Customize** (#1119): show, collapse, hide and reorder each card, from the end of either page or Settings → Look & Home; synced in the profile. Stats keeps a card in its own part (Overview, Body, Lifts, Effort) | **Conflicts with S61** in `Stats.jsx`: the cards are now a list, so `hooks.statsOff`'s filter (the daily form card) has to move into it. **Meets D142**: the fork's Statistics has its own Arrange, and upstream's Stats is the fork's All statistics. **Open for the user:** keep upstream's Customize on All statistics, or hide it with its Settings row (`HIDDEN_ROWS.look`), as Today's fixed layout (D134) already hides upstream's Home cards. |
| **A fork's build names its update repository** (#1254, `VITE_UPDATE_REPO`, `updateRepo()`) | **Conflicts with S6**, which does the same plus the `gohevier-v` tags and the debug build's no-check. Take upstream's `updateRepo()`; S6 keeps only `tagVersion` and `NO_CHECK`. |
| **Typing a weight or reps no longer writes the whole profile** (#1089, #1201) | The fork's own issue. The fork's set row types through the same store, so check on the emulator that a typed value is still saved after a tick and on leaving the app. |
| **No overscroll stretch, no page scrollbar on Android** (#1177) | Meets the fork's own scroll and sticky page bar (D49): check the pages that pin a bar. |
| **Timed per-side rows use the L and R badge under 480 px** (#1239) | Upstream's workout screen; the fork draws its own (D72). Nothing to do. |
| **Spoken cues announce the first set and each circuit member** (#1210) | Taken as is; the fork's rest panel reads the same `spoken-cues.js` (`dock-next.js`). |
| **Stats: a rotation's planned sets follow Workouts per week** (#1249) | Upstream's Planned sets on All statistics. Nothing to do. |
| **Body CSV import fills a day instead of skipping it** (#1206), **FitNotes inch marks** (#1106) | Taken as is; both auto-merge in `import-csv.js`. |
| **Android: the rest's end sound plays with the app open** (`900ac8c62`, `RestAlert.java`) | **Meets S51** (the strap's line in the rest notification): auto-merges; check the rest's end on the emulator. |
| **F-Droid build shrunk with R8**, the updater reading SHA256SUMS | The fork builds `sideload` only; the updater fix comes with the S6 merge. |

**Nothing for the fork:** the Coach fixes (Coach off), API tokens and gym check-in cards, the
calendar feed, the routines library, Garmin's 36 new watches, the Apple Watch rest screen, chart
and body map screen-reader text (upstream's charts), Indonesian and Bengali wording.

## What release-1.4.5 brings (2026-11-09, `e8f028cd`; rechecked 2026-11-12 at `4df89397b`; tagged and merged 2026-11-14)

Read from its CHANGELOG (`## Unreleased (v1.4.5)`, 450 lines) and the Android build files. **No
new npm dependency** in `frontend`, `api` or `mcp`. The upstream files the fork has seams in that
1.4.5 changes: S1, S2, S3, S6, S7, S8, S9, S11, S16, S17, S19, S20, S29, S32, S34, S37, S40, S41,
S44, S51, S52, S54 and S55, so expect conflicts in most of them. Counted by file on 2026-11-12 (any
seam in a file 1.4.5 changes, whether or not the change is near it), these join them: S10, S12,
S13, S14, S15, S21, S22, S23, S36, S38, S39, S45, S48, S49, S50, S56, S57 and S58, most of them
in `sheets.jsx`. The rows the fork must act on come first.

**Since 2026-11-09** (153 commits, read from the commit subjects and the changelog's 11 new lines):

| Upstream | Fork impact |
|---|---|
| **Sheets are dialogs** (`1cf8fef93`): named, focused when they open, Tab kept inside, focus back to the opener; **screen readers** name set fields, settings switches and the rest timer's 15 s buttons | `sheets.jsx` holds 13 of the fork's seams, so this is where the merge conflicts gather. The fork's own sheets and `HevyExerciseBlock`'s set fields should get the same names and focus (STANDARDS' A rules): a point for the UX round after the merge. |
| **Sideways strips never scroll vertically** (`0c2650485`): one shared rule in `index.css`, and `strips.test.js` fails a new `overflow-x` strip left out of it | The test reads upstream's CSS. Check the fork's strips in `hevier.css` (filter chips, the Home cards) against the same rule by hand. |
| **Workout screen polish** (`c587add30`, `8ae999f76`): 44 px steppers and tick targets, focus rings, chip press states; a per-side weight at Largest text no longer clips | Upstream's workout screen, which the fork replaces. The same checks belong in `screens.mjs` at Largest text (the D17 row below). |
| **Exercise settings: Sets stops at 50, Reps at 1000** (`5919214bd`) | Meets D90's typo checks and D15's routine table: use upstream's limits there too, so a typo cannot build a 999-row workout from the fork's editor. |
| **Exercise history: Best and PR use the assistance-aware comparison** (`617a15b7d`) | **Meets D51** (the help is the weight, least help is the record): check both agree on an assisted exercise after the merge. |
| **Leg press and hack squat no longer credit the calves** (#1034, `7b890962d`) | **Meets D74**: the catalogue's targets change under the fork's main-muscle rules; rerun `hvVolume`'s counts for those two. |
| **A paused workout lets the screen sleep** (`0e2ecc24e`) | Comes with D107's Pause: the fork's keep-awake must let go too. |
| **Log set from the notification on a per-side exercise ticks the open side** (`20ac492fe`); starting a workout no longer opens Android's "Alarms & reminders" (`86ca315f4`) | **D110** (upstream's workout notification beside D44) and D72 (right side first): the open side is the fork's order. The exact-alarm fix is taken as is. |
| **Settings → Wear OS watch on Android** (`93c8dc65c`), and Modules' Watch module names Garmin (`e211b1288`) | **D100 and D106**: Wear OS is out of the APK, so the new page is hidden with it; Garmin stays, so its Settings page and the Watch module do too (D102's part list). |
| **Weekly cardio goals** of your own, per activity, in minutes, distance or sessions (`d25bfe539`) | Upstream's Stats card; D109 keeps the new screens out. Nothing to build. |
| **Backup import: a broken row no longer takes Home, History and Stats down** (`9f5299033`) | Taken as is; the fork's Home and History read the same rows, so check a broken row there once. |
| Watch sync (a set logged at the wrist is never dropped, the rest counts from the tick at the wrist), the live widget on iOS, Garmin link recovery, right-to-left set rows and charts, light-theme contrast, account delete clearing Coach and library data, a rate limit on the connector sign-in | Nothing for the fork, beyond `watch-sync.js` staying upstream's. |

The rows below are from 2026-11-09 and still hold.

**The fork's own PRs and issues, built by upstream** (credited in the changelog):

| Upstream's version | Fork impact |
|---|---|
| **Forgotten workouts** (#906): "Still training?" after 45 quiet minutes (30, 60, 90 or Off), Keep going or Finish, a workout that finishes itself at the last set plus its rest, reopen for 24 hours; "left the gym" asks at once | **Replaces D60** ("Still training?" after five hours). Decide whether the fork takes upstream's whole (it is the fork's PR, grown) and drops its own prompt, so there are not two. |
| **Start as last logged** (#902) | **S32 goes**: drop `hooks.defaultMode` and the fork's D55/D75 picked-exercise code where upstream now does the same. |
| **Shown as** (#903): an exercise goes by one of its other names everywhere, exports keep the title | **S41 goes, D73 moves onto upstream's**: the fork's shown-name field becomes upstream's; carry the stored choice over once, with a test in `upgrade/`. |
| **The gym filter says how many it hid** (#905) | **D67's fork code goes** for upstream's. |
| **Muscles by group** (#885, #900): several muscles, any or all, a group opening into its muscles | **Meets D64 and S37**: check whether the fork's muscle filter can be upstream's now. #901 (equipment by group, D63) is **not** in 1.4.5. |
| **Shoulders split into front, side and rear delts, lats apart from the upper back** (#638), in every muscle map, the balance, Weekly sets per muscle and recovery | **Replaces D65** (the split in the muscle filters only). The fork's body diagram, Weekly sets per muscle (#14) and `hvVolume` counts follow the new muscles; custom exercises tagged Shoulders count for all three. |
| **Check and choose before an import** (#931, #849): every exercise and what it becomes, a pick remembered, untick exercises, narrow dates | **Replaces D33** (S19's review). One review step, upstream's; keep only what D29's brand labels and one-limb sets need. |
| **The Hevy API import keeps notes, rest timers and rep ranges** (#815) | **Most of D31** is upstream's now. Check what is left for S20: D30's folders (upstream has its own routine folders, below), measurements, routine links, muscles. |
| **Hevy templates mapped by their artwork** (#807, 429 of them) | **D29's fixed matches** shrink to what upstream still misses. |
| **An exercise kept out of progression is kept out of the statistics** (#813) | **S34 goes** if upstream's matches D57 (records too: check). |
| **Numbers per gym** (#988): an exercise keeps separate numbers per gym, last time and the next weight from the gym you are at, the same brand at another gym shares them, History gets an All gyms chooser | **The biggest decision.** Overlaps D28 (gyms as equipment profiles, a brand per gym), D82 (PREVIOUS from the same machine), D96 (History comparing two labels), D46 / D86 (slot backups per gym) and D47 / D51 (records). Upstream took the fork's brand-as-label design: map `hvGym` / `hvBrand` onto upstream's fields with a one-time migration, or keep the fork's and hide upstream's switch. |

**New things that meet the fork's screens** (the fork draws the workout, so each needs a place):

| Upstream | Fork impact |
|---|---|
| **New set fields**: resistance bands per set (chips, levels), colour tags per set (six colours and shapes), tempo per exercise or set with a rep guide, cluster sets, planned drop-sets, carries and sleds by distance, cardio by distance (#887), a resistance level for bikes and rowers, a cardio effort chip | **D15's table and `HevyExerciseBlock`** draw the set row: each field needs a column or a chip there, or stays hidden on purpose (D100-style). Colour tags meet D5's set marks (W, H, the Note); distance meets D53's TIME column; bands meet D3's PREVIOUS. |
| **Records on the set**: a trophy as you tick it, "how close to a record" before a set, rep records 1 to 12 | D51's records and the fork's PR marks in the set row: one trophy, not two. |
| **Pause a workout** (#976), **Next exercise when the rest ends** (#1017), **rest before the next exercise** (#487, #1020), **one weight step for everything** | Pause and the next exercise need a place in D10's header and D70's rest bar (the fork's rest after every set). The global step meets the fork's per-exercise unit step (`exercise-menus.js`, D41). |
| **Start picks** (#930), **preview before starting** (#976), **routine from a past workout** (#1010), **favourite routines** (#327), **routine folders** with Archive | D13's Workout tab and `RoutinePreview` are the fork's: decide whether they take these. **Routine folders meet D13's and D30's `folder`**: one field, upstream's, with a migration. |
| **Backups suggested on other kit** and "Ask the Coach for a swap" (#1003), a backup's own plan (#978) | **Meets D45's suggestions** (built in #11): keep one source of suggestions, upstream's. |
| **The live widget v2 and one Android workout notification** (#874, a Live Update on Android 16) with Log set and Next exercise | **Meets S51 and D91** (the strap's line in the rest countdown's notification): S51's Java lands in upstream's rewritten notification. **Meets D44** (the fork's calendar widget): upstream's widget logs sets now. |
| **Text size in six steps** following the phone's | **Meets D17** and the fork's screens at 130 % font (`screens.mjs`): rerun it at Smallest and Largest. |
| **One green**: new installs start in openGym green, the real logo everywhere | **Meets D17** (Hevy blue only): check that a new install still gets the fork's blue. |
| **Modules** gain parts (Effort, Bands, the new features) | **D102 and S54**: the fork's part switches and `hiddenModules` list. |
| **Journal, daily check-in, deload weeks, levels, skill ladders, Build a session, Tools, Your month, circuits / AMRAP / EMOM player, recovery sessions, activities from other apps** | Upstream screens the fork reaches through upstream's Stats or Plan, or not at all. Each is a D100-style choice: offer it, or leave it out of the fork's UI. The check-in and the circuit player start from the workout, which is the fork's. |
| **Profile picture, badges, streak rules and the calendar's streak marks** | D14's Profile header and D12's Home cards: show upstream's picture and level, or not. |
| **Sticker and photo share cards, card colours** | D37's Share (built in #11) shares a routine; the workout share is upstream's. |

**Android build and release** (D26, D38, D100):

| Upstream | Fork impact |
|---|---|
| **Garmin's closed Connect IQ SDK** in the sideload and Play builds (`src/ciq/java`, `ciq-companion-app-sdk`) | **D100's `hevier.gradle` block** removes the Wear OS library: decide whether Garmin goes too (Zepp is out already), and add the SDK to D26's supply-chain list if it stays. |
| **The Wear module is optional** (`settings.gradle` includes `:wear` only if the folder exists) and **openGym Offline**, a third flavour without INTERNET | D100 may get simpler. The offline flavour is upstream's; the fork builds `sideload` only. |
| **New permissions**: RECORD_AUDIO (your own voice clips), MODIFY_AUDIO_SETTINGS, POST_PROMOTED_NOTIFICATIONS, and ten Health Connect reads (sleep, HRV, steps, body composition, exercise) | **D38's permission allow-list** (`hevier/security/`) fails until each is allowed or removed in the fork's manifest overlay. RECORD_AUDIO is the one to ask the user about. |
| **Security**: GHSA-656w-p99j-x8hf and GHSA-699c-6p5r-q574 (sync and media landing in the account you switched to) | Take as is: the fork's account switching is upstream's. |

**Nothing for the fork**: the Coach and "Use your subscription" connectors (D11, Coach off), MCP over
HTTPS and API tokens, OIDC, trainers and gyms, the community library, WebDAV backups (meets D20's
sync-app route; it can stay off), Strava, the calendar feed, the Apple Watch, Wear OS and Garmin
redesigns, Danish, Bengali, Czech, Persian, Indonesian, Lithuanian and Vietnamese (take upstream's
locales, rule C), the website and the routines library.

## The fork's PRs and issues upstream (2026-10-24, checked 2026-10-25, 2026-10-29, 2026-11-02, 2026-11-03, 2026-11-06, 2026-11-08, 2026-11-09, 2026-11-12, 2026-11-14 and 2026-11-20)

**2026-11-08:** nothing moved. No comment or state change on any of the fork's PRs or issues, #988
unchanged since 2026-11-05 (no milestone), #849 still on v1.4.5 and #638 on v1.4.8.

**2026-11-09:** `release-1.4.5` builds nearly everything the fork still had open upstream: #807,
#813, #815, #902, #905, #906 and #931 (with #849), and the issues #900, #903, #638 and #988, each
credited in its changelog. GitHub still shows them open; upstream usually closes them by hand when
it tags. Only **#901** (equipment by group) is not in it. After the tag, close what is released with
a thank-you, and decide whether #901 is still worth offering.

**2026-11-12:** nothing moved, so the table below stands as written. No comment, close or milestone
on any of the fork's PRs or issues since 2026-11-09 (only #1084 is merged), and none of the open
ones (#901, #1085, #1090, #1091, #1092, #1097, #1098) is in `release-1.4.5`'s 153 new commits. The
timezone and shuffled-order failures of #1083 are not fixed there either. #988, #1022, #1034 and
#1042 are unchanged, though #1034's leg press and hack squat fix is in the branch. The maintainer
is in release QA (five builds in three days), so expect answers after the tag.

**2026-11-14:** two of the fork's issues now have a PR by cubetes built on them, each crediting
the fork. **#1083 → #1197**, merged into `release-1.4.5` on 2026-11-14: tests only, the timezone
fix the fork found (local dates in the streak, Community and Stats tests) plus the 19
shuffled-order failures; the fork closed the issue with thanks the same day, and `upstream-pr/streak-tz` is not needed any
more. **#1089 → #1201**, open on `release-1.4.5`: `persist` asks whether the workout moved (start,
finish, a set or exercise added or removed, a tick), typed values wait the usual 800 ms, the line
the issue drew; when it merges, compare it with the fork's own handling. #1087 is only listed as
related in #1105 (the Settings tidy-up), nothing built. The other issues (#1077 to #1082, #1088,
#1093, #1159) have no answer, no PR and nothing in the branch (`02996aae7`). None of the fork's
open PRs moved since 2026-11-12. The three small ones went out as PRs the same day, each built
on `release-1.4.5` with upstream's suite green: **#1213** (for #1079), **#1211** (for #1082) and
**#1214** (for #1159), rows below. Still issues only, waiting for an answer: #1077, #1078, #1080,
#1081, #1087, #1088 and #1093.

**2026-11-20:** every open PR was rebased onto `release-1.4.6` on 2026-11-15. New since the table
below: **#1235** and **#1237** (a switch per module part, an Exercise settings module; D102, for
#1087 and #1236), **#1293** (a day planned in the Calendar trains what was picked; D124), **#1361**
(a Timer and a Stopwatch in the header; D10, for #1078), **#1362** (Health Connect as the only
source of weigh-ins; D32, for #1088), and on 2026-11-18 **#1374** (warm-ups left unrated; D120),
**#1375** (the cardio clock; D53), **#1376** (Finish offers the routine every change; D35) and
**#1377** (an opt-in rest between sides; D70). None has a maintainer comment, review or milestone;
only CodeRabbit has answered. #1089 is closed (#1201 is in `release-1.4.6`). The live list is
`node hevier/tools/upstream-status.mjs --open`.

**#815 against upstream's own version** (`8a91a9c34`, 2026-11-06, "idea by @lodepav"; no comment
or review on the PR itself): taken are the workout and exercise notes, a routine's rest timers and
its rep ranges. **Left out:** the body measurements beside the weight, the routine a workout was
done from, a custom exercise's muscles and equipment from its template (and filling in an earlier
import's), and the hint when the Hevy account shows the other unit. Folders were never in #815.
The routine links and the folders are offered as #1158 (table below); the other three stay the
fork's at the 1.4.5 merge (D31). **Not worth offering after all:** D90's "under a third of last
time" check is already upstream's (`typo-check.js`), and its cardio-timer check needs D53's
count-up timer, which upstream does not have.

| # | What | State |
|---|---|---|
| #672 | Hevy titles land on the exercise Hevy's own artwork shows (D29) | Closed, 3 of its 4 commits in `release-1.4.3`. **Not taken:** the last, "map Hevy templates to the exercise their own artwork shows" (`fc5ba8450`, pushed after the review), which regenerates `hevy-id-map.js` from the thumbnails: 429 of Hevy's 451 templates mapped, where 1.4.3 has 297, so 132 still import as custom and 78 land elsewhere. **Offered again as #807** (2026-10-25, on `release-1.4.3`, regenerated there: 429 of Hevy's 503 templates mapped, 1.4.3's own title rows kept), the maintainer told why |
| #677 | Chart x-axis labels never repeat a date or a month | Closed, in `release-1.4.3` |
| #690 | Imports keep converted weights to the hundredth, Hevy notes keep line breaks (D40, D54) | Closed, in `release-1.4.3` |
| #694 | A plank or a wall sit starts as a timed hold (D55) | Closed, in `release-1.4.3`, with #717's cardio defaults, for fresh picks only |
| #735 | An exercise's rest wheel opens on the default rest (D56) | Closed; upstream's own version is in `release-1.4.3`, with its "No timer" |
| #736 | A one-arm or one-leg exercise starts per side (`pickedExerciseConfig`, D75) | Closed, in `release-1.4.3` (its rename commit too) |
| #754, #766, #767, #768 | Dependency bumps: Vite and Vitest past their CVEs, in-range bumps, mcp on zod 4, `@capacitor/assets` through npx (S44) | All closed; all four in `release-1.4.3` (#766 with #769) |
| #788 | Each exercise filed under the muscle it is known for (D74's catalogue targets) | **Released in v1.4.4** (credited); closed 2026-11-03 |
| #806 | The release gate's CVEs: body-parser, fast-uri, zod, ip-address 10.7.4, happy-dom 21 (S44) | **Released in v1.4.4** (credited); closed 2026-11-03 |
| #807 | #672's last commit: Hevy templates mapped by their artwork (D29) | **Released in v1.4.5** (credited); closed 2026-11-14 |
| #811 | Ask before logging a likely typo (D90's weight and rep checks) | **Released in v1.4.4** (credited); closed 2026-11-03 |
| #812 | How long each exercise takes (D88) | **Released in v1.4.4** (credited), a Stats card without the fork's Muscle and Gym grouping; closed 2026-11-03 |
| #813 | An exercise kept out of progression is kept out of the statistics, a deload routine's still counted (D57) | **Released in v1.4.5** (credited); closed 2026-11-14 |
| #814 | A default progression rule for the profile (D61, D69) | **Released in v1.4.4** (its commit; the changelog doesn't name it); closed 2026-11-03 |
| #815 | More from the Hevy API import: notes, rest and rep ranges, measurements, routine links, muscles (D31) | **Released in v1.4.5** (credited); closed 2026-11-14 (notes, rest timers, rep ranges) |
| #837 | Back from a page opened from a sheet keeps its place (S47) | **Released in v1.4.4** (merged 2026-10-27): seam S47 goes at the merge |
| #901 | Explorer: equipment by group, each opening on its kinds (D63; PR 1 of 3, then a gym checklist by group, then muscle groups after #900) | Open; **not in release-1.4.5** either, though its muscle half (#900) is: rebase or close it after the 1.4.5 tag. Asked on the PR 2026-11-12 whether the groups are wanted at all, with the gym checklist by group as the follow-up |
| #902 | A picked exercise starts the way it was logged last time (D55, D75, S32) | **Released in v1.4.5** (credited); closed 2026-11-14 |
| #905 | A search filtered by a gym says how many it hid (D67) | **Released in v1.4.5** (credited); closed 2026-11-14 |
| #906 | All done? for a workout left running (D60) | **Released in v1.4.5** (credited); closed 2026-11-14, grown into Forgotten workouts (45 minutes, finishes by itself) |
| #931 | Import: check each exercise's match before importing, and remember the pick (D33) | **Released in v1.4.5** (credited); closed 2026-11-14, together with #849 as one "Check and choose" step |
| #900 | Muscle filter: pick a group, or open it into its muscles (D64) | Issue closed 2026-11-14; **released in v1.4.5** with #885 (credited) |
| #903 | Show one of an exercise's other names as its name (D73, S41) | Issue closed 2026-11-14; **released in v1.4.5** as Shown as (credited) |
| #907 | Mark each set against the same set last time (D66) | Issue closed 2026-11-03; **built by upstream, released in v1.4.4** (credited): it replaces D66 at the merge |
| #638 | Split shoulders into front, side and rear delts (D65) | Issue open, on the v1.4.8 milestone, but **released in v1.4.5**: three delts and the lats apart, in every muscle map |
| #988 | Per-gym and per-brand tracking for the same exercise (RobinRHL's issue; D28, D82, D51, D96, D46, D86, D47) | Issue open; **released in v1.4.5** as Numbers per gym, with the fork's brand-as-label design credited |
| #1077 | Security gates before a release: the advisories each release fixed from the one before, Trivy and gitleaks over every tag, and six gates to suggest (D26, D38; `release-check.sh` offered as the example) | Issue opened 2026-11-09; PRs for the dependency and secret gates offered |
| #1078 | A Timer and a Stopwatch in the workout, for time that is not a set (D10) | Issue opened 2026-11-09; port offered |
| #1079 | Exercise settings during a workout keep their changes on close (D92) | Issue opened 2026-11-09; **PR #1213** (2026-11-14, on `release-1.4.5`, branch `upstream-pr/settings-keep-on-close`, `4c439fcfb`, suite green): `exConfigSheet`'s `opts.autosave`, the sheet saves on unmount only when what it would store differs from when it opened. S50 goes when merged. Two of upstream's `Workout.noprog` tests pressed Save there and were adapted. CodeRabbit: an exercise unit changed by a sync while the sheet is open looked like an edit (fixed 2026-11-14, the comparison runs before the unit conversion); second round: a unit switched in the sheet itself looked like one too (four more rounds, settled in `2d4f864b9`: the loads are compared per unit, or as stored where a unit has no baseline, and everything else with the opening; reviewed with no actionable comments, all threads resolved) |
| #1080 | A Bluetooth heart-rate strap recorded live (D79, D80); asks plugin or hand-written service | Issue opened 2026-11-09 |
| #1081 | Cable setups 1:1, 2:1, ×2 (D43) | Issue opened 2026-11-09 |
| #1082 | Search by machine brand, on #988's brands (D36) | Issue opened 2026-11-09; **PR #1211** (2026-11-14, on `release-1.4.5`, branch `upstream-pr/brand-search`, `639766dbf`, suite green): `lib/brand-search.js` on upstream's `S.exGym` brands and `entry.brand`, wired in the picker only (the Library and the explorer offered). CodeRabbit: "l ife" matches Life Fitness through the whole-query match (not changed: that match keeps the hit while a brand is typed; answered on the PR 2026-11-14). If merged, D36's picker search can move onto it once the fork's brands are upstream's (D104 keeps them the fork's for now) |
| #1083 | release-1.4.5 fails the UTC+14, Los Angeles and shuffled-order robustness runs (seen on #901; the streak weeks a day early east of UTC) | Issue opened 2026-11-09; the timezone failures are test-only (UTC dates in the tests), fix on `upstream-pr/streak-tz`, commented. **Fixed by cubetes's #1197**, merged into `release-1.4.5` on 2026-11-14 (credited); the fork closed the issue 2026-11-14 |
| #1084 | The updater falls back to the API's asset link (S56) | **Merged into release-1.4.5** (2026-11-09): S56 went with the 1.4.5 merge |
| #1085 | Right side first for a per-side exercise (D72), as `sideOrder: 'RL'` on the target | PR opened 2026-11-09 on release-1.4.5 |
| #199 | Comment: the main muscle per exercise (D76) as one piece of editable built-ins | Commented 2026-11-09 |
| #1087 | A switch for each part of a module (D102); asks to agree the part list first | Issue opened 2026-11-09 |
| #1088 | Health Connect as the only source of weigh-ins while reading from it (D32) | Issue opened 2026-11-09 |
| #1089 | Each keystroke in a live workout writes the whole profile to the file mirror at once (`workoutMoved`): 75 ms write + 9 ms localStorage per keystroke, 423 KB profile, emulator | Issue opened 2026-11-09; **cubetes's #1201** (2026-11-13, open on `release-1.4.5`, credited) builds it as the issue suggested, so no PR from the fork |
| #1090 | Zepp toolchain npm overrides (S55): 62 findings to 0, tests and build unchanged | PR opened 2026-11-09 on release-1.4.5; drops S55 when merged |
| #1091 | Auto-backup: choose how many copies to keep (5, 14, 30 or 60; S52) | PR opened 2026-11-09 on release-1.4.5; drops S52 when merged (the fork sets 5) |
| #1092 | Android back goes up a page the app opened when the WebView says canGoBack false (reproduced on release-1.4.5's own build, Settings → Data & backup) | PR opened 2026-11-09 on release-1.4.5; S16 keeps only the fork's tab list when merged |
| #1093 | A set of a reps exercise as a timed hold (D89, S48) | Issue opened 2026-11-09, offering a PR; S48 goes if upstream builds it |
| #1097 | History rows and workout details name the workout's gym, with two gyms or more (D94) | PR opened 2026-11-09 on release-1.4.5 |
| #1098 | A newer APK offers itself when the app opens, once per version, About's question with Not now (D77) | PR opened 2026-11-09 on release-1.4.5; replaces the fork's UpdateNotice when merged. CodeRabbit (2026-11-12): the check on coming to the front asks again after an hour, an offer held back by a workout or an open sheet is made after, an update started from About counts as offered (all fixed; the fork's own UpdateNotice already stays off an open sheet, but keeps the session's answer and does not make a held-back offer until the next return to the app) |
| #1156 | The seconds wheel in steps of 5, a Settings choice (D48, S28): branch `upstream-pr/wheel-step`, `a664d632a` | PR opened 2026-11-12 on release-1.4.5 (Built on release-1.4.5 on 2026-11-12, upstream's suite green). Drops S28 when merged. CodeRabbit: the spinbuttons announce the shown duration (fixed 2026-11-12) |
| #1157 | Weekly sets per muscle: count main muscles only, off by default (D42): branch `upstream-pr/main-muscle-sets`, `3e805404e` | PR opened 2026-11-12 on release-1.4.5 (Built 2026-11-12, suite green). Upstream already counts a supporting muscle 0.4, so only the switch is new. CodeRabbit: a logged generic shoulder counts all three heads (fixed 2026-11-12) |
| #1158 | Hevy API import: workouts filed under their routine and Hevy's routine folders (D30, D31, S20), and since 2026-11-12 the rest of #815's leftovers (D31, S21): body measurements, custom exercises' muscles and equipment with the backfill, the account's unit: branch `upstream-pr/hevy-links-folders`, `8708b5194` | PR opened 2026-11-12 on release-1.4.5, extended the same day (suite green). CodeRabbit's four findings: three fixed (a 20 s limit on the optional reads, a session links only its nearest workout, a time-zone-proof test), the fourth (count updated routines in the toast) declined as upstream's own behaviour. S20 and S21 go when merged |
| #1159 | An equipment profile's body weight as a tick of its own (D62, S36): unticked, the filter hides body-weight exercises; a profile saved before counts as ticked | Issue opened 2026-11-12; **PR #1214** (2026-11-14, on `release-1.4.5`, branch `upstream-pr/bodyweight-tick`, `b0eb87967`, suite green): a saved profile carries `bwV: 1`, `bodyWeightOf(p)` in `lib/equipment.js`, the starter plans' fit follows, the Coach does not yet (said on the PR, offered as a follow-up). CodeRabbit: a custom body-weight exercise that needs your own kit follows the kit, in the library (`36af22d4e`) and in the starter fit (`0df4e42de`, second round), both fixed 2026-11-14; reading kit in the starter fit at all was declined as its own change. The fork's D62 mark must be mapped onto `bwV` at that merge; S36's body-weight half goes |
| #1161 | A routine's **Repeat last workout** switch (D69, S40): `routine.startFromLast`, the profile's "Your last session" for one routine with no rule, on upstream's own from-last path: branch `upstream-pr/routine-repeat-last`, `fbd00b6e5` | PR opened 2026-11-12 on release-1.4.5 (suite green). CodeRabbit: bands stay as last time and the MCP preview keeps a deload routine's numbers (fixed), back-off sets still apply (declined, as under the profile's setting). If merged, check whether D69's `hvProg` off can become upstream's switch on: upstream's fill copies the last set into a set not done and has no grey values, which D69 kept its own fill for |

**New since 2026-11-06 that meets the fork** (2026-11-08, titles only, none on a milestone)

**2026-11-09:** most of these are in `release-1.4.5` now, see "What release-1.4.5 brings": #1010
(routine from a past workout), #1017 and #1020 (next exercise after the rest, rest before the next
exercise), #1021 (the duration after a break), #1011 and #1012 (carries and sleds by distance),
#1016 (your own kit), #1009 (rename a custom measurement), #1040 (the contrast fixes), #1014,
#1018, #1019, #1023, #1035 and #1039. Still open: #1022, #1034, #1042.

| # | What | For the fork |
|---|---|---|
| #1022 (issue) | Routine variants: choose a gym without advancing a separate rotation | **Meets D28, D46 and D86**: the fork's answer is one routine whose slots swap to each gym's backups. Worth a comment pointing at them, as on #988. |
| #1034 (issue) | Many exercises with the wrong muscles | **Meets D74** and the fork's #788 (released in 1.4.4) and #638. If upstream fixes catalogue targets, recheck D74's name rules for custom exercises. |
| #1010 (PR) | Create a routine from imported workouts | Upstream's plan and import pages: check D33's import review and D15's routine table read a routine made this way. |
| #1017, #1020 (issues) | Auto-advance to the next exercise after the last rest; a longer rest between exercises | **Meet D70** (`rest-extra.js`, the fork's rest after every set): if built, the fork's rest bar must not start a second rest. |
| #1021 (issue) | A workout's duration sometimes saved far shorter than the session | Upstream's finish; D60 and D88 read the same times, so a fix there is the fork's too. |
| #1011, #1012 (issues) | Sled exercises logged as distance | Catalogue modes: D55's picked-exercise defaults would follow upstream's. |
| #1016 (issue) | Custom equipment | Meets D62's gym equipment filter, if built. |
| #1009 (issue) | Delete or rename custom body measurements | Upstream's Measurements, which D14's Measures reads. |
| #1036 (issue) | The Settings tour's spotlight lands wrong | Nothing: the tour is out of the fork (D100; the preset choice stays, D97). |
| #1040, #1042 (PRs) | Five contrast fixes; press feedback (quick in, slower out, hold shrink, star pop) | **Meet D17** (`hevier.css`): the fork's own colours and press styles may need the same, or win over them. |
| #1024 to #1033, #1041, #1028 | Wear OS fixes, iPhone Liquid Glass | Nothing: Wear OS is out of the fork (D100), and iOS is not built. |
| #1008, #1023, #1026, #1039 | Chinese, Bangla, Japanese, Danish | Locales: take upstream's (rule C). |
| #1013, #1014, #1015, #1018, #1019, #1025, #1032, #1035, #1037 | Tennis, Health Connect steps, video markers, Coach effort and streaming, a web image crash, Nix, first-launch language | Server, Coach, health or packaging: nothing for the fork. |

**New since 2026-11-09 that meets the fork** (2026-11-12, titles only, none on a milestone, 193 PRs open)

| # | What | For the fork |
|---|---|---|
| #1117 (issue), #1118 (PR) | The finish summary says "Next time: 0 kg · a bit lighter" with progression off and no weight in the routine | **The fork's D85** (no "Next time" without progression) hides this already. If #1118 lands, check D85 still wins, or drop it for upstream's line. |
| #1121 (issue), #1132 (PR) | The CSV import ignores AM/PM: Hevy workouts get 0-minute durations or start 12 hours early | **Meets D33 and the Hevy import the fork uses.** Check the user's Hevy CSV for it (workouts after noon, D88's durations); if it shows, the fix is upstream's importer, so follow #1132 rather than patching the fork. |
| #1105 (issue), #1120, #1122, #1123, #1126, #1127, #1129 (PRs) | Settings tidied in steps: the first screen in four headed groups, one Watches row, headings, one home for files and backups, search finding every row | **Meets D16** (the fork's Settings in five groups) and S11 / S12: expect conflicts there, and decide at that merge whether the fork's groups move onto upstream's. |
| #1134 (PR) | Move an exercise from one routine to another | D15's routine table is the fork's: a Hevy-like idea to take only if it lands. |
| #1142 (issue), #1144 (PR) | The admin panel and Settings loop on back; pop the history instead of pushing | Near the fork's #1092 and S16 (Android back): two fixes to the same history, read #1144 before rebasing #1092. |
| #1140, #1141 (issues) | Exercise facets against set-level modifiers; commonality ranking in search | Near D43's cable setups (#1081) and D28's brands as labels on a set, and the picker's order (Hevy sorts by name). Watch, nothing to build. |
| #1115 (PR), #1111 (issue) | A cardio interval measured by time, distance or calories; flights or steps for the stepmill | D53's TIME column and D105's set fields: one more field for the set row if it lands. |
| #1133 (issue) | Several sets within a superset cause progression | Nothing: progression is off in the fork (D61, D69). |
| #1139, #1143, #1149, #1151, #1100, #1107, #1108 | Watches: set types from the wrist, Wear OS rest timer, a link sign, Apple Watch pages | Nothing: Wear OS is out of the APK (D100), iOS is not built. |
| #1135 to #1138, #1145 to #1148, #1150, #1099, #1152 | Coach and ChatGPT, MCP, webhooks | Nothing (D11, Coach off). |
| #1103, #1102, #1116, #1119, #1125, #1106, #1112, #1113, #1128, #1130 | Share cards, Your year, Stats tile order, heart rate in the .fit file, FitNotes, Apple Health, Focus mode | Upstream's screens: nothing for the fork. |
