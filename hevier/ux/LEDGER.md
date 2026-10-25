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

## Round 3 (2026-10-25, J5 numbers person, J6 planner)

Build of hevier/main bcd8576d2 on the saved test profile. Both finished (J5 about 20 taps, J6
about 35). 124 tool calls, 14 minutes. Ids are this round's (R3-).

| Id | Sev | Rule | Claim | Outcome |
|---|---|---|---|---|
| R3-U1 | medium | H4 | The monthly report writes a record beaten N times as "×N", next to reps and the cable's ×2: "20 kg × 15 ×4" | **fixed** (hevier/ux-round3): "· 4 times" |
| R3-U2 | medium | G8 | A one-limb exercise's Best Set Volume reads 28 kg × 11 in the report (one side, D51's records) and 28 kg × 22 in exercise details (upstream's both-sides total) | **fixed** at the user's yes: details read one side too (D51) |
| R3-U3 | medium | A8 | Long-press reorder did nothing in a routine made on the same visit | **fixed**: the hook's touch listener is attached again once the list has rows (`useDragReorder`); the tap path (Move up / down) already worked |
| R3-U4 | low | C4 | Workout Detail wrote "300kg × 1 reps" | **fixed**: "1 rep" (also the share card) |
| R3-U5 | low | C1 | The Backups sheet's title read "Backups For Lever Lying Leg Curl" | **fixed**: only the name is cased |
| R3-U6 | low | H4 | The Plan page (Workout tab → Schedule) has no ‹ and no page bar (D49) | **fixed** at the user's yes: the fork's bar with ‹ (D49) |
| R3-U7 | low | H2 | The weekly chart's Reps headline "0 this week" had no unit | **fixed**: "0 reps this week" |
| R3-U8 | low | A3 | The routine editor's ⋮ buttons were all spoken "More" | **fixed**: "More, <exercise>" and "More, <routine>" |
| R3-U9 | low | A7 | The Calendar page had no headings | **fixed**: each month title is a heading |
| R3-U10 | low | H1 | Adding several exercises to a routine named only the last | **fixed**: "3 exercises added to …" |

Improvements: **fixed**: the week bars spoken "Week of 12 Oct: 47 sets"; the Backups gym chips
spoken "Lever Lying Leg Curl: available at Holmes Place"; the empty folder's hint names ⋯ → New
Routine too; the monthly report's month buttons and the Routines heading's icons get a 48 dp target.
**Fixed** at the user's yes: a tap on any week puts its value in the headline (D14).

Notes for the user: Workout Detail's ↑ = ↓ (D66) say what they compare with only to a screen
reader; a gym's "missing" mark (D86) applies to every routine with the exercise, which the sheet
does not say; Schedule is an unlabelled icon (D13); planned-day names on the Calendar are 9 px
(D68); the week's Sets bar counted a cardio set the muscle sheet leaves out (47 against 46), seen
only in its hidden title.

## Round 4 (2026-10-25, J7 low vision and one hand)

Same build, font scale 2.0, then 1.0 to measure. Finished (about 21 taps; Start Routine is two taps,
G6). 96 tool calls, 11 minutes. Rounds 1 and 2's fixes on the live workout re-checked on screen and
holding (rest bar height, Update routine text, Replace and Add brand, cable and gym names, the
named Start Routine, More and effort buttons, the toast clear of the rest bar).

| Id | Sev | Rule | Claim | Outcome |
|---|---|---|---|---|
| R4-U1 | medium | A1 | The set's tick hit area is 41×44 and the RIR button's 57×24 (touches D4, D6) | **fixed**: the tick's target runs to the row's right edge, the RIR button's is the row's height; nothing moves |
| R4-U2 | medium | A1 | Finish (64×31) and Save Workout's Save (58×32) had no extra hit area | **fixed**: 8 dp above and below (and Done) |
| R4-U3 | medium | A6, G2 | At 200% PREVIOUS cut off last time's reps ("80kg …") | **fixed**: it wraps onto a second line; at the normal size it fits on one as before (checked on screen) |
| R4-U4 | low | A6 | At 200% the set table's headers ran together ("SETPREVIOUS") | **fixed**: each header cell is cut short on its own ("S… PREVIO…") |
| R4-U5 | medium | A3, A4 | Picker rows were spoken "Details Barbell … Chest Details", and a ticked row was not spoken as ticked | **fixed**: the row is named by its exercise, muscle and brand, pressed when ticked in a multi pick; the chart button is "Details, <exercise>"; the thumbnail is left out of the reading order |
| R4-U6 | low | A3 | Feed cards were one button named with the whole card, Share and ⋯ without the workout | **fixed**: the card is "Push Day, Sun, 25 Oct · 13:06", its buttons "Share workout, Push Day" and "More, Push Day" (checked on screen) |
| R4-U7 | low | A3 | A warm-up's tick was spoken "Warm-up", two warm-ups alike | **fixed**: "Warm-up 1 done", "Warm-up 1, Weight (kg)" |
| R4-U8 | low | A1 | Rest bar Pause and Skip are 40 dp wide | **fixed**: 4 dp more on each side, meeting in the gap between them |
| R4-U9 | low | A6 | "Edit Home" is cut to "Edit Ho…" at 200% | **rejected**: D49's bar, the meaning is clear, rarely used |

Improvements: **fixed**: the set number is spoken "Set 1, Set type". **Deferred**: the rest clock
without `aria-live` and its two names (upstream's rest bar, `#timer`; offer upstream), Home's
week-strip days spoken without trained or planned (low).

Notes for the user: at 200% the workout's sticky header takes a third of the screen with the
keyboard down (a smaller header at large fonts would be a discuss item); the swipe-delete undo
toast lasts 5 s (upstream's `TOAST_ACTION_MS`, D9); upstream's confirmation dialogs are 260 dp
wide, so their text breaks every few words at 200%.
