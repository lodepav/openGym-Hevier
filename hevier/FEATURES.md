# What Go Hevier adds to openGym

Each fork feature is listed once, with the decision that describes it in [DECISIONS.md](DECISIONS.md) and one of these marks:

| Mark | Meaning |
|---|---|
| **Fork** | Belongs to the fork only. It is Hevy's look, it concerns Hevy, or it is a choice that only suits the fork. |
| **Offer** | A general improvement that upstream's own UI would benefit from. It could be offered as an issue or a pull request, with the user's go-ahead (RULES.md: `hevier-upstream/<topic>`). |
| **Offered** | Already offered upstream. The issue or PR number is given. |
| **Ported** | Built ahead of an upstream release that already has it. Upstream's version replaces it at that merge. |

Upstream's training logic stays as it is: progression, 1RM, recovery, sync and storage. Where the fork behaves differently, it wraps upstream's helpers rather than changing them.

## Workout

| Feature | D | Mark |
|---|---|---|
| Hevy's set table as the only workout layout | D1 | Fork |
| Prefilled values in grey until touched, as placeholders | D2 | Fork |
| The plate line under a set off by default, a switch in During a workout | D84 | Fork |
| "Next time" on the finish summary only for a routine with progression on | D85 | Fork |
| PREVIOUS column: last time's set, tap to copy; a missing set is read from an older session | D3 | Fork |
| Where PREVIOUS reads from: the same routine or any workout (a setting) | D21 | Fork |
| No ± steppers; values typed on the number pad | D4 | Fork |
| Set-type sheet (W / F / D labels), with drops nested under their set | D5 | Fork |
| Effort column, only when RIR/RPE is on | D6 | Fork |
| Hevy exercise block: notes, rest line, + Add Set | D7 | Fork |
| Progression guidance behind ⋮ (Exercise settings), nothing about it on the card | D8 | Fork |
| Swipe left deletes a set, with undo | D9 | Fork |
| Header: duration, ⏱ Timer/Stopwatch, Finish → Save Workout → "Nice work!" | D10 | Fork |
| The ⏱ Timer remembers its last time and counts down on a ring | D10 | Offer |
| Live PR trophy on the set as it is ticked, with a toast | D22, D51 | Offer |
| "Update routine?" prompt after a workout that changed the routine | D35 | Offer (upstream 1.4.3's #592 keeps added exercises) |
| Weight unit per exercise (e.g. one machine in lb) | D41 | Offer |
| TIME column with a count-up timer for cardio and holds | D53 | Offer |
| Workout note at the top of the workout and on the feed cards | D54 | Fork |
| Holds (plank, wall sit …) start as timed holds | D55 | Offered (#694, in 1.4.3) |
| A one-limb exercise starts per side | D75 | Offered (#736, in 1.4.3) |
| Rest wheel opens on the default rest | D56 | Offered (#735, in 1.4.3) |
| Duration wheels in 5-second steps | D48 | Fork |
| "Still training?" after five hours | D60 | Offer |
| A rest after every set, including one side and the last set; Ready clears itself | D70 | Offer |
| The next set to do is highlighted | D71 | Fork |
| Per-side exercises can be done right side first, remembered per exercise | D72 | Offer |
| Add Exercise asks where: Insert after the current exercise, or Add to end | D78 | Fork |
| A timed hold as a set type of a reps exercise (a per-side set too, a hold on each side), shown as a time in history; a big countdown clock for every hold | D89 | Fork |
| A tick asks first when a weight or rep count is over double the exercise's best or under a third of last time's (a likely typo), or a cardio timer was left running | D90 | Offered (#811, the weight and rep checks; the cardio timer is the fork’s) |

## Routines

| Feature | D | Mark |
|---|---|---|
| Hevy's routine editor table drawn from openGym's prescription | D15 | Fork |
| Routine page (read-only) before the editor | D37 | Fork |
| Routine folders, long-press reorder | D13 | Fork |
| Planned backups for a routine exercise: the fork's ⋮ → Backups sheet and "Your backups" over upstream 1.4.2's field | D45 | Fork |
| A gym's backups: the swap made at a gym is reused there | D46 | Offer (upstream 1.4.3 offers a slot's backups in the workout's ⋯, #649; not learned per gym) |
| Missing at a gym: a routine starts with the first backup the gym has; backups in priority order | D86 | Fork |
| Progression off by default; a per-routine switch for progression and auto warm-ups | D61, D69 | Fork (the default rule offered as a profile setting, #814) |

## Gyms, machines and labels

| Feature | D | Mark |
|---|---|---|
| A gym per workout (an equipment profile); brand labels on machine and cable exercises, any exercise via ⋮ → Add label | D28 | Offer |
| PREVIOUS and last time's prefilled sets read the machine's brand and cable setup, refilled when the gym or brand changes | D82 | Fork |
| Cable setup 1:1 / 2:1 / ×2, ×2 logged per stack | D43 | Offer |
| Exercise search by machine brand | D36 | Offer |
| Gym picker: your gyms, gyms nearby from OpenStreetMap, custom gym | D47 | Offer |
| Picker filters by the workout's gym; Gyms & equipment page | D62 | Fork |
| Gym filter says how many exercises it hid, and shows them on a tap | D67 | Offer |
| Equipment chosen by group (Free weights, Machines …) | D63 | Offer |

## Exercises and muscles

| Feature | D | Mark |
|---|---|---|
| Muscles chosen by group in the filters | D64 | Offer |
| Shoulder heads: front, side and rear delts | D65 | Offered (#638) |
| One main muscle per exercise from reviewed name rules (squats as quads, tibialis work as shins …) | D74 | Offered (#788, the catalogue targets, shoulder heads as delts) |
| The main muscle can be chosen per exercise | D76 | Offer |
| Other names for an exercise, searchable, one shown as its name | D73 | Offer (upstream 1.4.3 brings searchable other names, #624; not one shown as the name) |
| Chart button in the picker opens exercise details | D58 | Fork |
| Strength level from thresholds you type in | D19 | Offer |
| Strength levels list, by the level reached | D81 | Offer |
| Exercise details' animation at Hevy's 16:9 size | D7 | Fork |

## Statistics and history

| Feature | D | Mark |
|---|---|---|
| Volume as sets per muscle or as tonnage | D18 | Offer |
| Sets per muscle: main muscle only, or secondaries in part too | D42 | Offer |
| Hevy's record kinds, worked out from the log by exercise and label (imports included) | D51 | Offer |
| Monthly report | D23 | Offer |
| Beat last time: ↑ = ↓ per set on Workout Detail | D66 | Offer |
| Exercises kept out of progression are kept out of the statistics too (a deload routine's still count) | D57 | Offered (#813) |
| Training streak in weeks (one week off allowed), then in years | D59 | Offer |
| Planned days as coloured dots / routine names on the Calendar; Show next month | D68 | Fork |
| How long each exercise took, from the set ticks: on Workout Detail, and an Exercise time page sorted by time, by muscle or by gym | D88 | Offered (#812, the Workout Detail line and a Stats card, no gym or muscle grouping) |
| Share a workout as Hevy's cards (Summary, Exercises, Muscles, Records), on black or over your photo, to the gallery or the share sheet; the monthly report too (Summary, Calendar, Muscles, Records, Top exercises) | D87 | Fork |

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

## Hevy import and export

| Feature | D | Mark |
|---|---|---|
| Import fixes: brand brackets, a fix table of Hevy titles, one-limb sets | D29 | Offered (fix table rows, #672, in 1.4.3; its regenerated template map was not taken, offered again in #807) |
| Routine folders from the Hevy API | D30 | Offer |
| More from the Hevy API: measurements, rep ranges, rest, notes, routine links, custom exercises' muscles | D31 | Offered (#815) |
| Review of exercise matches before an import, remembered | D33 | Offer |
| Weights kept to the hundredth on import | D40 | Offered (#690, in 1.4.3) |
| Hevy CSV notes keep their line breaks | D54 | Offered (#690, in 1.4.3) |
| Send new workouts and changed routines to Hevy | D34 | Fork |

## Android and phone

| Feature | D | Mark |
|---|---|---|
| Portrait only | D24 | Offer |
| Heart rate and weigh-ins read from Health Connect | D27 | Ported (1.4.3) |
| Health Connect as the only source of weigh-ins | D32 | Offer |
| Heart rate recorded live from a Bluetooth strap | D79 | Offer |
| Heart rate full screen with zones and the cardio set's time | D80 | Offer |
| Month widget on the home screen | D44 | Offer (upstream roadmap #125) |
| Smaller APK: no barcode scanner, R8 shrinking | D50 | Fork (the scanner serves the gym check-in the fork hides) |
| A newer version offers itself in the app, with Install and Not now | D77 | Offer |

## Release and security (tooling)

| Feature | D | Mark |
|---|---|---|
| Local security gates: secrets, vulnerable dependencies, supply chain, run in parallel | D26 | Offer |
| APK checks: certificate, signature scheme, debuggable flag, permissions, native libraries, exported components | D38 | Offer |
| Own version and changelog, release script, GitHub release the updater reads | D52 | Fork |

## No fork code

These work through upstream's own features and are listed only because a fork user might look for them here:

- **Backup to Google Drive** (D20): upstream's auto-backup folder, mirrored by a sync app.
- **Keep the screen on** (D25): upstream's Keep screen awake switch.
