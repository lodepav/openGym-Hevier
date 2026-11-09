# Upstream pipeline

What upstream has finished but not yet tagged, and what its roadmap plans, so the fork doesn't
build something that is already coming. Read this before starting a milestone, and refresh it after each `git fetch upstream`.

The refresh notes up to 2026-11-08 and the rows of v1.4.2, v1.4.3 and v1.4.4, all merged, are in
[archive/PIPELINE-merged.md](archive/PIPELINE-merged.md).

**v1.4.4 is merged** into the fork (#5, 2026-11-03), and the fork's PRs that came after it (#3,
#4, #7, #11, #14) are in `hevier/main` at `5bb06f501` (2026-11-08): D97, D98, D99, D101, D102, D5's
Note, D45's suggestions, D37's Share, the `hevier.css` restyle and D100's Wear OS link left out of
the APK are built. The v1.4.4 notes and rows are in the archive.

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

**Before merging v1.4.5**, decide (DECISIONS.md, a new "openGym 1.4.5" section, next free D103):
which fork features step aside for upstream's own version of the fork's PRs (S19, S20, S32, S34,
S37, S41 may go), what to do with per-gym numbers (#988) against D28, D82 and D96, the new set
fields (bands, colour tags, tempo, distance, resistance level) in the fork's set rows, the Garmin
SDK and the new permissions in the APK (D38, D100), and the one-green default against D17's Hevy
blue. Weigh the merge as for 1.4.4: seams removed against what the fork must hide.

```bash
git fetch upstream
git branch -r | grep release-                        # new release branches?
git show upstream/release-X.Y.Z:CHANGELOG.md | awk '/^## v1.4.1/{exit} {print}'   # since our base
```

## What release-1.4.5 brings (2026-11-09, `e8f028cd`, not tagged yet)

Read from its CHANGELOG (`## Unreleased (v1.4.5)`, 450 lines) and the Android build files. **No
new npm dependency** in `frontend`, `api` or `mcp`. The upstream files the fork has seams in that
1.4.5 changes: S1, S2, S3, S6, S7, S8, S9, S11, S16, S17, S19, S20, S29, S32, S34, S37, S40, S41,
S44, S51, S52, S54 and S55, so expect conflicts in most of them. The rows the fork must act on come
first.

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
social & goals · later: database storage. **Checked 2026-11-02:** the milestones and their due dates
are unchanged (1.4.4 33 open items, 1.4.5 30, 1.4.6 17, 1.4.7 24, 1.4.8 14, 1.4.10 6, 1.4.11 12;
1.4.9 and 1.4.12 have no open items), though 1.4.5's F-Droid and integrations, and 1.4.6's Wear
OS, are already in `release-1.4.4`. What is left for 1.4.5 is Google Play's closed test, Strava,
FIT, intervals.icu, WebDAV backups and remote MCP; for 1.4.6 Health Connect sessions, body
composition and the Android lock screen. **2026-11-03:** v1.4.4 is out; its milestone still shows 25 open
items (the fork's five PRs above among them) and the tag's ROADMAP.md still says "in TestFlight, out
around 2026-11-08", both from before the release. **2026-11-09:** the milestones keep their
dates (1.4.5 2026-11-29 with 36 open items, 1.4.6 12-13 with 16, 1.4.7 12-27 with 23, 1.4.8
2027-01-10 with 13, 1.4.10 6, 1.4.11 11; 1.4.9 and 1.4.12 none open), but `release-1.4.5` already
holds much of 1.4.6 to 1.4.12: body composition and the Android widget (1.4.6), circuits, distance
and new progression rules (1.4.7), the shoulder split (1.4.8), OIDC (1.4.9), trainers, the Coach
and MCP write (1.4.10), share cards and levels (1.4.11) and Garmin (1.4.12). Expect the later
milestones to shrink. Refresh:

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

## The fork's PRs and issues upstream (2026-10-24, checked 2026-10-25, 2026-10-29, 2026-11-02, 2026-11-03, 2026-11-06, 2026-11-08 and 2026-11-09)

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

**2026-11-02:** nothing changed for the open PRs: #788, #806, #811 and #812 are in `release-1.4.4`
(by commit message, as upstream applies them with edits), #807, #813, #815, #901, #902, #905 and #906
are in no branch, and #814's commit is in. One new PR, **#931**. The issues #900 and #903 have no
answer; #638 is still on v1.4.8; #907 ships with 1.4.4 (upstream's build, its CHANGELOG credits
the fork for the idea).

**2026-11-03, v1.4.4 released.** Checked against the tag, by commit message (upstream applies the
fork's commits with edits) and by the changelog's credits. **In v1.4.4:** #788, #806, #811 and #812
(each "thanks @lodepav" in the changelog), #814 (its commit is in the tag; the changelog names no
default rule) and #837 (merged on 2026-10-27), and the issue #907, built by upstream and credited
to the fork for the idea and the first version. On GitHub #788, #806, #811, #812 and #814 still read
open on the v1.4.4 milestone: after 1.4.3 upstream closed the fork's PRs by hand a day after the
release (2026-10-25), so expect the same. **Not in v1.4.4**, and on no milestone: #807, #813, #815,
#901, #902, #905, #906 and #931, none answered yet; the next release is v1.4.5 (due 2026-11-29). The
issues #900 and #903 have no answer, #638 is still on v1.4.8.

**2026-11-06:** as expected, upstream closed #788, #806, #811, #812 and #814 by hand on 2026-11-03,
on the v1.4.4 milestone (closed, not merged, as it applies them with edits), and the issue #907 the
same day. Nothing else moved: #807, #813 and #815 last changed on 2026-10-28, and #901, #902, #905,
#906 and #931 and the issues #900 and #903 have no comment at all. None of them is on a milestone,
and **none is on v1.4.5** (2026-11-29; 39 items, mostly locales, Coach, MCP over HTTPS and timer
PRs). Upstream `main` since the tag holds only fixes (tests, CI, the Coach's programme week #982,
@hono/node-server 2.1.6), already merged into the fork. **To watch:** #849 (choose which exercises
to import from a CSV) **is on v1.4.5**. It overlaps #931 and D33: if it ships first, rebuild D33's
review on it and say so on #931, or close #931. New on 2026-11-05: the fork's comment on **#988**
(per-gym and per-brand tracking, RobinRHL's issue, no milestone) pointing at D28, D82, D51, D96,
D46, D86 and D47 as code to copy; the issue has had one more comment since.

**2026-11-08:** nothing moved. No comment or state change on any of the fork's PRs or issues, #988
unchanged since 2026-11-05 (no milestone), #849 still on v1.4.5 and #638 on v1.4.8.

**2026-11-09:** `release-1.4.5` builds nearly everything the fork still had open upstream: #807,
#813, #815, #902, #905, #906 and #931 (with #849), and the issues #900, #903, #638 and #988, each
credited in its changelog. GitHub still shows them open; upstream usually closes them by hand when
it tags. Only **#901** (equipment by group) is not in it. After the tag, close what is released with
a thank-you, and decide whether #901 is still worth offering.

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
| #807 | #672's last commit: Hevy templates mapped by their artwork (D29) | **Built in release-1.4.5** (credited); still open on GitHub |
| #811 | Ask before logging a likely typo (D90's weight and rep checks) | **Released in v1.4.4** (credited); closed 2026-11-03 |
| #812 | How long each exercise takes (D88) | **Released in v1.4.4** (credited), a Stats card without the fork's Muscle and Gym grouping; closed 2026-11-03 |
| #813 | An exercise kept out of progression is kept out of the statistics, a deload routine's still counted (D57) | **Built in release-1.4.5** (credited); still open on GitHub |
| #814 | A default progression rule for the profile (D61, D69) | **Released in v1.4.4** (its commit; the changelog doesn't name it); closed 2026-11-03 |
| #815 | More from the Hevy API import: notes, rest and rep ranges, measurements, routine links, muscles (D31) | **Built in release-1.4.5** (credited); still open on GitHub (notes, rest timers, rep ranges) |
| #837 | Back from a page opened from a sheet keeps its place (S47) | **Released in v1.4.4** (merged 2026-10-27): seam S47 goes at the merge |
| #901 | Explorer: equipment by group, each opening on its kinds (D63; PR 1 of 3, then a gym checklist by group, then muscle groups after #900) | Open; **not in release-1.4.5** either, though its muscle half (#900) is: rebase or close it after the 1.4.5 tag |
| #902 | A picked exercise starts the way it was logged last time (D55, D75, S32) | **Built in release-1.4.5** (credited); still open on GitHub |
| #905 | A search filtered by a gym says how many it hid (D67) | **Built in release-1.4.5** (credited); still open on GitHub |
| #906 | All done? for a workout left running (D60) | **Built in release-1.4.5** (credited); still open on GitHub, grown into Forgotten workouts (45 minutes, finishes by itself) |
| #931 | Import: check each exercise's match before importing, and remember the pick (D33) | **Built in release-1.4.5** (credited); still open on GitHub, together with #849 as one "Check and choose" step |
| #900 | Muscle filter: pick a group, or open it into its muscles (D64) | Issue open; **built in release-1.4.5** with #885 (credited) |
| #903 | Show one of an exercise's other names as its name (D73, S41) | Issue open; **built in release-1.4.5** as Shown as (credited) |
| #907 | Mark each set against the same set last time (D66) | Issue closed 2026-11-03; **built by upstream, released in v1.4.4** (credited): it replaces D66 at the merge |
| #638 | Split shoulders into front, side and rear delts (D65) | Issue open, on the v1.4.8 milestone, but **built in release-1.4.5**: three delts and the lats apart, in every muscle map |
| #988 | Per-gym and per-brand tracking for the same exercise (RobinRHL's issue; D28, D82, D51, D96, D46, D86, D47) | Issue open; **built in release-1.4.5** as Numbers per gym, with the fork's brand-as-label design credited |

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

**New since 2026-10-24 that meets the fork** (2026-11-02, titles only, 152 PRs open)

| PR | What | Fork item |
|---|---|---|
| #866 | Lengthened partials as a set type | **D5's set-type sheet**: a new type would need a row there and a mark in `HevyWorkout` and Workout Detail |
| #909 | Supersets of 2+ exercises, choose who leaves, warm-up order | `HevyWorkout`'s superset handling would need to follow |
| #879 | Workout end and Finish: cheer on to one more, suggest the extras you add most | Near D10's finish flow and D35's "Update routine?": the fork's finish is its own |
| #849 | Choose which exercises to import from a CSV (v1.4.5 milestone) | Near D33 and #931: one review step, not two |
| #874 | Android: the running workout as one notification, with Log set and Live Updates (#760) | D10 / D70's rest bar and D44; check the notification's actions reach the fork's session |
| #872, #871, #873, #830 | The tab bar on the right edge of a wide screen, a Settings choice for where it stands | **D11's `HevyTabBar` (S2)** is the fork's own; D24 keeps portrait, so nothing to take |
| #954 | Each muscle's share as a percentage on the exercise detail | D74 / D76's main muscle on the fork's details (D7, D58): two answers to "what does this train" |
| #941, #952, #956, #957 | Progress photos: dates, a gallery, an overlay camera, compare side by side | Upstream's Body pages, reached from D14's Measures: take as it lands |
| #925 | Sync: a workout saved with nothing changed no longer brings a deleted workout back | D20, with 1.4.4's `68a523f57` above |
| #864 | The right warm-up hint for assisted exercises | D51's assisted records read the help as the weight: check the hint agrees |
| #942, #960, #880 | MCP: log cardio, create and update routines, read through the api | The fork's MCP use is upstream's; nothing to take |
| #823, #824, #825 | The progression engine in three pieces (v1.4.7) | **D15's routine table** and D69: the drift the roadmap table above names, now as three PRs |

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
