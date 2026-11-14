# Upstream pipeline: older notes, November 2026

Moved from [PIPELINE.md](../PIPELINE.md) on 2026-11-14, as written: the dated log of the fork's PRs
and issues up to 2026-11-06, and the snapshots that were weeks old by then. `hevier/tools/upstream-status.mjs`
prints the live state in their place. Remarks such as "see above" or "the table above" point at
PIPELINE.md as it was.

## The fork's PRs and issues upstream: the log from 2026-10-25 to 2026-11-06

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
milestones to shrink. **2026-11-12:** the milestones are exactly as on 2026-11-09, dates and open
counts alike, and ROADMAP.md on `release-1.4.5` has not changed. Refresh:

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
