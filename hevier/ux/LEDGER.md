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

## Round 5 (2026-10-25, the warm-up relay and exercise time, D69, D88)

Targeted round on the two new features, J1's lifter and J5's numbers person. Branch
`hevier/ux-round5`.

| Id | Sev | Rule | Claim | Outcome |
|---|---|---|---|---|
| R5-U1 | medium | H5 | A warm-up made a work set again, after set 1 was typed into, put the warm-up's numbers (20 × 5) on work set 1 | **fixed**: a work-set slot whose row was typed takes last time's set for it (`relaySuggestions`, test beside it); checked by unit test, not on screen |
| R5-U2 | low | H4 | Exercise time's totals and averages were written differently ("6s total" beside "7s") | **fixed**: both rounded to the second, same words |
| R5-U3 | medium | A1 | The page's chips were 29–32 dp tall | **fixed**: an 8 dp hit area above and below every `.hv-chip` |
| R5-U4 | low | H6 | Workout Detail's time line is an unlabelled "⏱ 12min 58s", the same icon as the live Rest Timer line | **discuss**: a visible "Exercise time" label or another icon; spoken "Exercise time" already |

Improvements: **fixed**: the average is spoken "Average: 7min".

Notes for the user: the test profile has no routine with a full history and progression off, so
the relay was seen on a seeded one; upstream itself moves a typed row when a warm-up becomes a
work set; the seeded history's tick times are 0–1 s apart, so exercise time was looked at on a
demo workout added for the screenshots and removed again.

## Round 6 (2026-11-14, after the upstream 1.4.5 merge: J1 routine lifter, J2 Hevy switcher)

On `sync/v1.4.5` at `4c32b3335` plus the strap commit. J1 finished in about 20 taps, as round 1;
J2 as round 1 (the import summary not opened: no Hevy CSV on the device). The earlier fixes hold;
round 1's U2 (the rest bar's − 15s and + 15s names) is fixed by upstream 1.4.5. J3 to J7 are
still to run after this merge.

| Id | Sev | Rule | Claim | Outcome |
|---|---|---|---|---|
| R6-U1 | low | A1 | The routine card's name and the exercise name in the workout and the editor are 22 dp tall | **fixed**: an invisible hit area, the card's over its exercise line |
| R6-U2 | low | A5 | The routine editor's fields are spoken "KG Set 1", "REPS Set 1" | **fixed**: "Set 1, Weight (kg)", "Set 1, Reps" |
| R6-U3 | low | H4 | Data & backup: Delete workouts only and Reset everything read as part of Bring data in | **fixed**: a 20 dp gap above an untitled settings section |
| R6-U4 | low | A1 | Exercise details: the Brand and Range choosers are 34 and 30 dp tall | **open**: slightly visible, so discuss |

