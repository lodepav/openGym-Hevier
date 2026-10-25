# UX review ledger

Every UX review round's findings and what became of each one. The next round's reviewer gets this
file, so it does not raise a finding that was already rejected or deferred again unless it has
new evidence.

For each finding: its id, severity, rule, a one-line claim, and the outcome: **fixed** (with its
commit), **discuss** (waiting for the user), **rejected** (with the reason, often a decision Dn)
or **deferred**.

## Round 1 (2026-10-25, J1 routine lifter, J2 Hevy switcher)

Build of hevier/main 4e380dd71 on the test profile. J1 finished in about 20 taps; J2 stopped at the
import (no CSV on the device, a real import is on the never-do list). 154 tool calls, 17 minutes.

| Id | Sev | Rule | Claim | Outcome |
|---|---|---|---|---|
| U1 | medium | H5 | A brand stored as "Life Fitness" never reads history logged as "LifeFitness": PREVIOUS and the chooser treat them as two machines | **rejected** (the user, 2026-10-25: keep as is). The mismatch came from the round's hand-typed test setup; the app's own paths write one spelling |
| U2 | medium | A3 | The rest bar's −15 and +15 are both spoken "15s" | **deferred**: upstream's `RestTimer.jsx`, no seam; offer upstream (aria-labels "Subtract/Add 15 seconds") |
| U3 | low | A1 | Rest bar buttons 33 dp tall, no larger hit area | **fixed** (hevier/ux-round1): an invisible 6 dp above and below in `theme.css` |
| U4 | low | H2 | "Update routine?" says weights stay with the progression on a routine without progression | **fixed**: the line follows D69's switch |
| U5 | low | H3 | The routine editor's Done lands on the Workout tab, not the routine page it came from | **deferred, to investigate on the device**: `history.state.idx` read null there. Likely a sheet's history entry replaced by a nav (`closeThenNav`) loses the router's index, which every fork back button reads, so it may be wider than this one button |
| U6 | low | C5 | "Replace exercise" opens "Swap exercise"; the brand is "label", "machine label" and "brand" | **fixed** (the user's choice: "Replace", and "brand"): the swap picker's title reads Replace exercise; Add brand, Brand everywhere. Upstream's own "Swap exercise?" confirmation is left |
| U7 | low | C3 | Feed card rows read "0 sets" for an exercise done only as warm-ups | **fixed**: "4 sets (Warm-up)" (upstream's plural keys only) |
| U8 | low | H1 | Workout Detail's date and gym line breaks around a block icon | **fixed**: inline, with the gym line's pin |
| U9 | low | H4 | lb field 110.23 beside PREVIOUS 110.2 | withdrawn by the reviewer (D41) |

Improvements: **fixed**: Start Routine and More named with their routine, folder or exercise; the
effort button named with its set and value. **Deferred**: the body map's 116 unnamed nodes and
dialogs without `role="dialog"` (upstream's components); the undo toast covering "+ Add Set"
and the rest bar: **fixed** at the user's yes, it sits 96 dp up in the workout.

Notes for the user: no tap path to reorder routines and folders for a touch screen reader (D13,
the handle is keyboard only); a rep range exists only with progression on (D15, D69); Save
Workout's "N sets still unchecked. Finish the workout now?" asks with no answer buttons, and shows
the duration twice (D10).
