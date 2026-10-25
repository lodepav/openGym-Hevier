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
| U5 | low | H3 | The routine editor's Done lands on the Workout tab, not the routine page it came from | **fixed** (hevier/back-index, seam S47): reproduced from a card's ⋯ → Edit routine. A sheet's history entry had no router index, so a page opened from a sheet read `idx` null and every back button went to its fallback; the entry now carries one. The routine page's and editor's fallback is `/routines`, not `/workout` (the open workout) |
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

## Round 2 (2026-10-25, J3 two-gym lifter, J4 per-side and timer user)

Build of hevier/main 76f693a7b. Both finished (J3 about 33 taps, J4 about 27). 123 tool calls,
16 minutes. The device's test profile had drifted from JOURNEYS.md (one gym, no remembered brands,
no folder); the reviewer made a second gym in the journey. Ids are this round's (R2-).

| Id | Sev | Rule | Claim | Outcome |
|---|---|---|---|---|
| R2-U1 | medium | H6 | Add Exercise's "Insert after …" button lost its verb, centred and clipped at both ends, the name in lower case | **fixed** (hevier/ux-round2): the verb stays, the name is cased as elsewhere and only it is cut short |
| R2-U2 | low | C5 | The brand sheet still said "Remove label" | **fixed**: "Remove brand" |
| R2-U3 | low | C5 | A gym is a gym, an equipment profile, a profile and "Equipment" along one path | **fixed in part**: the gym sheet's "Manage gyms" reads "Each gym's equipment". **Deferred**: upstream's "Edit profile" sheet, "Delete profile?" and the page title "Equipment" (no seam reaches them; offer upstream) |
| R2-U4 | low | A1 | The exercise block's brand, notes and rest lines are 24–28 dp and touch each other | **rejected** (the user, 2026-10-25: keep the compact look, D7) |
| R2-U5 | low | A4 | The cable chip shows "Cable ×2" but is spoken "Cable setup" | **fixed**: "Cable setup: Two stacks" |
| R2-U6 | low | A9 | The moved toast sits over a low ticked row | withdrawn by the reviewer |
| R2-U7 | low | C3 | A cardio set's PREVIOUS read "15:18 @ 0 km/h" | **fixed**: no speed, the clock alone (`hevySetLabel`) |

Improvements: **fixed**: the set timer's ▶ / ■ name their set; a cardio set's time is spoken
"Time", as a hold's; the brand and gym lines are spoken "Brand: …" and "Gym: …"; a per-side
PREVIOUS names its side. **Deferred**: the gyms page's trash buttons all spoken "Delete" (upstream).

Notes for the user, and what became of them (2026-10-25): at a gym where an exercise has no brand,
a set below an older branded best got a trophy: **fixed** at the user's request (D51: a session with
no brand has every brand's best as its bar); a brand picked in the session does not follow a gym
change: **kept**, the user's choice (D28); with every match hidden, the hidden list sat under the
keyboard: **fixed** (D67: the line stands alone); the next-set highlight and the rest bar carry on
while a set timer runs (D53, D71): noted. The device's test profile is to be set up as JOURNEYS.md
describes before round 3 (agreed).
