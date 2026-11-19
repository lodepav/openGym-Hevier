# What Go Hevier adds to openGym

Each fork feature is listed once, with the decision that describes it in [DECISIONS.md](DECISIONS.md) and one of these marks:

| Mark | Meaning |
|---|---|
| **Fork** | Belongs to the fork only. It is Hevy's look, it concerns Hevy, or it is a choice that only suits the fork. |
| **Offer** | A general improvement that upstream's own UI would benefit from. It could be offered as an issue or a pull request, with the user's go-ahead (RULES.md: `upstream-pr/<topic>`). |
| **Offered** | Already offered upstream. The issue or PR number is given. |
| **Ported** | Built ahead of an upstream release that already has it. Upstream's version replaces it at that merge. |
| **Removed** | Was in the fork until a later decision took it out; listed so it can still be found. |

A row with a seam number (S52) in place of a decision is a small change that has no decision of its own; [SEAMS.md](SEAMS.md) describes it. The marks were last checked against upstream's `release-1.4.6` on 2026-11-18.

Upstream's training logic stays as it is: progression, 1RM, recovery, sync and storage. Where the fork behaves differently, it wraps upstream's helpers rather than changing them.

## Workout

| Feature | D | Mark |
|---|---|---|
| Hevy's set table as the only workout layout | D1 | Fork |
| Prefilled values in grey until touched, as placeholders | D2 | Fork |
| The plate line under a set off by default, a switch in During a workout | D84 | Fork |
| PREVIOUS column: last time's set, tap to copy; a missing set is read from an older session | D3 | Fork |
| No ± steppers; values typed on the number pad | D4 | Fork |
| Set-type sheet (W / F / D labels), with drops nested under their set | D5 | Fork |
| Effort column, only when RIR/RPE is on | D6 | Fork |
| Exercise block: picture, name and brand on one line; on the open exercise Swap, Note, History, Rest, Reorder and More, and + Set beside + Warm-up | D7, D127 | Fork |
| Progression guidance behind ⋮ (Exercise settings), nothing about it on the card | D8 | Fork |
| Swipe left deletes a set, with undo | D9 | Fork |
| Where PREVIOUS reads from is a setting: the same routine's last session, or any workout's | D21 | Fork |
| An exercise's rest wheel opens on the default rest | D56 | Ported (#735, upstream's Default / No timer / Pick a time since 1.4.3) |
| "Next time" on the Finish summary only for a routine whose progression is on | D85 | Fork |
| Header: name, duration, heart rate (a tap opens its full screen), ⏱ Timer/Stopwatch and Finish; the gym and the workout note below the name, open at the page's top and bottom and at the start and end of the session, the chevron toggles them | D10, D80, D127 | Fork |
| Finish opens a sheet over the workout: sets, new best sets, duration, unticked sets, "Update the routine too", Save, then Today with "Workout saved" | D132 | Fork |
| Swap shows what you swapped this exercise for before (how often, when, the last set), then what you did at this gym for the muscle, then the catalogue's substitutes, each one tap; worked out from the log, and a swap never changes the routine. Add exercise lists what you did at this gym first | D129 | Fork |
| The ⏱ Timer remembers its last time and counts down on a ring | D10 | Offered (#1078, issue; PR #1361, a Timer and a Stopwatch in the header) |
| Live PR trophy on the set as it is ticked, with a toast | D22, D51 | Fork (upstream 1.4.5 has its own trophy at the tick; one trophy, not two, at the merge, D107) |
| "Update the routine too" on the Finish sheet when a workout changed its routine | D35, D129, D132 | Offered (#1376: removed, swapped and reordered exercises with Undo, against the routine as the workout started; no set counts) |
| The fork's screens show and type an exercise in its own weight unit (upstream's pin since 1.4.4, #657) | D41 | Fork |
| TIME column with a count-up timer for cardio and holds | D53 | Offered (#1375: the count-up clock on a cardio set, whole minutes; holds already run by themselves upstream) |
| Workout note below the workout's name and on the feed cards | D54, D127 | Fork |
| An exercise last logged as holds starts as one (upstream starts its catalogue holds timed since 1.4.3, #694) | D55 | Ported (#902, upstream's Start as last logged since 1.4.5; S32 is gone, D103, D121) |
| An exercise last logged per side starts per side (upstream does one-limb lifts since 1.4.3, #736) | D75 | Ported (#902, upstream's Start as last logged since 1.4.5; S32 is gone, D103, D121) |
| Duration wheels in 5-second steps | D48 | Offered (#1156, as a Settings choice of 1 s or 5 s; S28 goes when merged) |
| "Still training?" after five hours | D60 | Ported (#906, upstream's Forgotten workouts since 1.4.5, after 45 quiet minutes; the fork's own is gone, D103) |
| A rest after every set, including one side and the last set; Ready clears itself | D70 | Offered (#1377: only an opt-in profile rest between sides for reps; the rest after the last set and Ready stay the fork's) |
| The next set to do opens large, with the effort button in the tick's place when effort is on, its dialog ending with Log without rating; a tap opens another set | D71, D127 | Fork |
| The rest docks at the bottom of the workout: countdown, next set, +1 min, +2 min, Skip | D127 | Fork |
| Per-side exercises can be done right side first, remembered per exercise | D72 | Offered (#1085) |
| Add Exercise asks where: Insert after the current exercise, or Add to end | D78 | Fork |
| A timed hold as a set type of a reps exercise (a per-side set too, a hold on each side), shown as a time in history; a big countdown clock for every hold | D89 | Offered (#1093, issue: the hold set) |
| A tick asks first when a weight or rep count is over double the exercise's best or under a third of last time's (a likely typo), or a cardio timer was left running | D90 | Offered (#811, released in v1.4.4 on 2026-11-03: the weight and rep checks, too high and too low; the cardio timer is the fork’s, as upstream has no count-up timer to forget, D53) |
| One notification for the rest countdown and the heart-rate strap, the bpm in the card's header | D91 | Fork |
| A live workout's Exercise settings save as they close, with Done instead of Save | D92 | Offered (#1079, issue; PR #1213) |
| OpenBite's phase on saved workouts, and a filter by it on the statistics pages, exercise history and workout feed | D93 | Fork |
| The gym on the feed card | D94 | Offered (#1097, History rows and details) |
| Strength in the current phase, shared with OpenBite | D95 | Fork |
| Two brands' session histories of an exercise side by side | D96 | Fork |
| Reorder exercises: one collapsed drag list in the workout, in place of Move up / Move down, a button on the open exercise | D118, D127 | Fork |
| A day planned in the Calendar trains what you picked, even a rotation session done the week before; a pass refill keeps the plans; redoing a done session starts the rotation over from it | D124 | Offered (#1293) |

## Routines

| Feature | D | Mark |
|---|---|---|
| Hevy's routine editor table drawn from openGym's prescription | D15 | Fork |
| Routine editor: a drag handle on each exercise, + Set beside + Warm-up, the rest as a chip, a remove mark on each set, the brand on the name line; the exercise's note behind ⋮ → Note | D130 | Fork |
| Routine page (read-only) before the editor | D37 | Fork |
| The routine's page is the next session's plan: last time beside what each set opens with, warm-ups included; a tap on a weight or reps plans it for the next session only, without changing the routine; Today's card shows the same numbers | D128 | Fork |
| Routine folders, reordered by their handles | D13 | Fork |
| Routines list: folders fold, each routine a row with its next planned day or when it was last done, the next one marked with an accent Start; a tap opens the next session's page, a long press or ⋯ moves, copies or deletes; + Routine, + Folder, Rotation, Empty workout and Explore at the end | D130 | Fork |
| Planned backups for a routine exercise: the fork's ⋮ → Backups sheet and "Your backups" over upstream 1.4.2's field (in the routine editor's Replace; the workout's Swap lists your own swaps instead, D129) | D45 | Fork |
| A gym's backups: the swap made at a gym is reused there | D46 | Offered (a comment on #1022, which asks for routines per gym; upstream 1.4.3 offers a slot's backups in the workout's ⋯, #649, not learned per gym) |
| Missing at a gym: a routine starts with the first backup the gym has; backups in priority order | D86 | Fork |
| Progression off by default; a per-routine switch for progression and auto warm-ups | D61, D69 | Fork (the default rule offered as a profile setting, #814, released in v1.4.4; a routine that repeats its last workout offered as #1161) |
| Undo after deleting a folder or a routine from the editor; a new routine opens with an empty title; the ⚠ tells its reason on a tap | D118 | Fork |

## Gyms, machines and labels

| Feature | D | Mark |
|---|---|---|
| A gym per workout (an equipment profile); brand labels on machine and cable exercises, any exercise via ⋮ → Add label | D28 | Offered (a comment on #988; built in release-1.4.5 as Numbers per gym, with the brand as a label. The fork keeps its own, D104) |
| PREVIOUS and last time's prefilled sets read the machine's brand and cable setup, refilled when the gym or brand changes | D82 | Fork |
| Cable setup 1:1 / 2:1 / ×2, ×2 logged per stack | D43 | Offered (#1081, issue) |
| Exercise search by machine brand | D36 | Offered (#1082, issue; PR #1211) |
| Gym picker: your gyms, gyms nearby from OpenStreetMap, custom gym | D47 | Fork (upstream has its own gym search on OpenStreetMap, `lib/gym-places.js`) |
| Picker filters by the workout's gym; Gyms & equipment page | D62 | Fork (body weight as a profile's own tick offered as #1159, issue; PR #1214) |
| Gym filter says how many exercises it hid, and shows them on a tap | D67 | Ported (#905, upstream's count and Show all equipment since 1.4.5, D103) |
| Equipment chosen by group (Free weights, Machines …) | D63 | Offered (#901, the explorer's strip, open and not in release-1.4.5; a gym's checklist to follow) |

## Exercises and muscles

| Feature | D | Mark |
|---|---|---|
| Muscles chosen by group in the filters | D64 | Offered (#900, issue; upstream's own groups since 1.4.5, #885: the By muscle explorer uses them, the picker keeps the fork's, D121) |
| Shoulder heads: front, side and rear delts | D65 | Ported (#638, upstream's split since 1.4.5 in every muscle map, the lats apart; the heads come from the catalogue, D103, D121) |
| One main muscle per exercise from reviewed name rules (squats as quads, tibialis work as shins …) | D74 | Offered (#788, released in v1.4.4: the catalogue targets, shoulder heads as delts) |
| The main muscle can be chosen per exercise | D76 | Offered (a comment on #199) |
| One of an exercise's other names (upstream's, #624) shown as its name | D73 | Ported (#903, upstream's Shown as since 1.4.5; `S.hvShownName` moved into it, D103) |
| Chart button in the picker opens exercise details | D58 | Fork |
| Strength level from thresholds you type in | D19 | Offer (upstream's levels come from published tables by body weight, sex and age; typed thresholds are the fork's) |
| Strength levels list, by the level reached | D81 | Fork (upstream's Strength levels card on Stats lists every graded lift by level since 1.4.4) |
| Exercise details' animation at Hevy's 16:9 size | D7 | Fork |
| An exercise's page is one page, no tabs: the animation, the phase and brand filter, the last sessions one line each (an arrow against the session before, a star on each best set, All history), the best sets as three tiles, the best at each rep count (the last month's marked new), the chart, then Strength level, Compare brands, Time on this exercise and How to | D131 | Fork |
| YouTube demo on an exercise's How to (upstream 1.4.4's card) | D101 | Fork |
| Create “<text>” in the picker when a search finds nothing | D118 | Fork |

## Statistics and history

| Feature | D | Mark |
|---|---|---|
| Volume as sets per muscle or as tonnage | D18 | Fork (upstream shows both side by side: tonnage, and Weekly sets per muscle since 1.4.4) |
| Sets per muscle: main muscle only, or secondaries in part too | D42 | Offered (#1157: upstream already counts a supporting muscle 0.4; the PR adds the main-muscles-only switch, off by default) |
| Hevy's record kinds, worked out from the log by exercise and label (imports included) | D51 | Offer (upstream 1.4.5 adds rep records 1 to 12 and numbers per gym; Hevy's kinds per label are the fork's) |
| Monthly report | D23 | Fork (upstream 1.4.5 has its own Your month, left out of the fork's UI, D109) |
| Beat last time: ↑ = ↓ against the PREVIOUS column's set, on Workout Detail and the workout's rows (upstream's comparison and switch since 1.4.4, #907) | D66 | Fork |
| Workout Detail without the Muscle split bars; effort in its own RPE (or RIR) column; a per-side set of any type as an L row and an R row under one number, its arrows and records on their side | D133 | Fork |
| Exercises kept out of progression are kept out of the statistics too (a deload routine's still count) | D57 | Ported (#813, upstream leaves them out of the statistics since 1.4.5; the fork's statistics read upstream's counted log through S34, and its records keep D57's rule) |
| Training streak in weeks (one week off allowed), then in years | D59 | Fork (upstream's week streak has freezes and excused weeks of its own) |
| Planned days as coloured dots / routine names on the Calendar; Show next month | D68 | Fork |
| How long each exercise took, from the set ticks: on Workout Detail, and an Exercise time page sorted by time, by muscle or by gym | D88 | Offered (#812, released in v1.4.4: the Workout Detail line and a Stats card, no gym or muscle grouping) |
| Share a workout as Hevy's cards (Summary, Exercises, Muscles, Records), on black or over your photo, to the gallery or the share sheet; the monthly report too (Summary, Calendar, Muscles, Records, Top exercises) | D87 | Fork |
| No target ranges for weekly sets: upstream's Ranges row hidden, its Muscles card without the range band | D139 | Fork |
| A workout against the last time the routine was done; weeks in range per muscle; a routine's usual length; left against right; time between sets | D119 | Fork |
| Effort on warm-ups can be switched off: no RIR or RPE cell on a warm-up row | D120 | Offered (#1374) |
| The phone's font size zooms all text again, the fork's screens included, as before 1.4.5 | D122 | Fork |

## Home, navigation and look

| Feature | D | Mark |
|---|---|---|
| Three tabs (Today · Lifts · History, in place of Home · Workout · Profile); no Coach tab | D11, D126 | Fork |
| Today: the next session (when, where, the first five exercises and their sets), Start, the week in seven days, the round and the streak, Routines · Calendar · Empty workout, the last workout | D134 | Fork |
| Lifts: every trained exercise with its last set and best ("new best" after a record), Recent or By muscle, a search; Strength levels and Exercise time as links at the end | D135 | Fork |
| Lifts shows where each lift is going: a chart of estimated 1RM with its change, a line per brand, over 12 weeks, the diet phase or all; rising, holding and falling totals that filter | D140 | Fork |
| History: this week in three numbers, chips in two rows (Look back: Calendar, Month report; Numbers: Statistics, Sets per muscle, Body weight, All statistics), the phase filter and the workout feed | D135 | Fork |
| All statistics without upstream's week streak card, so D59's streak is the only one on the app's pages | D135 | Fork |
| Routines page (the Workout tab until D126): routine rows since D130 | D13, D130 | Fork |
| The weekly chart at the top of Statistics (on Profile until D135) | D14, D135 | Fork |
| Sets per muscle as a page of its own: the counts by week, month or year; History's chip and a row on Statistics open it | D14, D135 | Fork |
| Removed by D126/D134: the configurable Home of widgets (D12, its stored layout kept), Profile's dashboard (D14), Upstream 1.4.4's cards as Home widgets (D98) | D12, D14, D98 | Removed |
| Settings root regrouped under five titles, its groups set apart; layout-only rows hidden; opened from a tab's ⚙ | D16, D136 | Fork |
| Dark AMOLED only (D17); OpenBite's look: Nunito, warm greys, cards, an accent you choose (green by default, Hevy's blue next), meaning colours that step aside from it, a launcher icon that follows it | D17, D123 | Fork |
| One Hevy page bar everywhere | D49 | Fork |
| App name "Go Hevier" | D39 | Fork |
| Boot screen in the accent on AMOLED black | D83, D123 | Fork |
| Upstream's profile picture (photo or icon) where the fork shows the user, at the top of Settings since the Profile tab went; not its badges | D112 | Fork |
| Upstream's Modules switch the fork's screens too; fork features join a module | D97 | Fork |
| A switch per part inside a module (streak apart from challenges, measurements apart from photos …) | D102 | Offered (#1087, issue; PR #1235. Exercise settings as a module of its own: #1236, issue; PR #1237) |
| The fork's own features as Modules parts (Send to Hevy, OpenBite, Record marks) and three modules of its own | D114 | Fork |
| A module's parts unfold under it on Settings → Modules; a Workout extras module (Timer and Stopwatch, Exercise demos) and three more parts (Calendar, Other names, Main muscle) | D117 | Fork |
| Switches that can do nothing are disabled and say which module they need | D118 | Fork |

## Hevy import and export

| Feature | D | Mark |
|---|---|---|
| Import fixes: brand brackets, a fix table of Hevy titles, one-limb sets | D29 | Offered (the fix table is in 1.4.3, #672, but for #793's rows; the regenerated template map, #807, built in release-1.4.5) |
| Routine folders from the Hevy API | D30 | Offered (#1158, into upstream 1.4.5's own routine folders, D108; S20 goes when merged) |
| More from the Hevy API: measurements, rep ranges, rest, notes, routine links, custom exercises' muscles | D31 | Offered (#815; upstream built notes, rest timers and rep ranges in release-1.4.5 and left out the measurements, routine links, custom exercises' muscles and the unit hint. All four are offered again with D30's folders, #1158; S21 goes when merged) |
| Review of exercise matches before an import, remembered | D33 | Ported (#931, upstream's Check and choose since 1.4.5; the fork's review is gone and its picks moved into upstream's, D103) |
| An imported weight keeps its hundredths | D40 | Ported (#690, upstream's importers since 1.4.3; S25 is gone) |
| Earlier Hevy imports' notes get their line breaks back (new imports keep them upstream since 1.4.3, #690) | D54 | Fork |
| Send new workouts and changed routines to Hevy | D34 | Fork |
| Heart rate, gym, phase, brand and cable setup, exercise time, holds and uneven sides go into the notes of a workout sent to Hevy | D137 | Fork |
| Workouts go to Hevy with a Hevy login (into the feed, no Pro key), Hevy's own exercise for a brand or a table match, and a repair of the ones sent before | D138 | Fork |
| Import from Hevy link in the empty Workout tab and feed; a toast when Send to Hevy has stopped on its key | D118 | Fork |

## Android and phone

| Feature | D | Mark |
|---|---|---|
| Portrait only | D24 | Fork (upstream has a setting since #821: follow the phone, upright or sideways) |
| Heart rate and weigh-ins read from Health Connect | D27 | Ported (upstream's own read since 1.4.3, #544, #127) |
| Health Connect as the only source of weigh-ins | D32 | Offered (#1088, issue; PR #1362) |
| Heart rate recorded live from a Bluetooth strap | D79 | Offered (#1080, issue) |
| Heart rate full screen with zones and the cardio set's time | D80 | Offered (#1080, with D79) |
| Month widget on the home screen | D44 | Fork (upstream 1.4.5 has its own Android widgets and workout notification, beside the fork's, D110) |
| Smaller APK: no barcode scanner, R8 shrinking | D50 | Fork (the scanner serves the gym check-in the fork hides) |
| A newer version offers itself in the app, with Install and Not now | D77 | Offered (#1098) |
| A lean APK, with the exercise pictures downloaded once and kept across updates; a full APK beside it | D115 | Fork |
| Auto-backup keeps five copies, not fourteen | S52 | Offered (#1091, as a choice of 5, 14, 30 or 60; S52 goes when merged) |
| Android back goes up a page the app opened, even when the WebView says it cannot | S16 | Offered (#1092) |
| The updater falls back to the API's asset link when github.com's fails | S56 | Ported (#1084, released in v1.4.5; S56 is gone) |
| Android 13 and later only | D116 | Fork |
| No Garmin watch link (its exported binding service removed from the manifest) and no microphone | D106 | Fork |
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
