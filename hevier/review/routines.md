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
