# Go Hevier user journeys for UX review

Each journey is one person with one goal, walked from app launch on the emulator. The
`ux-reviewer` agent gets two journeys per run, run one after the other on the single emulator.
For each journey it reports whether the person finished, how many taps it took, where they
hesitated or could go wrong, and its findings against [STANDARDS.md](STANDARDS.md). The ledger
([LEDGER.md](LEDGER.md)) goes with every run, so a finding already rejected or deferred is not
raised again.

Each journey has two modes. **Walk**: the `ux-reviewer` agent walks it as above and judges it.
**Check**: `hevier/tools/journey-check.sh` taps the same steps through over `cdp.mjs` and checks
the end state, the saved data read from the app's store after a restart, not pixels. It is for
after an upstream merge: a merge can keep every unit test green and still break the wiring (a seam
no longer called, a moved handler, a sheet that will not open). Each journey's **Check:** line says
what its end state must be and which steps are scripted; J1, J8 and J8b are, the others are Walk
only for now. Every failed check fails the run, and so does a difference from the baseline kept on
this machine (`~/.cache/hevier/journeys/<J>.json`; `--accept <J>` keeps a meant change). The script
saves the app's data first and puts it back on every exit.

```bash
ANDROID_SERIAL=<serial> hevier/tools/journey-check.sh            # J1 J8 J8b
ANDROID_SERIAL=<serial> hevier/tools/journey-check.sh J8 --accept # J8's differences are meant
```

Adapted on 2026-10-25 from the OpenNutriTracker fork's journeys. What they learned: one pair of
journeys takes about 25 minutes and 170 tool calls, and an unusual profile (theirs mixed units)
found most of the real bugs. Here, round 1 (J1 and J2) took 17 minutes and 154 tool calls.

## Before and after a round (the session that starts the reviewer)

**One heavy job at a time.** The emulator together with Gradle or a test suite has run this
machine out of memory. Start the reviewer only with the emulator up (`hevier/tools/emulator.sh`,
headless, its serial as `ANDROID_SERIAL` on every call) and nothing else building.

**Snapshot the app first, and restore it after.** Journeys log workouts and change settings. The
debug build is debuggable, so its whole data folder can be saved and put back. (checked 2026-10-25 for a round trip; the app has no `databases` folder, and naming one corrupts the archive.)

```bash
ADB=~/Android/Sdk/platform-tools/adb; APP=ch.duartesantos.opengym.hevier.test
SNAP=<scratchpad>/ux-snapshot.tar
$ADB shell am force-stop $APP
$ADB exec-out "run-as $APP tar -cf - files shared_prefs app_webview 2>/dev/null" > "$SNAP"
tar -tf "$SNAP" > /dev/null   # a tar error here means the device's stderr got into the archive
# … the round …
$ADB shell am force-stop $APP
$ADB exec-in run-as $APP tar -xf - < "$SNAP"
$ADB shell monkey -p $APP -c android.intent.category.LAUNCHER 1
```

