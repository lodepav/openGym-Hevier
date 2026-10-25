# Go Hevier user journeys for UX review

Each journey is one person with one goal, walked from app launch on the emulator. The
`ux-reviewer` agent gets two journeys per run, run one after the other on the single emulator.
For each journey it reports whether the person finished, how many taps it took, where they
hesitated or could go wrong, and its findings against [STANDARDS.md](STANDARDS.md). The ledger
([LEDGER.md](LEDGER.md)) goes with every run, so a finding already rejected or deferred is not
raised again.

Adapted on 2026-10-25 from the OpenNutriTracker fork's journeys. What they learned: one pair of
journeys takes about 25 minutes and 170 tool calls, and an unusual profile (theirs mixed units)
found most of the real bugs.

## Before and after a round (the session that starts the reviewer)

**One heavy job at a time.** The emulator together with Gradle or a test suite has run this
machine out of memory. Start the reviewer only with the emulator up (`HEADLESS=1
hevier/tools/emulator.sh`, never a window) and nothing else building.

**Snapshot the app first, and restore it after.** Journeys log workouts and change settings. The
debug build is debuggable, so its whole data folder can be saved and put back. (Not tried yet:
check the first time that a restored app opens on the same state.)

```bash
ADB=~/Android/Sdk/platform-tools/adb; APP=ch.duartesantos.opengym.hevier.test
SNAP=<scratchpad>/ux-snapshot.tar
$ADB shell am force-stop $APP
$ADB exec-out run-as $APP tar -cf - files shared_prefs app_webview databases > "$SNAP"
# … the round …
$ADB shell am force-stop $APP
$ADB exec-in run-as $APP tar -xf - < "$SNAP"
$ADB shell monkey -p $APP -c android.intent.category.LAUNCHER 1
```

**The test profile.** Set up once before the first round, through the app (the real history comes
from `~/Downloads/workout_data.csv`, loaded as the hevy-csv-test-data note describes):

- kg profile, with one exercise shown in lb (D41: the workout's ⋮ → Weight unit on the bench press)
- two gyms, each with a different brand on the leg press (D28), and one cable exercise set to ×2 (D43)
- Effort set to RIR (D6), Volume as sets per muscle (D18)
- one routine with progression on (D69) and the rest left at the default, off
- a routine in a folder, and one per-side exercise (D75) in a routine

The mixed profile is the point: the bugs live where two settings meet.

## J1 The routine lifter (the most common day)

Trains four days a week from routines and wants to be in and out.

1. Open the app and start today's routine from Home's Today card, or from the Workout tab.
2. Do the first exercise: tick a set as prefilled, change the weight of the next one, tick it.
   Is it clear which set comes next, and what last time was?
3. Let the rest timer run, adjust it by +15, then skip it.
4. Swap an exercise for one of its backups (⋮ → Replace exercise).
5. Delete a set by swiping, and undo the delete.
6. Finish: Save Workout, then "Nice work!". Answer the "Update routine?" prompt with
   **Keep original routine**.
7. Find the workout on the Home feed and open it. Do the numbers agree with what was shown
   live (G8)?
8. Clean up: delete that workout.

## J2 The Hevy switcher

Has used Hevy for a year and wants their history and routines to come along.

1. Settings → Data & backup: find the import. Read what it offers. **Do not import**: the
   history is already loaded. Open the CSV import's summary only if the file is already on the
   device, check **Check exercise matches** and **Check cable setups**, then cancel.
2. Profile → Exercises: find the leg press by its brand ("life fitness"). Open its details.
   Does the label chooser make sense?
3. Workout tab: browse the routine folders, open a routine's page (a tap on its name), then
   its editor. Change a rep range, then put it back.
4. Compare what was learned in Hevy: is anything named differently in a way that would confuse
   a Hevy user (C5, H2)?

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

## J4 The per-side and timer user

Does rehab work: single-leg exercises, planks and the bike.

1. Start an empty workout and add a single-leg exercise. Does it start per side? Log one set,
   right first (⋮ → Side order).
2. Add a plank. Use the set's ▶ timer, stop it, and tick the set.
3. Add the bike. Type a time with the number pad (`1234` should read 12:34).
4. Leave the app with the set timer running (Home button), wait 20 s, come back. Is the
   time right (P2)?
5. Discard the workout.

## J5 The numbers person

Wants to know whether they are progressing.

1. Profile: read the weekly chart, switch it between duration, sets and reps, and tap a week.
2. Statistics: read the last 7 days and the sets per muscle. Is it clear what a set counts
   (D42's caption)?
3. Open the Monthly report, go back a month, and tap a record.
4. Open a lift's exercise details: Summary, records, the strength level section (do not save
   levels), History.
5. Open a past workout's Workout Detail: do the ↑ = ↓ arrows explain themselves (D66)?
6. Calendar: show earlier months, and a planned day.

## J6 The planner

Sets up next month's training.

1. Workout tab → Schedule: read the weekly plan. Change one day, then put it back.
2. Create a routine in a new folder: three exercises, one superset, a warm-up set, a rep range.
   Reorder two exercises by long press, and once by the tap path (A8).
3. Open ⋮ → Backups on one exercise: add a backup and mark it missing at one gym (D86).
4. Delete the routine and the folder. Is each step confirmed or undoable?

## J7 Low vision, one hand, in the gym

Wears no glasses at the gym and holds a phone in one hand between sets.

1. Set `font_scale 2.0` and relaunch. Walk J1's steps 1–6 on Home, the Workout tab and the
   live workout (A6, G7).
2. With TalkBack's view of the page (the AX tree), read a set row, the set-type letter, the
   tick, and the rest timer's buttons (A3, A5).
3. Put `font_scale` back to `1.0` and relaunch.

## Never do in a journey

- Turn on **Send to Hevy** (D34): it posts workouts to the user's real Hevy account.
- Tap **Find gyms nearby** (D47): it sends the emulator's position to two outside services.
- Import a file, restore a backup, sign in or out, reset data, or delete anything the journey
  did not add.
- Touch Health Connect switches, the heart-rate strap, or Install on an update.
