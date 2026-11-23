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
| 1 | F2 | medium | Exercise details' Best Session Volume counts warm-ups when upstream's switch is on, and its Best 1RM uses the default formula, not the profile's, so they can differ from Workout Detail's records of the same name | needs your call | real, but D51 keeps exercise details' Personal Records as upstream's read-back ("Unchanged"), D19 reads "upstream's read-back, unchanged", and D18 has the fork's volumes follow the warm-up switch; changing them changes visible numbers against those rows |
| 1 | F3 | low | The Sets per muscle tile counts cardio and unplaced exercises' sets, which its card leaves out | defer | the tile reads the weekly chart's Sets as stats-tiles.js says it does; making it match the card changes a visible number |
| 1 | - | - | 1 withdrawn (Lifts memo deps on `dbLoad` / formula); notes: Lifts' last and best read the raw log (D57 does not list Lifts); the monthly report and share cards write weights in the profile's unit, not the exercise's (D41); no store write on open or scroll | - | not findings |

Round 1 tests: Statistics.test.jsx and stats-tiles.test.js, 2 files 32 passed.
| 2 | G1 | medium | With upstream's Compare sets with last time off, `workoutTrends` gives no arrows, so the strength row OpenBite reads is null (D95) | accept | `strengthSignal` reads the arrows with `setTrend: true`, as lift-progress.js does; test (`setTrend: false`, two chest lifts falling) failed before (null), passes after |
| 2 | G2 | medium | A workout with no phase (a backfill or a finish without Save Workout, D93) inside a phase run ends it: phase_days restarts, the 14-day gates and chains restart, and Lifts' "Cutting since" moves | needs your call | D95 reads "only the workouts of the current phase count" and "no phase on the latest workout is no row"; skipping phase-less workouts changes what OpenBite gets and what Lifts shows |
| 2 | G3 | low | A weighted per-side hold's L and R rows cast two votes in a session's verdict | accept | one-liner: `arrows` drops the pair's R row (`isPairTail`), so the pair is one set as D89 counts it; test (worse 65 × 8, better hold both sides) failed before (`[-1, 1, 1]`), passes after (`[-1, 1, null]`, same) |
| 2 | - | - | notes: ShareSheet's memo leaves out dbLoad / formula / module parts (only while the sheet is open); the month report's weeks trained read the counted log beside a calendar of every workout (D57 as written); a timed hold on a reps exercise has no Longest Hold record (D51/D89 as written) | - | not findings |

Round 2 tests: strength-signal, strength-signal-run, lift-progress and Lifts tests, 4 files 79 passed.
| 3 | H1 | medium | Exercise time (its page, Statistics' tile and card, the exercise page's line) drops a deload routine's workouts, which D57 and the counted log keep | accept | `timedSessions` takes `routines` and keeps exactly the entries `countedWorkouts` keeps; the callers pass the routines; test (a deload routine's entry) failed before (`[]`), passes after, and without the deload it is still left out |
| 3 | H2 | medium | Last sessions stars a kept-out set (a light high-rep technique day) as a best the tiles leave out, and the counted best loses its star | accept | `lastSessions` takes `kept`, the counted summary's session ids, and stars only those; lib test failed before (`setVol` on 60 × 15), passes after; view test (ExerciseDetails) fails with the view's change stashed, passes with it |
| 3 | H3 | low | `repBests`' "new" cutoff is worked out as a UTC day, a day early east of UTC+12 | accept | one-liner: counted back on the local date with `isoOf`; test failed under `TZ=Pacific/Auckland` (`[true, true]`), passes after there and in the default zone |
| 3 | H4 | low | Measures' Body measurements row reads "None yet" when the last check-in has only a note or only fields since switched off | accept | walks back to the newest check-in with a switched-on value; test failed before, passes after |
| 3 | - | - | 1 withdrawn (levels form's unrounded fields: `convertWeight` rounds); notes: G3's fix drops an R row's vote even when only R is ticked; Strength levels page reads the profile unit, the exercise page the exercise's (D41) | - | not findings |

Round 3 tests: the area's files, 49 files 419 passed; exercise-page, measures-rows and exercise-time tests also under `TZ=Pacific/Auckland`, 24 passed. A whole-frontend run with these changes: 1095 files passed, SetVideo.test.jsx (outside the area, untouched) failed twice under load and passed on its own, 10 passed.