**The test profile.** Set up once before the first round, through the app (the real history comes
from `~/Downloads/workout_data.csv`, loaded as the hevy-csv-test-data note describes; the user's
own plan, with routines, a rotation and calendar plans, is in their backup
`~/Downloads/opengym-backup-2026-11-15.json`, loaded through Settings → Data → Import backup and
Replace anyway, which replaces the device's data, so save the snapshot first):

- kg profile, with one exercise shown in lb (D41: the workout's ⋮ → Weight unit on the bench press)
- two gyms, each with a different brand on the leg press (D28), and one cable exercise set to ×2 (D43)
- Effort set to RIR (D6), Volume as sets per muscle (D18)
- one routine with progression on (D69) and the rest left at the default, off
- a routine in a folder, and one per-side exercise (D75) in a routine
- a routine with progression off whose exercise has a warm-up slot and a logged warm-up, and one
  with progression on whose exercise has a warm-up ramp (D69): `tools/routine-snapshot.mjs` types
  into each to see what the warm-ups do

The mixed profile is the point: the bugs live where two settings meet.

**The owner profile** (J8, J8b): the owner's own data, from `~/Downloads/opengym-backup-2026-11-18.json`
(never changed), imported through Settings → Data → Import backup, Replace, with Effort on RPE and
warm-up effort off (both already so in the backup), and saved as `~/.cache/hevier/owner-profile.tar`
beside `ux-profile.tar`, in the same format. `hevier/tools/journey-check.sh --make-owner-profile`
makes it that way (the app's data saved before and put back after). The expected numbers come from
the backup's last Upper A and Lower A, its gyms (Lemon Gym Grostonas iela 1 and Andreja Saharova
iela 30) and its brands, and are pinned in the baselines.

**Set up on 2026-10-25** (gyms Holmes Place and Weekend Gym, the leg press 0739 Life Fitness and
Hammer, cable 1323 ×2, the bench press 0047 in lb, Push Day with progression on, Leg Day in the
Legs folder with a per-side slot; on 2026-11-14 Pull Day's barbell row 0027 got one warm-up set
and a logged Pull Day with a warm-up, and Push Day's 0334 two ramp warm-ups) and saved on this
machine as `~/.cache/hevier/ux-profile.tar`,
outside the repo. Restore it before a round (as above, with `SNAP` pointing at it) rather than
setting it up again. If it is gone, set the fields through the store over CDP (the `useStore`
module's export with `getState().S`, then `update(S => …)`). An edit of the WebView's
`localStorage` alone is lost at the next start: the app reads `files/opengym-state.json` first, so
stop the app, edit that file (`run-as`), set its `_ts` to now (the newer of the two copies wins)
and start it again.

## J1 The routine lifter (the most common day)

Trains four days a week from routines and wants to be in and out.

1. Open the app. Today shows the next session with the sets it opens with (D134). Start it
   from there, or open the plan, plan one heavier set, and start from the plan's page (D128).
2. Do the first exercise: tick a set as prefilled, change the weight of the next one, tick it.
   Is it clear which set comes next, and what last time was?
3. Let the rest timer run in the panel at the bottom, add a minute, then skip it (D127).
4. Swap an exercise for one of its backups (the exercise's Swap button, D129).
5. Delete a set by swiping, and undo the delete.
6. Finish: the sheet over the workout (D132). Leave "Update the routine too" unticked and
   Save. Does Today show the workout as the last one, with "Workout saved"?
7. Find the workout on the History tab and open it. Do the numbers agree with what was shown
   live (G8)?
8. Clean up: delete that workout.

**Check:** a new workout named as Today's card said; the set ticked as opened saved as opened, the
retyped one at the weight typed; the rest ran, +1 min added a minute, Skip ended it; the swapped-in
exercise is in the workout; the routine is unchanged; Today said "Workout saved"; History lists the
workout and its detail shows the typed weight. Scripted: steps 1 (from Today), 2, 3, 4, 6 and 7.
Step 5 (a swipe) is Walk only; step 8 is the profile restore. The routine is the one Today plans,
which moves with the date, so the baseline keeps only which rules held.

## J2 The Hevy switcher

Has used Hevy for a year and wants their history and routines to come along.

1. Settings → Data & backup: find the import. Read what it offers. **Do not import**: the
   history is already loaded. Open the CSV import's summary only if the file is already on the
   device, check **Check exercise matches** and **Check cable setups**, then cancel.
2. Lifts: find the leg press by its brand ("life fitness"). Open its page.
   Does the label chooser make sense?
3. Today → Routines: browse the routine folders, open a routine's page (a tap on its row), then
   its editor. Change an exercise's number of sets, then put it back (a rep range shows only
   with progression on, D69).
4. Compare what was learned in Hevy: is anything named differently in a way that would confuse
   a Hevy user (C5, H2)?

**Check:** nothing is imported (S.workouts as before); the routine edited and put back has the same
sets as before (its exercises, sets, reps and warm-ups); the leg press's brand is unchanged. Not
scripted yet. Step 4 is judgement only.

## J3 The two-gym lifter

Trains at a city gym on weekdays and a smaller one at weekends.

1. Start an empty workout. Change the gym from the gym line (**not** Find gyms nearby: it
   reads the location and sends it to OpenStreetMap).
2. Add the leg press. Does its brand follow the gym? Change the brand and check that PREVIOUS
   follows (D82).
3. Add a cable exercise, switch it to ×2, and read the weight column's header.
4. Open Add Exercise and search for something the gym lacks. Is the "hidden at …" line clear
   (D67)?
5. Discard the workout. Is the question clear, and does it ask first?

**Check:** no workout saved (S.active empty, S.workouts as before); the brand picked for the leg
press stays for that gym in S.hvMachines and the other gym keeps its own; the cable's ×2 is in
S.hvCables for that gym; no gym added (Find gyms nearby never tapped). Not scripted yet.

## J4 The per-side and timer user

Does rehab work: single-leg exercises, planks and the bike.

1. Start an empty workout and add a single-leg exercise. Does it start per side? Log one set,
   right first (More → Side order).
2. Add a plank. Use the set's ▶ timer, stop it, and tick the set.
3. Add the bike. Type a time with the number pad (`1234` should read 12:34).
4. Leave the app with the set timer running (Home button), wait 20 s, come back. Is the
   time right (P2)?
5. Discard the workout.

**Check:** no workout saved; the single-leg exercise's side order is right first in S.hvSideOrder;
while it ran, the plank's hold kept the time stopped and the bike's set read 12:34 (min 12.57),
and after 20 s away the set timer showed the time since ▶. Not scripted yet.

## J5 The numbers person

Wants to know whether they are progressing.

1. History: read this week's three numbers. Open Statistics: read the weekly chart, switch it
   between duration, sets and reps, and tap a week.
2. Statistics: read the tiles and the sets per muscle card. Is it clear what a set counts
   (D42's caption)? Open Arrange Statistics, hide a card, move a tile, then Reset (D142).
3. Open the Monthly report, go back a month, and tap a record.
4. Lifts: open a lift's page (D131): the last sessions, the best at each rep count, the chart,
   the strength level section (do not save levels), All history.
5. Open a past workout's Workout Detail: do the ↑ = ↓ arrows explain themselves (D66)?
6. Calendar: show earlier months, and a planned day.

**Check:** read only: S.workouts, S.routines and the strength levels as before; after Reset the
statistics layout is the default again. Not scripted yet.

## J6 The planner

Sets up next month's training.

1. Today → Routines → Rotation (at the end of the list): read the weekly plan. Change one day, then put it back.
2. Create a routine in a new folder: three exercises, one superset, a warm-up set, a rep range.
   Reorder two exercises by their handles, and once by the tap path (A8).
3. Open ⋯ → Backups on one exercise in the editor: add a backup and mark it missing at one gym (D86).
4. Delete the routine and the folder. Is each step confirmed or undoable?

**Check:** S.rotation and S.dayPlan as before; S.routines and S.hvFolders as before (the routine
and folder made and deleted); the backup marked missing went with its routine (S.hvGymMissing as
before). Not scripted yet.

## J7 Low vision, one hand, in the gym

Wears no glasses at the gym and holds a phone in one hand between sets.

1. Set `font_scale 2.0` and relaunch. Walk J1's steps 1–6 on Today, the plan's page and the
   live workout (A6, G7).
2. With TalkBack's view of the page (the AX tree), read a set row, the set-type letter, the
   tick, and the rest timer's buttons (A3, A5).
3. Put `font_scale` back to `1.0` and relaunch.

**Check:** J1's end state at `font_scale 2.0`, and `font_scale` back at 1.0 afterwards. Partial:
what is readable and reachable with one hand is judgement only (Walk). Not scripted yet.

## J8 The owner's Upper A

The owner trains four times a week, sometimes with a fifth session of cardio, from a rotation of
Upper and Lower routines at two Lemon Gym clubs, and logs every set right after it with the phone
lying nearby. Profile: the owner profile. Gym: Lemon Gym · Grostonas iela 1.

1. Open TBJP Upper A's page and Start it. Pick Lemon Gym · Grostonas iela 1 on the gym line (from
   the list, never Find gyms nearby).
2. Lever incline chest press (1299, LifeFitness here): type the top set's weight 2.5 kg up, then
   tick the three warm-ups as opened, the top set with RPE 9.5 and the back-off with RPE 9. The
   warm-ups must not move when the top set is retyped.
3. Military press (0587): change the brand where it shows to Evolve; PREVIOUS follows it. Type the
   top set's weight in kg, 72.6 (the owner types an Evolve machine's kg as Evolve shows it), and
   tick every set, the working ones with RPE 9.
4. Cable bar lateral pulldown (0150): the brand line shows ×2 at this gym. Tick every set as
   opened, the working ones with RPE 9.
5. Preacher curl (0592, note "One arm"): its routine slot is not per side, so switch it on in the
   workout (More → Per side → the Per side switch → Done), as the owner does. One-arm triceps
   extension (0362) opens per side. Log set 1 as L 10 / R 8 and L 11 / R 9 at the weight shown,
   each side with RPE 9.
6. Add the workout note "Journey check" from the header.
7. Finish, leave "Update the routine too" unticked, Save. Today says "Workout saved" and names the
   next session. Walk only: open it from History (L/R rows, the RPE column, ↑ = ↓ marks).

**Check:** the workout is "TBJP Upper A" at Grostonas; 1299's warm-ups saved as opened and
unchanged by the retyped top set (the 2026-11-14 merge regression), the top set at the weight typed
with RPE 9.5, the back-off with RPE 9, no warm-up with an effort (S.hvWarmupEffort off); the
estimated 1RM and S.exWeights come from the top set, not a warm-up; brands as this gym has them
(1299 and 0150 LifeFitness, 0150 cable ×2), 0587 Evolve with 72.6 kg saved as typed and PREVIOUS
changed with the brand; S.hvMachines changed only by 0587 at Grostonas, S.hvCables not at all; the
per-side sets saved L 10 / R 8 and L 11 / R 9 at one weight; the routine unchanged; the note saved;
the rotation's pass starts over from Upper A, Lower A next in it (D124, "redoing A restarts from
that workout"); Today names what the plan has next, not Upper A again (D124: on 2026-11-25, with the owner's
calendar, that is Upper B; once the planned days have passed, the rotation's Lower A). The Hevy
export is built from the saved workout with `hevy-export.js` and never sent: 1299 goes as Incline
Chest Press (Machine) (D138) with the note "LifeFitness", 0150's note starts "LifeFitness · cable
×2", the per-side sets read "Set 1: L … × 10, R … × 8", warm-ups carry no RPE, the description
starts with the note and says "At Lemon Gym". Every step is scripted but the History look.
`--hr` (off by default) also wants a heart rate on every ticked set, which needs the strap
(`hevier/tools/fake-strap`) paired by hand on a second emulator; without `--hr` it is not checked.

## J8b The owner's rehab (Lower A)

The Achilles rehab on the calf raise, at the other club. Profile: the owner profile. Gym: Lemon
Gym · Andreja Saharova iela 30.

1. Open TBJP Lower A's page and Start it. Pick Lemon Gym · Andreja Saharova iela 30.
2. Calf raise (1178, brand "Achilles Rehab" at this gym): it opens as last time, a per-side
   warm-up, two 75 s holds at a set weight (left, then right) and per-side rep sets. Tick the
   warm-up, both holds as opened, and the first rep set, each side with RPE 9.
3. Finish, leave "Update the routine too" unticked, Save.

**Check:** the workout is at Saharova; no prompt came up on a tick (the 2026-11-18 "Reps: 0 is
under a third" on a hold); the two holds saved as opened (time mode, 75 s, left then right, the
weight kept) and ticked; the rep set saved per side; the brand "Achilles Rehab"; S.hvMachines and
the routine unchanged. The Hevy export's note for 1178 starts "Achilles Rehab" and has "Set 1:
hold 75 s L, 75 s R at 24 kg", and no hold goes as a timed set of a reps exercise (D137). Every
step is scripted.

## Never do in a journey

- Turn on **Send to Hevy** (D34): it posts workouts to the user's real Hevy account.
- Tap **Find gyms nearby** (D47): it sends the emulator's position to two outside services.
- Import a file, restore a backup, sign in or out, reset data, or delete anything the journey
  did not add.
- Touch Health Connect switches, the heart-rate strap, or Install on an update.