Improvements, open: one wording for the delete toast ("Set 4 gone." and "Set removed"); "Edit
Workout" and "Edit workout" on Workout Detail; Nice work's card writes a 0 kg set as a bare "8"
(upstream's); Import from another app does not say where Hevy's CSV comes from (upstream's row).

Note for the user: with a weight field focused by script on the headless emulator, the cells to
its right were drawn about 20 dp left of where the page has them; worth one look on a real phone.

## Round 7 (2026-11-15, after the 1.4.5 merge: J3 two-gym lifter, J4 per-side and timer user)

Both finished, roughly as round 2 (21 and 30 taps). Fixes in `aec722eae`.

| Id | Sev | Rule | Claim | Outcome |
|---|---|---|---|---|
| R7-U1 | low | H4 | A per-side set's rows sit 16 dp off the header and are wider than the screen | **fixed** (the user: fix it): a pair inside a swipe row no longer bleeds twice; cells line up with the header, checked on screen |
| R7-U2 | low | C4 | The picker says "1 exercises" | **fixed**: plural helper |
| R7-U3 | low | H4 | The hold clock's title writes the exercise in lower case | **open**: the title is a string, the casing is CSS |
| R7-U4 | low | H3 | ▶ on a set with a typed time starts at 0:00 and drops the typed time | **fixed** (the user: fix it): a typed time counts on from where it was, one filled in from last time starts at 0; test beside it, checked on screen |
| R7-U5 | low | A1 | The Brand sheet's chips are 30 dp tall, close to Save | **open**: the chips' class is shared with other sheets |
| R7-U6 | low | A1 | The Discard dialog's buttons are 37 dp, 8 dp apart; the resume bar's 34 dp | **fixed**: the resume bar (a hit area), and the centred confirm's buttons are 48 dp, 16 dp apart (the user: fix it); checked on screen |

## Round 8 (2026-11-15, after the 1.4.5 merge: J5 numbers person, J6 planner, J7 low vision)

All three finished. J7 went differently: upstream 1.4.5 caps text at 140% and the fork's px sizes no
longer follow the phone's font size.

| Id | Sev | Rule | Claim | Outcome |
|---|---|---|---|---|
| R8-U1 | medium | P1 | System back on Statistics, Plan and Exercises offered to exit | **fixed**: S16's `hooks.backPath`, test beside it; checked on screen |
| R8-U2 | medium | A6, G7 | Since 1.4.5 the phone's font size no longer reaches the set row and most fork text | **fixed** (the user: as before): D122 puts the WebView's text zoom back; at 200% the set rows wrap as round 4 left them; checked on screen |
| R8-U3 | low | H4 | The weekly chart's first date label sits two bars too far left | **open** (minor) |
| R8-U4 | low | H6 | Exercise details show no year on old dates | **fixed**: the year on a date from another year |
| R8-U5 | low | H3 | Leaving a new routine empty keeps a "New routine" card | **discuss** |
| R8-U6 | low | A2 | The Superset pill's text is 3.5:1 | **open**: Hevy's purple (SCREENS.md) |
| R8-U7 | low | A6 | At 200% a cardio time of 10:10 is cut to "10:1" in the TIME cell | **open**: seen while checking D122 |

## Round 9 (2026-11-16, the rework's build on `hevier/rework`: J1 routine lifter, J2 Hevy switcher)

Both finished on the rebuilt screens (D125 to D136), J2 without the CSV summary (no Hevy CSV on the
device). The numbers of the saved workout agree on the Finish sheet, the History card and Workout
Detail.

| Id | Sev | Rule | Claim | Outcome |
|---|---|---|---|---|
| R9-U1 | medium | H2 | Today's card gives an exercise shown in lb in kg, the plan page in lb | **fixed**: the card writes weights in the exercise's unit; test beside it |
| R9-U2 | medium | H7, H4 | Lifts' search does not find an exercise by its brand (D36) | **fixed**: the picker's brand search |
| R9-U3 | low | H6 | The exercise page's brand filter is a closed dropdown reading "All sets"; the mockup draws chips | **discuss** |
| R9-U4 | medium | A1 | The effort buttons and the rest panel's buttons are 44 dp tall | **fixed**: 48 dp; the 4 dp gaps between effort buttons stay (seven in a row) |
| R9-U5 | low | C2, H6 | The Finish sheet's warning and change line are worded differently from the mockup; "1 changed" has no noun | **discuss** |
| R9-U6 | low | H4 | Today's routine name is grey, the mockup's is in full colour | **fixed** |
| R9-U7 | low | P1 | Deleting a workout from Workout Detail lands on Today | **fixed**: back to the page it was opened from |
| R9-U8 | low | C5 | Settings still says "Home" (Look & Home, On Home) | **open**: upstream's page, D136 left Settings as it is; needs seams |
| R9-U9 | low | H4 | The editor's remove mark is a grey dash beside the grey dash of an empty weight | **discuss** |

Improvements, all **open**: spoken set text ("90 kilograms, 6 reps"); the "Workout saved" toast's
Open carries the undo arrow; "2 sets · 80 × 8, 80 × 7" on Today reads as two sets in all; closed
exercises in the live workout keep the "Add brand" line while the open one has the pill; a routine
that is not next shows no date on its page. Notes: a swap on an exercise with ticked sets asks
first and keeps the old exercise, so it is 3 taps; the week row cuts "… Day" names; a routine alone
in its folder has no handle.

## Round 10 (2026-11-16, the rework's build: J3 two-gym lifter, J4 per-side and timer user)

Both finished. Brand and cable changes, the hidden list at a gym, per side, side order, the hold
clock and a typed time all worked as decided.

| Id | Sev | Rule | Claim | Outcome |
|---|---|---|---|---|
| R10-U1 | medium | G7, G2 | The opened cardio set cuts a time of 10:00 or more | **fixed**: a time in the opened row is 20 px |
| R10-U2 | medium | G2, H6 | The rest panel's Next line is cut; the mockup gives weight × reps its own large line | **fixed** in part: the line wraps to two; the large line needs upstream's text split, **discuss** |
| R10-U3 | medium | A1 | Add Exercise, Settings, Discard Workout and the picker's add buttons are 37 dp tall | **fixed**: 48 dp |
| R10-U4 | low | H6 | Search rows in the picker drop the "N times · last" line; the hidden list is not yours-first | **open** (minor) |
| R10-U5 | low | A1 | The workout's gym line is 26 dp tall, 2 dp above the note row | **open**: the compact look (D7) |

Improvements, **open**: a weight typed on one side could fill the other side's untouched field
(discuss); the "Hold logged" toast covers the rest panel's Next line; the ▶ set timer is 34 dp with
a 46 dp hit area; the opened set's PREVIOUS wraps "340kg × / 4". Notes: in a freestyle workout a
brand change moves PREVIOUS but not the grey values a tick logs (D82 refills a routine's sets
only); the header has two chevrons, Minimize and the title's.
