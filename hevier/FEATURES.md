# What Go Hevier adds to openGym

Each fork feature is listed once, with the decision that describes it in [DECISIONS.md](DECISIONS.md) and one of these marks:

| Mark | Meaning |
|---|---|
| **Fork** | Belongs to the fork only. It is Hevy's look, it concerns Hevy, or it is a choice that only suits the fork. |
| **Offer** | A general improvement that upstream's own UI would benefit from. It could be offered as an issue or a pull request, with the user's go-ahead (RULES.md: `hevier-upstream/<topic>`). |
| **Offered** | Already offered upstream. The issue or PR number is given. |
| **Ported** | Built ahead of an upstream release that already has it. Upstream's version replaces it at that merge. |

A row with a seam number (S52) in place of a decision is a small change that has no decision of its own; [SEAMS.md](SEAMS.md) describes it. The marks were last checked against upstream's `release-1.4.5` on 2026-11-12.

Upstream's training logic stays as it is: progression, 1RM, recovery, sync and storage. Where the fork behaves differently, it wraps upstream's helpers rather than changing them.

## Workout

| Feature | D | Mark |
|---|---|---|
| Hevy's set table as the only workout layout | D1 | Fork |
| Prefilled values in grey until touched, as placeholders | D2 | Fork |
| The plate line under a set off by default, a switch in During a workout | D84 | Fork |
| "Next time" on the finish summary only for a routine with progression on | D85 | Fork |
| PREVIOUS column: last time's set, tap to copy; a missing set is read from an older session | D3 | Fork |
| No ± steppers; values typed on the number pad | D4 | Fork |
| Set-type sheet (W / F / D labels), with drops nested under their set | D5 | Fork |
| Effort column, only when RIR/RPE is on | D6 | Fork |
| Hevy exercise block: notes, rest line, + Add Set | D7 | Fork |
| Progression guidance behind ⋮ (Exercise settings), nothing about it on the card | D8 | Fork |
| Swipe left deletes a set, with undo | D9 | Fork |
| Header: duration, ⏱ Timer/Stopwatch, Finish → Save Workout → "Nice work!" | D10 | Fork |
| The ⏱ Timer remembers its last time and counts down on a ring | D10 | Offered (#1078, issue: a Timer and a Stopwatch in the workout) |
| Live PR trophy on the set as it is ticked, with a toast | D22, D51 | Fork (upstream 1.4.5 has its own trophy at the tick; one trophy, not two, at the merge, D107) |
| "Update routine?" prompt after a workout that changed the routine | D35 | Offer (upstream 1.4.3's #592 keeps added exercises) |
| Weight unit per exercise (e.g. one machine in lb) | D41 | Ported (upstream's #657, released in v1.4.4, replaces it at the merge: decided 2026-11-03) |
| TIME column with a count-up timer for cardio and holds | D53 | Offer (upstream 1.4.5 runs timed holds by themselves, but has no count-up timer on a cardio set) |
| Workout note at the top of the workout and on the feed cards | D54 | Fork |
| An exercise last logged as holds starts as one (upstream starts its catalogue holds timed since 1.4.3, #694) | D55 | Offered (#902, built in release-1.4.5; upstream's replaces the fork's at the merge, D103) |
| An exercise last logged per side starts per side (upstream does one-limb lifts since 1.4.3, #736) | D75 | Offered (#902, built in release-1.4.5; upstream's replaces the fork's at the merge, D103) |
| Duration wheels in 5-second steps | D48 | Offered (#1156, as a Settings choice of 1 s or 5 s; S28 goes when merged) |
| "Still training?" after five hours | D60 | Offered (#906, built in release-1.4.5 as Forgotten workouts, after 45 quiet minutes; it replaces D60 at the merge, D103) |
| A rest after every set, including one side and the last set; Ready clears itself | D70 | Offer (upstream 1.4.5 adds a rest before the next exercise, #487, #1020; not after one side) |
| The next set to do is highlighted | D71 | Fork |
| Per-side exercises can be done right side first, remembered per exercise | D72 | Offered (#1085) |
| Add Exercise asks where: Insert after the current exercise, or Add to end | D78 | Fork |
| A timed hold as a set type of a reps exercise (a per-side set too, a hold on each side), shown as a time in history; a big countdown clock for every hold | D89 | Offered (#1093, issue: the hold set) |
| A tick asks first when a weight or rep count is over double the exercise's best or under a third of last time's (a likely typo), or a cardio timer was left running | D90 | Offered (#811, released in v1.4.4 on 2026-11-03: the weight and rep checks, too high and too low; the cardio timer is the fork’s, as upstream has no count-up timer to forget, D53) |
| One notification for the rest countdown and the heart-rate strap, the bpm in the card's header | D91 | Fork |
| A live workout's Exercise settings save as they close, with Done instead of Save | D92 | Offered (#1079, issue) |
| OpenBite's phase on saved workouts, and a filter by it on the statistics pages, exercise history and workout feed | D93 | Fork |
| The gym on the feed card | D94 | Offered (#1097, History rows and details) |
| Strength in the current phase, shared with OpenBite | D95 | Fork |
| Two brands' session histories of an exercise side by side | D96 | Fork |

## Routines

| Feature | D | Mark |
|---|---|---|
| Hevy's routine editor table drawn from openGym's prescription | D15 | Fork |
| Routine page (read-only) before the editor | D37 | Fork |
| Routine folders, long-press reorder | D13 | Fork |
| Planned backups for a routine exercise: the fork's ⋮ → Backups sheet and "Your backups" over upstream 1.4.2's field | D45 | Fork |
| A gym's backups: the swap made at a gym is reused there | D46 | Offer (upstream 1.4.3 offers a slot's backups in the workout's ⋯, #649; not learned per gym. Upstream's issue #1022 asks for routines per gym: a comment could point here) |
| Missing at a gym: a routine starts with the first backup the gym has; backups in priority order | D86 | Fork |
| Progression off by default; a per-routine switch for progression and auto warm-ups | D61, D69 | Fork (the default rule offered as a profile setting, #814, released in v1.4.4; a routine that repeats its last workout offered as #1161) |

## Gyms, machines and labels

| Feature | D | Mark |
|---|---|---|
| A gym per workout (an equipment profile); brand labels on machine and cable exercises, any exercise via ⋮ → Add label | D28 | Offered (a comment on #988; built in release-1.4.5 as Numbers per gym, with the brand as a label. The fork keeps its own, D104) |
| PREVIOUS and last time's prefilled sets read the machine's brand and cable setup, refilled when the gym or brand changes | D82 | Fork |
| Cable setup 1:1 / 2:1 / ×2, ×2 logged per stack | D43 | Offered (#1081, issue) |
| Exercise search by machine brand | D36 | Offered (#1082, issue) |
| Gym picker: your gyms, gyms nearby from OpenStreetMap, custom gym | D47 | Fork (upstream has its own gym search on OpenStreetMap, `lib/gym-places.js`) |
| Picker filters by the workout's gym; Gyms & equipment page | D62 | Fork (body weight as a profile's own tick offered as #1159, issue) |
| Gym filter says how many exercises it hid, and shows them on a tap | D67 | Offered (#905, the count and Show all equipment; built in release-1.4.5; upstream's replaces the fork's at the merge, D103) |
| Equipment chosen by group (Free weights, Machines …) | D63 | Offered (#901, the explorer's strip, open and not in release-1.4.5; a gym's checklist to follow) |

## Exercises and muscles

| Feature | D | Mark |
|---|---|---|
| Muscles chosen by group in the filters | D64 | Offered (#900, issue; built in release-1.4.5 with #885) |
| Shoulder heads: front, side and rear delts | D65 | Offered (#638; built in release-1.4.5 in every muscle map, with the lats apart: it replaces D65 at the merge) |
| One main muscle per exercise from reviewed name rules (squats as quads, tibialis work as shins …) | D74 | Offered (#788, released in v1.4.4: the catalogue targets, shoulder heads as delts) |
| The main muscle can be chosen per exercise | D76 | Offered (a comment on #199) |
| One of an exercise's other names (upstream's, #624) shown as its name | D73 | Offered (#903, issue; built in release-1.4.5 as Shown as, D103) |
| Chart button in the picker opens exercise details | D58 | Fork |
| Strength level from thresholds you type in | D19 | Offer (upstream's levels come from published tables by body weight, sex and age; typed thresholds are the fork's) |
| Strength levels list, by the level reached | D81 | Fork (upstream's Strength levels card on Stats lists every graded lift by level since 1.4.4) |
| Exercise details' animation at Hevy's 16:9 size | D7 | Fork |
| YouTube demo on an exercise's How to tab (upstream 1.4.4's card) | D101 | Fork |

## Statistics and history

| Feature | D | Mark |
|---|---|---|
| Volume as sets per muscle or as tonnage | D18 | Fork (upstream shows both side by side: tonnage, and Weekly sets per muscle since 1.4.4) |
| Sets per muscle: main muscle only, or secondaries in part too | D42 | Offered (#1157: upstream already counts a supporting muscle 0.4; the PR adds the main-muscles-only switch, off by default) |
| Hevy's record kinds, worked out from the log by exercise and label (imports included) | D51 | Offer (upstream 1.4.5 adds rep records 1 to 12 and numbers per gym; Hevy's kinds per label are the fork's) |
| Monthly report | D23 | Fork (upstream 1.4.5 has its own Your month, left out of the fork's UI, D109) |
| Beat last time: ↑ = ↓ per set on Workout Detail | D66 | Ported (#907: upstream built its own, released in v1.4.4; it replaces D66 at the merge) |
| Exercises kept out of progression are kept out of the statistics too (a deload routine's still count) | D57 | Offered (#813, built in release-1.4.5; upstream's replaces the fork's at the merge, D103) |
| Training streak in weeks (one week off allowed), then in years | D59 | Fork (upstream's week streak has freezes and excused weeks of its own) |
| Planned days as coloured dots / routine names on the Calendar; Show next month | D68 | Fork |
| How long each exercise took, from the set ticks: on Workout Detail, and an Exercise time page sorted by time, by muscle or by gym | D88 | Offered (#812, released in v1.4.4: the Workout Detail line and a Stats card, no gym or muscle grouping) |
| Share a workout as Hevy's cards (Summary, Exercises, Muscles, Records), on black or over your photo, to the gallery or the share sheet; the monthly report too (Summary, Calendar, Muscles, Records, Top exercises) | D87 | Fork |
| Weekly sets per muscle against a target range (upstream 1.4.4's card), counted by the fork's main muscle | D99 | Fork |

## Home, navigation and look

| Feature | D | Mark |
|---|---|---|
| Three tabs (Home · Workout · Profile); no Coach tab | D11 | Fork |
| Configurable Home of widgets | D12 | Fork |
| Workout tab: Quick Start, Today card, routine cards | D13 | Fork |
| Profile: weekly chart, dashboard, workout list | D14 | Fork |
| Settings root regrouped under five titles; layout-only rows hidden | D16 | Fork |
| Hevy's dark AMOLED theme with Hevy blue, only | D17 | Fork |
| One Hevy page bar everywhere | D49 | Fork |
| App name "Go Hevier" | D39 | Fork |
| Boot screen in Hevy blue on AMOLED black | D83 | Fork |
| Upstream's Modules switch the fork's screens too; fork features join a module | D97 | Fork |
| A switch per part inside a module (streak apart from challenges, measurements apart from photos …) | D102 | Offered (#1087, issue) |
| The fork's own features as Modules parts (Send to Hevy, OpenBite, Record marks, Weekly sets per muscle) and three modules of its own | D114 | Fork |
| A module's parts unfold under it on Settings → Modules; a Workout extras module (Timer and Stopwatch, Exercise demos) and three more parts (Calendar, Other names, Main muscle) | D117 | Fork |
| Upstream 1.4.4's challenges, recaps, Your year, recovery hint and Workouts left this week as optional Home widgets | D98 | Fork |

## Hevy import and export

| Feature | D | Mark |
|---|---|---|
| Import fixes: brand brackets, a fix table of Hevy titles, one-limb sets | D29 | Offered (the fix table is in 1.4.3, #672, but for #793's rows; the regenerated template map, #807, built in release-1.4.5) |
| Routine folders from the Hevy API | D30 | Offered (#1158, into upstream 1.4.5's own routine folders, D108; S20 goes when merged) |
| More from the Hevy API: measurements, rep ranges, rest, notes, routine links, custom exercises' muscles | D31 | Offered (#815; upstream built notes, rest timers and rep ranges in release-1.4.5 and left out the measurements, routine links, custom exercises' muscles and the unit hint. All four are offered again with D30's folders, #1158; S21 goes when merged) |
| Review of exercise matches before an import, remembered | D33 | Offered (#931, built in release-1.4.5 with #849 as one Check and choose step; upstream's replaces the fork's at the merge, D103) |
| Earlier Hevy imports' notes get their line breaks back (new imports keep them upstream since 1.4.3, #690) | D54 | Fork |
| Send new workouts and changed routines to Hevy | D34 | Fork |

## Android and phone

| Feature | D | Mark |
|---|---|---|
| Portrait only | D24 | Fork (upstream has a setting since #821: follow the phone, upright or sideways) |
| Health Connect as the only source of weigh-ins | D32 | Offered (#1088, issue) |
| Heart rate recorded live from a Bluetooth strap | D79 | Offered (#1080, issue) |
| Heart rate full screen with zones and the cardio set's time | D80 | Offered (#1080, with D79) |
| Month widget on the home screen | D44 | Fork (upstream 1.4.5 has its own Android widgets and workout notification, beside the fork's, D110) |
| Smaller APK: no barcode scanner, R8 shrinking | D50 | Fork (the scanner serves the gym check-in the fork hides) |
| A newer version offers itself in the app, with Install and Not now | D77 | Offered (#1098) |
| A lean APK, with the exercise pictures downloaded once and kept across updates; a full APK beside it | D115 | Fork |
| Auto-backup keeps five copies, not fourteen | S52 | Offered (#1091, as a choice of 5, 14, 30 or 60; S52 goes when merged) |
| Android back goes up a page the app opened, even when the WebView says it cannot | S16 | Offered (#1092) |
| The updater falls back to the API's asset link when github.com's fails | S56 | Offered (#1084, merged into release-1.4.5: S56 goes at the merge) |
| Android 13 and later only | D116 | Fork |
| Left out of the APK and the UI: the Wear OS app, Zepp, NFC stickers, Film a set, the tour, the icon picker, seasonal themes | D100 | Fork |

## Release and security (tooling)

| Feature | D | Mark |
|---|---|---|
| Local security gates: secrets, vulnerable dependencies, supply chain, run in parallel | D26 | Offered (#1077, issue) |
| APK checks: certificate, signature scheme, debuggable flag, permissions, native libraries, exported components | D38 | Offered (#1077, issue) |
| The Zepp toolchain's vulnerable dependencies lifted with npm overrides | S55 | Offered (#1090; S55 goes when merged) |
| Own version and changelog, release script, GitHub release the updater reads | D52 | Fork |

## No fork code

These work through upstream's own features and are listed only because a fork user might look for them here:

- **Backup to Google Drive** (D20): upstream's auto-backup folder, mirrored by a sync app.
- **Keep the screen on** (D25): upstream's Keep screen awake switch.
