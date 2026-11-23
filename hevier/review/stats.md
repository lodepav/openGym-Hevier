# Implement-review: area `stats`

Branch `hevier/review-stats`, from hevier/main f37dad980. Files: `python3 hevier/review/areas.py stats` (105).

Intent: every number the owner reads on History, Workout Detail, Statistics and its tiles, the
monthly report, the Calendar, Lifts, exercise details, Exercise time, sets per muscle, Measures
and the share cards is worked out right from the logged sets: per side once, warm-ups left out,
timed holds as holds, in kg or lb, on the right side of a week or month boundary, and again
after a workout is edited or deleted (D18, D42, D51, D57, D88, D89, D93, D140, D142). Records
follow the brand and setup (D28, D43, D51), the streak follows D59, and nothing on these screens
writes to the stored data unless the owner does something that asks it to.

Decisions: D5 D14 D18 D19 D22 D23 D27 D28 D32 D41 D42 D43 D51 D57 D59 D66 D68 D87 D88 D89 D93
D95 D96 D114 D117 D126 D131 D133 D135 D139 D140 D141 D142.

Baseline: vitest 49 files, 411 passed (the area's own test files).

## Ledger

| Round | Id | Sev | Claim | Decision | Reason |
|---|---|---|---|---|---|
| 0 | P1 | - | Hevy export toggle off/on within ~20 s during a send can leave it off | reject | dismissed by owner 2026-10-22 |
| 0 | P2 | - | Watchdog-abandoned send can overlap the next and POST a workout twice | reject | dismissed by owner 2026-10-22 |
| 0 | P3 | - | note-text.js `\n` fix runs on any imported workout's notes, not only Hevy's | reject | dismissed by owner 2026-10-22 |
| 0 | P4 | - | HevierLocationPlugin (API < 30) requestSingleUpdate listener not removed after 25 s fallback | reject | dismissed by owner 2026-10-22 |
| 1 | F1 | medium | Statistics' Timed sets tile and Time per exercise card time the counted log, so a kept-out entry's ticks are gone and its time goes to the exercise after it (21 min where the Exercise time page reads 6) | accept | the page passes the phased, uncounted log to the time helpers, as ExerciseTime.jsx does; `timedSessions` drops the kept-out entry after timing; test (noProg squat then bench) failed before (`21 min`), passes after |
| 1 | F2 | medium | Exercise details' Best Session Volume counts warm-ups when upstream's switch is on, and its Best 1RM uses the default formula, not the profile's | reject | D51 keeps exercise details' Personal Records as upstream's read-back ("Unchanged"), D19 reads "upstream's read-back, unchanged", and D18 has the fork's volumes follow the warm-up switch; changing them changes visible numbers against those rows |
| 1 | F3 | low | The Sets per muscle tile counts cardio and unplaced exercises' sets, which its card leaves out | defer | the tile reads the weekly chart's Sets as stats-tiles.js says it does; making it match the card changes a visible number |
| 1 | - | - | 1 withdrawn (Lifts memo deps on `dbLoad` / formula); notes: Lifts' last and best read the raw log (D57 does not list Lifts); the monthly report and share cards write weights in the profile's unit, not the exercise's (D41); no store write on open or scroll | - | not findings |

Round 1 tests: Statistics.test.jsx and stats-tiles.test.js, 2 files 32 passed.
