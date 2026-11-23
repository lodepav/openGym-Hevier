# Implement-review: area `workout`

Branch `hevier/review-workout`, from hevier/main 65bb63512. Files: `python3 hevier/review/areas.py workout` (118).

Intent: the live workout (D127) lets the owner log each set in one tap, with rest docked at the
bottom, timed holds and cardio on a count-up clock (D53, D89), per-side sets (D75, D72), grey
prefills until touched (D2), and asks before ticking a mistyped set (D90). A logged set is never
lost or changed silently: not by an app kill mid-workout, a rest timer while the phone sleeps,
editing an earlier set or removing an exercise. Finish opens one sheet (D132) and what is saved
matches what was ticked, with the routine changed only when the owner ticks "Update the routine too" (D129).

Decisions: D1 D2 D3 D5 D6 D10 D13 D21 D22 D28 D41 D43 D48 D51 D53 D57 D66 D72 D75 D78 D82 D84
D89 D90 D104 D107 D118 D120 D124 D127 D129 D130 D132 D133 D146.

Baseline: vitest 49 files, 362 passed (the area's own test files).

## Ledger

| Round | Id | Sev | Claim | Decision | Reason |
|---|---|---|---|---|---|
| 0 | P1 | - | Hevy export toggle off/on within ~20 s during a send can leave it off | reject | dismissed by owner 2026-10-22 |
| 0 | P2 | - | Watchdog-abandoned send can overlap the next and POST a workout twice | reject | dismissed by owner 2026-10-22 |
| 0 | P3 | - | note-text.js `\n` fix runs on any imported workout's notes, not only Hevy's | reject | dismissed by owner 2026-10-22 |
| 0 | P4 | - | HevierLocationPlugin (API < 30) requestSingleUpdate listener not removed after 25 s fallback | reject | dismissed by owner 2026-10-22 |
| 1 | F1 | medium | Exercise cards keyed by place, so D2 touched marks move to another exercise after a remove, swap or reorder (a cardio ▶ then counts on from a grey time) | accept | card keyed by place and exercise id; test (remove the exercise above, its typed reps must not show firm on the next) failed before, passes after |
| 1 | F2 | medium | A tap on PREVIOUS of a ticked set overwrites its logged weight and reps, no undo | needs your call | D3 says a tap copies, without excluding ticked sets; refusing it changes how the row works |
| 1 | F3 | medium | Finish from the watch and the forgotten-workout auto-finish save without gym, brand and cable labels | accept | new store watcher `finish-labels-run.js` labels the workout a live session just became, any path; integration test through `finishWorkoutNow` failed before (no hvBrand), passes after; the OpenBite phase (D93) still only on the sheet's Save (async read) |
| 1 | F4 | low | Restoring a grey value left empty puts back the whole exercise's sets as at focus, which can undo a tick made meanwhile from the watch | defer | needs a watch tick while a typed-over field stays focused and empty |
| 1 | F5 | low | Finish stopping a running count-up timer is untested | accept | test added; it fails with the stop line disabled, passes with it |
| 1 | F6 | low | "Discard and start" on Routines drops the session without `markDiscarded` | reject | watch-sync's store watcher marks any session that leaves without being saved (`leftUnsaved`, lib/watch-sync.js:1311) |

Round 1 tests: the area's files plus finish-labels and gym-labels, 51 files 391 passed.
