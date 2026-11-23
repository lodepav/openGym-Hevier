# Implement-review: area `routines`

Branch `hevier/review-routines`, from hevier/main 5fef13e5e. Files: `python3 hevier/review/areas.py routines` (70).

Intent: starting a routine (from Today, its page or Routines) opens exactly what the routine
and its one-time plan say (D128): sets, warm-ups, timed holds (D146), the gym's brand and cable
setup (D28, D43, D82), per side (D75), last time's numbers unless its progression is on (D69).
Editing a routine (the editor, Update routine? after Finish, copy, folders) never changes a past
or running workout (D35, D130). The rotation picks the right next day, keeps the owner's planned
days and restarts from a redo (D124). The exercise picker finds by name, alias and brand, and
filters and groups by the gym's equipment and by muscle (D36, D62-D65, D67, D74, D76).

Decisions: D15 D28 D35 D36 D37 D41 D43 D45 D47 D62 D63 D64 D65 D67 D69 D74 D75 D76 D82 D89
D103 D124 D126 D128 D129 D130 D134 D141 D146.

Baseline: vitest 29 files, 311 passed (the area's own test files); node --test
routine-snapshot.test.mjs 3 passed.

## Ledger

| Round | Id | Sev | Claim | Decision | Reason |
|---|---|---|---|---|---|
| 0 | P1 | - | Hevy export toggle off/on within ~20 s during a send can leave it off | reject | dismissed by owner 2026-10-22 |
| 0 | P2 | - | Watchdog-abandoned send can overlap the next and POST a workout twice | reject | dismissed by owner 2026-10-22 |
| 0 | P3 | - | note-text.js `\n` fix runs on any imported workout's notes, not only Hevy's | reject | dismissed by owner 2026-10-22 |
| 0 | P4 | - | HevierLocationPlugin (API < 30) requestSingleUpdate listener not removed after 25 s fallback | reject | dismissed by owner 2026-10-22 |
| 1 | F1 | medium | A per-side set planned Normal over last time's per-side hold opens at the routine's weight on each side, only the row's own `w` taking last time's | accept | `backToReps` in routine-holds.js puts each half's weight on its side and syncs the row; the side test fails with the side branch disabled (the old behaviour for a side set), passes after |
| 1 | F2 | low | D128's plan is not shifted when a work set (or the first of a repeated exercise) is taken out in the editor, so it lands on the next set | defer | visible in the accent colour on the routine page before Start, used once; the fix reaches from the editor into `S.hvPlan` |
| 1 | F3 | low | Planned Normal over last time's hold takes last time's weight without `weightOrigin: 'manual'` and `hvLast`, so it is not grey and set 1's edit cascades onto it | accept | marked as plain-routine.js `own` marks a filled row; the updated expectation failed before (no marks), passes after |
| 1 | - | - | notes: `startLabelKey` reads the first of a repeated exercise's label; `brandMatches` matches any 2-letter word inside a brand | - | not findings |

Round 1 tests: the area's files, 29 files 311 passed.
| 2 | G1 | medium | With a rotation and no planned days, once today is trained or rested `nextPlanned` finds nothing (upstream's `queueNext` answers only for today), so Today reads "Nothing planned" and Routines marks no next | needs your call | D124 has the line follow the days the Calendar shows, and upstream's Calendar paints the rotation only on today; asking each later day as of itself would show tomorrow's session on Today, a visible change |
| 2 | G2 | medium | A refill of a loop with rest days or repeats still sweeps the planned days (`advanceLoop` in rotation.js, outside seam S64), against D124's "a pass refill never deletes plans" | needs your call | the fix widens seam S64 into upstream's `advanceLoop`, also called by the rotation edit's resync, which should keep sweeping |
| 2 | G3 | low | Save clears the whole routine's D128 plan, also an exercise swapped away by the gym before its plan was laid (next-plan.js comment says it stays) | defer | D128 says the plan is used up by that workout; one re-typeable number |
| 2 | G4 | low | The plan key counts repeats over the session's entries, so a gym swap to a backup that is also in the routine lays the other slot's plan | defer | needs a backup that is also elsewhere in the same routine |
| 2 | G5 | low | Add routine inside a running workout neither lays nor uses that routine's plan | defer | D128 names Start from the page and Today; nothing is lost, the plan shows in the accent colour |
| 2 | G6 | low | The routine page and Today show the routine's exercise where the gym will swap it to a backup at Start (D46/D86) | defer | preview only; the start's toast names the swap; showing the swap is a visible change |
| 2 | G7 | low | `gymLacks` checks only equipment and accessories, so "Needs …" can be empty or name kit the gym has when machine kinds or own kit hide the exercise | defer | wording only, the filter itself is right; the fix changes visible text |
| 2 | G8 | low | rotation-restart.js's later-workout guard and its earliest-in-sequence pick have no test | accept | mutation survived: with the guard removed, and with `credited.find` for `seq.find`, the old tests stayed green; two tests added, each fails under its mutation and passes on the code |
| 2 | - | - | notes: a never-done pyramid Max set reads "× 0" on Today and the routine page; Today.jsx runs `nextSession` per routine on every render without a memo | - | not findings |

Round 2 tests: rotation-restart.test.js 8 passed (6 before).
| 3 | H1 | medium | Update routine writes "No timer" as `restSec: -1` (the routine keeps timing rest) and a rest set back to the default leaves `restOff`, so nothing changes | accept | written as upstream's `updateRoutineFromEntry` writes it (`restOff`, cleared on any rest change); test (No timer, then back to default) failed before (`restOff` undefined), passes after |
| 3 | H2 | low | The editor's rest chip and the routine page ignore `restOff` from the settings sheet, and the chip's 0:00 leaves the timer off | defer | display, reached only through the settings sheet's No timer; the fix changes what the chip shows |
| 3 | H3 | medium | With an exercise twice and the first removed in the workout, Update matches the done one to the first slot (positional twins): the heavy slot stays, gets the back-off's note, the done one goes, and "new order" is reported | defer | upstream's documented twin rule (`routineSlotIndex`); the fix needs each entry stamped with its slot at Start, outside this area's helpers; rare |
| 3 | H4 | low | A routine edited between Start and Finish is reverted by Update (an added exercise counts as removed) | defer | the box is unticked by default (D129) and the summary shows the −1; same stamp as H3 |
| 3 | H5 | low | Today's week strip names a missed past day from the weekly plan, not that day's override | defer | display only |
| 3 | - | - | 1 withdrawn (warmupRows written without `warmup: 'own'`: progression-on only); notes: the Finish sheet's Update has no Undo (outside the area); routine-snapshot clicks the first "Start"; `autoMuscleOf` of a custom exercise reads the user's choice for the catalogue one | - | not findings |

Round 3 tests: the area's files, 29 files 314 passed.
