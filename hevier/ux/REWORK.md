# UX rework

The tracker for moving Go Hevier's flows and pages to a UX of its own (D125): openGym and Hevy
are the starting point, not the measure. First an interview on how the app is really used, then
the north star; then every screen (navigation first) gets a mockup in three versions, scored
against the old screen, and all approved screens are built together and checked on the emulator
and the debug app. How it runs: [the `ux-rework` skill](../skills/ux-rework/SKILL.md)
(`/ux-rework status`, `friction`, `interview`, `north-star`, `<screen>`, `build`) and
[the `before-after` skill](../skills/before-after/SKILL.md) for the scores.

Started 2026-11-15. The look is not part of this: it is D123 (OpenBite's look) and `DESIGN.md`,
and the mockups use it as it is.

## North star

Set on 2026-11-16, decision D125.

> Go Hevier is my logbook, built on openGym's logic, with a UX of its own. Reading the next set
> at a glance, logging it, and looking back at a lift each take the fewest steps. openGym and
> Hevy are where it started, not what it is measured against.

- **Fixed:** the mechanics that keep upstream merges cheap (new helpers under
  `frontend/src/hevier/`, seams only, upstream's tests green, merge never rebase), the Hevy
  import and sync (D29 to D34), the look (D123), one layout in portrait, the data on the user's
  phone and server.
- **Open:** openGym's behaviour where it gets in the way, and every decision whose reason is
  Hevy. Decisions that came from how the user trains hold until a friction row points at them.
- **How it runs:** all screens together; mockups first, three versions each with one
  recommended, a grill only where something is unclear; the old screen and every version are
  scored; the user approves the pictures, then one build, the emulator, the debug app. The
  fallback is git.

## Usage

Filled by `/ux-rework interview`.

Status: done 2026-11-16 (22 questions). The screens were re-ranked from it the same day, with the user's yes.

### Earlier answers

The user's answers to upstream openGym's design questionnaire (a product designer's questions
on how people use the app, 2026-11). They are about Go Hevier. The interview starts from these:
it confirms them and goes deeper, it does not ask them again.

- **Last workout:** opens the app in the gym before the first exercise, starts one of their
  routines from Home or the Workout tab, then picks the gym (trains at two).
- **When a set is logged:** right after the set, so the rest timer runs. Android phone only.
- **Slowest part:** taking notes, so they rarely do; they prefer to tick and move on.
- **Before:** Hevy for about 2 years, tried MacroFactor Workouts, pen and paper 10 years ago.
  Left Hevy for its slow development, no support for several gyms and machines of different
  brands, and the subscription.
- **After a workout:** just finishes it. Later checks how it went against the last session
  (whether there was more in the tank) and the exercise stats. Compares progress across brands
  (if one leg press stalls, the other is expected to). Statistics are set to primary muscle only
  (an upstream PR), but the user knows their volume and does not check it.
- **Gave up on:** upstream's original design. Turned off all the progression they could: it
  gets in the way.
- **One screen to change:** the finished workout screen, against how Hevy shows it. This was
  about upstream's screen; the interview asks whether the fork's version is still the one to
  change.

### Context

The training week, where the phone is between sets, where things are expected, workarounds,
trade-offs, other users.

Step 1, the training week (2026-11-16, done):

- **Gyms:** the two gym clubs are the real ones. Home is used extremely rarely.
- **Between sets:** the phone is for reading the next set's planned weight and reps.
- **Where the phone is:** lying somewhere close, not in the hand or a pocket. So it is read at
  a glance from a distance, and picked up to tick.
- **Rest:** no sound. The user looks whether the rest timer is still running. The rest time is
  a baseline only: a warm-up may start a little early, a working set often gets extra rest
  (which fits 190 s between ticks against a 75 s timer).
- **Outside the gym:** planning the workouts, looking at lift stats and the history, and
  looking at the next session to see what the plan is.
- **Planning:** the rotation is set up once. Days are placed on the calendar every now and
  then. Routines change now and then: sets added or removed, something extra added (last time
  chest isolation exercises in Upper A and B).
- **Next weights are not planned:** setting them means editing the routine, so the workout
  opens with last time's weights and they are adjusted on the spot (F2).

Step 5, where things are expected (2026-11-16, done):

- **The finished screen:** the earlier answer (the one screen to change) no longer holds. "I
  don't think I need that screen at all": nothing on it is looked at, the user just confirms.
- **Hesitations in the workout:** a warm-up set is made by adding a set with Add Set and then
  changing its type (F8); the switch to per side is hidden too deep, though rarely needed
  (F9); extending the rest is many taps on +15 s when the wish is always 1 to 5 minutes more,
  never seconds (F10). Backups: F3 and F5.

Step 6, the trade-offs (2026-11-16, done). The user asked for a guess from the answers and
corrected it; the lists are Claude's guess as corrected:

- **Must never get slower:** starting the next routine at the right gym; reading the next
  set's weight and reps at a glance with the phone lying nearby; ticking a set and typing a
  value; seeing whether the rest timer still runs; swapping an exercise; finishing the workout;
  opening an exercise's history from a routine or a workout.
- **Stays on the main path (the user's corrections):** RPE ("I just started using it for
  working sets"; that is why only 23 of 105 sets carry it). Exercise notes: taken rarely, but
  needed as general notes and machine setup notes.
- **May go a step deeper or off the main screens (not objected to):** the finished screen
  (gone); in the live workout the header's volume and muscle line and the ⏱ Timer and
  Stopwatch; Home's body weight card and the cards already hidden; Profile's weekly chart; the
  All statistics page, structural balance, the body maps and Muscle Split bars; How to and the
  YouTube demos.
- **Routine and folder management:** needed when new routines are set up, which is rare. Not
  said whether it may go deeper; for the Workout tab's grill.
- **Left where they are:** the calendar, the monthly report, strength levels, exercise time,
  the workout note.

Step 7, other people (2026-11-16, done): PRODUCT.md holds. The user is the only user; future
users are a vague idea, highly unlikely. "I just tend to disable things I don't use and have
defaults tailored to me."

### Jobs

What the user comes to the app for, in their words, most important first.

Step 2 (2026-11-16, done). "First and foremost it's a logbook for me."

1. Log my workout.
2. Check my stats and progress.
3. Plan for the future.

Done badly now ("I am happy with how things are in general"), worst first:

- Planning, above all having to plan weights (F2).
- Swapping an exercise: the alternatives are searched for every time (F3). The user guesses the
  gym's backups (D46, D86) are not active yet; the backup has only 8 workouts logged in the
  app, 2 with a gym on them, so there was little for them to learn from. To check in the
  picker's grill.
- Finding "Replace exercise": it sits in the middle of the exercise's menu and takes a couple
  of seconds to find; the actions in that list could use more noticeable icons (F4).

### Facts from the data

Counted from the user's own data (a Go Hevier backup, the Hevy export), with the source and its
date. Where an answer disagrees, both, with the one the user stands by.

Source: the Go Hevier backup of 2026-11-15 (263 workouts, 2025-03-18 to 2026-11-15; 8 of them
logged in Go Hevier since 2026-10-20, the rest imported from Hevy) and the Hevy export of
2026-10-18 for supersets and set types. Counted 2026-11-16.

- **How often:** 3.0 workouts a week over the whole history, 3.1 over the last 40.
- **When:** 75 % start between 15:00 and 18:00. Every weekday is used, Monday least (17 of 263).
- **How long:** median 88 minutes (the middle 80 %: 52 to 112).
- **Size:** median 8 exercises and 26 sets over the history; 6 to 7 exercises and 21 sets in
  the last 40.
- **Pace:** in the 8 workouts logged in the app, a median of 190 s between two ticks (90 % under
  385 s). The rest timer is set to 75 s.
- **Routines:** 19, in 5 folders. Since 2026-08 only the six "TBJP Upper/Lower A to C" (a
  rotation, with day plans on the calendar into late November) and "Cardio" (5 of the last 40).
  The other 12 routines were last used before that. 23 of 263 workouts had no routine; 5 of the
  last 40, none of the 8 logged in the app.
- **Warm-ups:** 40 % of all sets (2531 of 6335) are warm-up sets. Automatic warm-ups are off.
- **Set types:** 198 failure sets, 8 drop sets in the Hevy export.
- **Supersets:** in 50 of 255 Hevy workouts, all in the older routines; none since 2026-01-17.
- **Timed and cardio:** 20 sets in all, nearly all in "Cardio".
- **Notes:** an exercise note on 92 of 2184 logged exercises (4 %), none in the 8 workouts
  logged in the app; two pinned exercise notes ("Seat: 5", "Seat: 3"). Agrees with F1.
- **RPE:** on 23 of the 105 working sets logged in the app.
- **Heart rate:** all 8 workouts logged in the app carry it.
- **Gyms:** three profiles (Home and two clubs of one gym chain). A brand is set for 30 exercises, a
  cable setup for 5; LifeFitness is the most used brand.
- **Body weight:** 431 days, now from Health Connect. The weigh-in prompt is off.
- **Switched off:** Home's recovery and weekly cards; the body photos, measurements, health
  tips, progression and plates parts; sound; automatic warm-ups; progression.
- **Backups:** none of the 154 routine exercises has a planned backup, and no exercise is
  marked missing at a gym. The picker's gym filter is off. The answer to question 8 was "I use
  all of these"; asked again, the user stands by the data: "I didn't know where to set them,
  was expecting the app to figure it out based on my own usage" (F5).
- **Not in the data:** which screens and stats are opened, where the phone is between sets,
  what is edited after a workout.

### Stats

The numbers and charts that are really looked at, most important first, and those never opened.

| Stat or chart | Where | When looked at | How often | Used to decide | Notes |
|---|---|---|---|---|---|
| An exercise's history and its best sets so far | Exercise details (History, records) | at home | | how it went in the past | named unprompted, first (2026-11-16). Opened from a routine or workout page, or by searching for the exercise. Hard today: the last few sessions need the full history (F6), the best sets do not stand out (F7) |
| Exercise details, all of it: the line chart, Personal Records, Set Records, left against right, brand compare, the 1RM calculator | Exercise details | | | | from the shown list |
| "Than last time" marks (↑ = ↓ on a set, the line against the routine's previous workout) | Workout detail, past workouts | at home | | | named twice. "Works well": it shows exactly the comparison with the last time; nothing missing |
| Workout detail: time per exercise, heart rate per set, record badges | Workout detail | | | | all but the Muscle Split bars |
| Past workouts in general | Feed, workout detail | at home | | | |
| Workout card, all of it: time, volume or sets, records, average heart rate, the muscle line | Home and Profile feed | | | | from the shown list |
| How the diet phases are going | the phase filter on an exercise's history and on the statistics (D93, D95) | at home | | how performance changed during a phase | Good or bad is what the strength feedback to OpenBite already works out: a lot of strength lost on a cut, barely any gain on a bulk. On maintenance small swings without a trend are expected; strength going up is fine |
| The week strip and what's next; the streak | Home | | | | |
| Routine page line: exercises, sets, usual duration | Routine page | | | | not its body map |
| Duration and live bpm; sets done rarely | Live workout header | during the workout | | | |
| Set count per muscle group | Statistics | | | | |
| Calendar, month and year views | Calendar | | | | |
| Monthly report | Monthly report | | | | |
| Strength levels | Exercise details, Strength levels | at home | | nothing: curiosity | where the user stands, which lifts are on the low side, which are exceptionally good |
| Exercise time | Exercise time page | at home | every now and then | nothing, at least for now: curiosity | what takes the most time and what the least |
| Lift trends, all of it | Lift trends | | | | an estimate: the page is too new to tell |
| Body weight | Measures | | sometimes | | the rest is checked in the diet app (OpenBite) |
| Lifetime workout count | Profile | | | | |

Step 4 done (2026-11-16). The rows are in the order of importance the user confirmed.

Never opened (2026-11-16):

- **Finished screen:** all of it ("nothing, I just confirm"): workout number, the records
  list, workouts in the last 7 days, the body map, "Last time and next time".
- **All statistics (`/stats/all`):** the whole page, never looked at so far: lifted in total,
  cardio this week, the activity heatmap, the body weight chart and weekly rate, exercise
  progress charts, the Muscles tabs, the effort charts.
- **Live workout header:** volume, the muscle line.
- **Workout detail:** the Muscle Split bars.
- **Routine page:** the body map of what the session hits.
- **Statistics:** the last 7 days body graph, weekly sets per muscle against a range.
- **Home:** the body weight card (and recovery, challenges, workouts left, from step 3).
- **Other:** structural balance; Measures' goal and Health Connect body composition.

### Features

Use: every workout, weekly, rarely, never. Matters: must keep, nice to have, could go.

| Area (FEATURES.md) | Feature | Use | Matters | Notes |
|---|---|---|---|---|
| Workout | every feature of the area | used | nice to have | "I use all of these" (2026-11-16); nothing named never used, nothing singled out as a must keep |
| Routines; Gyms, machines and labels | every feature of the two areas | used | nice to have | "I use all of these" (2026-11-16); the data disagrees on planned backups, missing at a gym and the gym filter (Facts): planned backups and missing at a gym are in fact never used, because they were not found (F5) |
| Exercises and muscles | YouTube demo and the How to tab | never | could go | |
| Exercises and muscles | everything else in the area | used | nice to have | |
| Home, navigation and look | Home's recovery widget, challenges, workouts left this week | never | could go | "I just see what's next" |
| Home, navigation and look | Profile's weekly chart | rarely | could go | "I don't really look at" it |
| Home, navigation and look | everything else in the area | used | nice to have | |
| Hevy import and export; Android and phone | every feature of the two areas | used | nice to have | "I use all of these" (2026-11-16) |

## Friction

Collected from the user's workouts, UX review rounds and anything else. One row per pain point;
`/ux-rework friction` adds them.

Source is `gym`, `review Rn` (a LEDGER.md round) or `other`.

| Id | Date | Screen | What happened | Source |
|---|---|---|---|---|
| F1 | 2026-11-15 | Live workout | Taking a note is the slowest part of logging, so notes are rarely taken | other (questionnaire) |
| F3 | 2026-11-16 | Add / replace exercise picker | Swapping an exercise means searching for the alternatives every time | other (interview) |
| F4 | 2026-11-16 | Live workout | "Replace exercise" sits in the middle of the exercise's menu and takes a couple of seconds to find; the menu's actions lack noticeable icons | other (interview) |
| F5 | 2026-11-16 | Routine editor | Planned backups (⋮ → Backups) were never found, so none is set; the user expected the app to work the alternatives out from their own swaps | other (interview) |
| F6 | 2026-11-16 | Exercise details, trends and brand compare | Seeing the previous few sessions of an exercise means going into the full history | other (interview) |
| F7 | 2026-11-16 | Exercise details, trends and brand compare | The best sets do not stand out: they are found by going through the history or reading the reps × weight list; if the records list has them, it is not noticed | other (interview) |
| F8 | 2026-11-16 | Live workout | A warm-up set takes two steps: Add Set, then change the new set's type | other (interview) |
| F9 | 2026-11-16 | Live workout | The switch to per side is hidden too deep (rarely needed) | other (interview) |
| F10 | 2026-11-16 | Live workout | Extending the rest means tapping +15 s many times; the extra rest wanted is always 1 to 5 minutes, never seconds (the rest bar) | other (interview) |
| F11 | 2026-11-18 | Lifts and History tabs | Lifts: a row shows the last set and the best, which says nothing about where a lift is going; the cards could be bigger and show progress over time ("looking at lifts alone is not very informative") | other (notes) |
| F12 | 2026-11-18 | Lifts and History tabs | Lifts, By muscle: no progress per muscle group (compound lifts counted in full, isolation at half) | other (notes) |
| F13 | 2026-11-18 | Lifts and History tabs | The statistics open from chips on Lifts, chips on History and a Statistics page of links; they should be better organised | other (notes) |
| F2 | 2026-11-16 | Workout tab: routines and folders | The next session's weights can only be set by editing the routine, so they are not planned ahead and get adjusted during the workout (tied to this screen by Claude: the routine page is where the next session is looked at) | other (interview) |

## Screens

Status: **not started**, **mockup** (with the user, see "Agreed so far"), **approved**
(decision), **built** (branch), **settled**, **reopened**. The order is the one agreed after the
interview (2026-11-16): by the user's jobs and where the friction sits, navigation first.

Baseline and Result: the `before-after` score of the old screen and of the built one, with the
taps of the screen's main tasks.

| Rank | Screen | Main files (`frontend/src/hevier/`) | Journeys | Friction | Baseline | Result | Status |
|---|---|---|---|---|---|---|---|
| 0 | Navigation: the tabs and where things live | `components/HevyTabBar.jsx`, `routes.jsx`; upstream's `frontend/src/App.jsx` | all | | 16/27 (1·2·3 | 1·2·1); T1 1 tap, T8 2, T6 4 and a search, T7 1 after a scroll, T9 calendar 2, routine 2 | 25/27 (3·3·3 | 3·2·2); T1 1 tap, T8 0, T6 2, T7 1, T9 calendar 1, routine 2; tabs 133 × 48 px | built (D126, `hevier/rework`) |
| 1 | Live workout: set table, rest timer, PREVIOUS | `views/HevyWorkout.jsx` | J1, J3, J4, J7 | F1, F4, F8, F9, F10 | 14/33 (1·1·3·0 | 2·1·1); next set 16 px, tick 30 × 30 px, log with RPE 2 taps, swap 3 and a search, +2 min rest 8 taps | 27/33 (3·2·3·2 | 2·3·2); next set 26 px (the mockup's 34 does not fit beside PREVIOUS), tick 44 × 44, log with RPE 1 tap, swap 2, +2 min rest 1; Per side still opens Exercise settings | built (D127, `hevier/rework`) |
| 2 | Workout tab: routines and folders | `views/WorkoutTab.jsx`, `views/RoutinePreview.jsx` | J1, J6 | F2 | 16/33 (1·1·3·0 | 2·2·2); the routine page shows the routine's own numbers (the same set twice), not what opens (a heavy set and a lighter one), warm-ups as "–", no last time; planning a weight means editing the routine | 32/33 (3·3·3·3 | 3·3·2); the page shows what opens, last time beside it; a planned weight is 2 taps and leaves the routine alone | built (D128, `hevier/rework`) |
| 3 | Add / replace exercise picker | `views/ExercisePickerHevy.jsx` | J1, J2, J6 | F3 | 18/33 (1·1·3·1 | 2·2·2); swap is 3 taps when the exercise is among the catalogue suggestions, else a search; a row shows name and muscle only | 30/33 (3·3·3·2 | 3·3·2); swap 2 taps from the user's own swaps; "done here" also counts workouts saved without a gym | built (D129, `hevier/rework`) |
| 4 | Routine editor | `views/RoutineEditHevy.jsx` | J6 | F5 | 17/27 (2·1·3 | 1·2·2); 2 of 9 exercises in view, KG and REPS are numbers the workout does not open with, reorder and warm-up are in the ⋮ menu | 21/27 (2·2·3 | 2·3·2); a handle on each exercise, + Set and + Warm-up side by side, the list marks what is next | built (D130, `hevier/rework`) |
| 5 | Exercise details, trends and brand compare | `views/ExerciseDetails.jsx`, `views/LiftTrends.jsx`, `views/StrengthLevels.jsx` | J5 | F6, F7 | 17/33 (2·1·3·0 | 1·2·2); opens on the animation and muscles, last sessions on a second tab, records two screens down | 31/33 (3·3·3·3 | 2·3·2); last sessions and best sets on one page under the animation | built (D131, `hevier/rework`) |
| 6 | Save workout and the finished screen | `views/SaveWorkout.jsx` | J1 | | 18/33 (1·2·3·0 | 2·2·2); Finish, Save, a routine pop-up, then a "Nice work!" page | 28/33 (3·2·3·3 | 2·2·2); Finish, Save: 2 taps, lands on Today with "Workout saved" | built (D132, `hevier/rework`) |
| 7 | Workout detail and edit | `views/WorkoutDetail.jsx` | J5 | | 19/27 (2·2·3 | 1·2·2); muscles shown twice before the first exercise, a row and a heart-rate line per set | 21/27 (2·2·3 | 2·2·2); L and R rows, RPE in its own column, no muscle bars | built (D133, `hevier/rework`) |
| 8 | Home feed | `views/HevyHome.jsx` | J1, J5 | | 17/27 (1·2·3 | 1·2·2); the rotation chips fill half the first screen, no Start, the next session is not shown | 26/27 (3·3·3 | 3·3·2); the next session with its sets and Start (380 × 48) on one screen | built (D134, `hevier/rework`) |
| 9 | Profile, statistics and the pages it opens | `views/Profile.jsx`, `views/Statistics.jsx`, `views/Calendar.jsx`, `views/MonthReport.jsx`, `views/ExerciseTime.jsx`; `/stats/all`, `/structural-balance` in `routes.jsx` | J5 | F11, F12, F13 | 18/27 (2·2·3 | 1·1·2); a tall weekly chart, the feed a second time, exercises three taps away | 24/27 (3·2·3 | 3·3·2); an exercise's last sessions 2 taps from opening the app; History's round tile sits beside two calendar-week tiles | approved (D140, F11; F12 and F13 open: parts 3 and 4 of `ux/STATS-PREPLAN.md`) |
| 10 | Settings, gyms and the heart-rate strap | `views/SettingsRootHevy.jsx`, `components/StrapScreen.jsx` | J2, J3 | | | | kept as it is (D136) |
| 11 | Exercise library | `/library` in `routes.jsx` | J6 | | | | kept as it is (D136) |
| 12 | Measurements | `views/Measures.jsx` | J5 | | | | kept as it is (D136) |

## Main tasks

What the scores count (`before-after`, lines 1 and 3). From the "must never get slower" list
and the stats in their order. A screen scores the tasks that pass through it; navigation scores
those that start from opening the app.

| Id | Task | From | To |
|---|---|---|---|
| T1 | Start the next routine at the right gym | opening the app | the first set on screen, the gym right |
| T2 | Read the next set | the live workout, phone lying nearby | weight and reps read, no tap |
| T3 | Log a set | the set's row | weight and reps right, the set ticked, the rest running |
| T4 | Swap an exercise | an exercise in the live workout | its replacement in place |
| T5 | Finish the workout | the last set ticked | back on the page the app opens on |
| T6 | Look back at a lift | opening the app, and from a routine or workout page | the exercise's last sessions and best sets in view |
| T7 | Compare the last workout with the one before | opening the app | its "than last time" marks in view |
| T8 | See the next session's plan | opening the app | its exercises and sets in view |
| T9 | Plan ahead | opening the app | a day placed on the calendar; a set added to a routine |

## Scores

One heading per screen: the old screen's table with its evidence, then each version's and the
built screen's.

### Navigation

Old screen, scored 2026-11-16 on the emulator (the build of `hevier/main`, the user's backup
loaded; pictures in `~/.local/state/go-hevier/before-after/navigation-old-*.png`). No friction
row of its own, so line 4 is left out and the total is out of 27.

| # | Line | Old | A | B | C | Evidence for the old screen |
|---|---|---|---|---|---|---|
| 1 | Main tasks' steps | 1 | 3 | 2 | 2 | T1 1 tap (Home's Today card). T8 2 (Workout, routine name): Home names the next routine but not its sets. T6 4 taps and a search (Profile, Exercises, the row, History). T7 1 after a scroll. T9 calendar 2, a routine 2. The line is its lowest task, T6. |
| 2 | Read at a glance | 2 | 3 | 3 | 3 | What is next is on Home without a tap, but as small grey text under six rotation chips; the largest text is the streak. |
| 3 | Nothing that must stay fast got slower | 3 | 3 | 3 | 3 | The reference: start 1, exercise history from a routine page 2. |
| 5 | What is looked at is in view | 1 | 3 | 2 | 2 | Profile leads with the weekly chart (hardly looked at); the feed is on two tabs; the Workout tab leads with Start Empty Workout, New Routine and Explore (rare) above the routines. |
| 6 | Found where it is expected | 2 | 2 | 3 | 2 | Three labelled tabs; statistics and exercise history sit under "Profile"; the calendar opens from two tabs. |
| 7 | The standing rules | 1 | 2 | 2 | 2 | Tab buttons measured 133 × 45 px (under 48), labels 11 px. Contrast and 200 % not measured. |
| | Total of 27 | 16 | 25 | 23 | 22 | |

Versions (mockup `hevier/ux/mockups/navigation.html`): A "Today, Lifts, History" (recommended),
B "Today, History, Plan", C "Train, Look back". The user chose A on 2026-11-16 (D126). Taps from opening the app, old / A / B / C: T8
2 / 0 / 0 / 0; T6 4 and a search / 2 / 3 / 2 or 3; T9 calendar 2 / 1 / 1 / 1; T1 1 in all.

### Live workout

Old screen, scored 2026-11-16 on the emulator (TBJP Upper A started on the user's backup, then
discarded; picture `~/.local/state/go-hevier/before-after/live-workout-old.png`).

| # | Line | Old | A | B | C | Evidence for the old screen |
|---|---|---|---|---|---|---|
| 1 | Main tasks' steps | 1 | 3 | 3 | 3 | T3 with RPE 2 taps (RPE, then the tick). T4 3 taps and a search (More, Replace exercise, search, the row). T5 1. The line is its lowest task, T4. |
| 2 | Read at a glance | 1 | 3 | 2 | 3 | The next set's weight and reps are 16 px, the same as every other row; only a green edge marks it. Last time is 14 px. |
| 3 | Nothing that must stay fast got slower | 3 | 3 | 3 | 3 | The reference. |
| 4 | Its friction rows | 0 | 3 | 3 | 3 | F1, F4, F8, F9 and F10 are all there: Replace is the 2nd of 9 menu rows without an icon, a warm-up is in the menu or Add Set plus a type change, per side is inside Exercise settings, rest grows by 15 s (8 taps for 2 min). |
| 5 | What is looked at is in view | 2 | 2 | 3 | 3 | Duration and sets are in view; the gym line, "Add workout notes", "Add brand" and "Add notes here" take four rows the user rarely uses. |
| 6 | Found where it is expected | 1 | 3 | 3 | 3 | Swap, warm-up and per side are behind the three dots, by the user's own account hard to find. |
| 7 | The standing rules | 1 | 2 | 2 | 2 | The tick measured 30 × 30 px, the rest bar's buttons 61 × 34 and 41 × 33 (under 48). Contrast and 200 % not measured. |
| | Total of 33 | 14 | 31 | 30 | 32 | |

Versions (mockup `hevier/ux/mockups/live-workout.html`): C "Now panel over the list"
(recommended), A "One exercise at a time", B "Today's list, with the next set opened up". In all
three an effort number logs the set (the open question "RPE could replace the tick"), Swap, Note
and Per side are buttons in view, a warm-up has its own add button and rest grows by minutes.

Second round, 2026-11-16, after the user's comments: A is out ("definitely not"). Last time
stays on the left of every row. The effort numbers are Other, 6, 7, 8, 9, 9.5, 10, where Other
opens 1 to 10 in halves; a warm-up has one Done button and no effort numbers. C's panel moved to
the bottom of the screen (read from "that large selection at the bottom", which named A; to be
confirmed). B and C are each drawn just started, on a working set and resting. Scores unchanged:
B 30, C 32.

Third round, 2026-11-16: the user chose B with C's rest timer (the countdown docks at the bottom
while resting). Their changes, all drawn: a warm-up is ticked with a tick too, not "Done"; the
exercise picture stays; the brand is added and swapped on the exercise's name line, where it
shows; Per side goes under More; other things may come out of More as buttons. Drawn as buttons:
Swap, Note, History, Rest, More. More holds Per side, Reorder, Superset, Weight unit, Exercise
settings, Remove. Score 30 of 33. The user added Reorder to the button row (six buttons: Swap, Note, History, Rest, Reorder,
More). Approved 2026-11-16 (D127).

### Workout tab and routine page (now: the next session's page)

D126 removed the Workout tab, so this screen is the page a routine opens on, from Today's card or
from Routines. Old screen scored 2026-11-16 on the emulator (`#/plan/r/<id>/view` of TBJP Upper
A; picture `~/.local/state/go-hevier/before-after/workout-tab-old-routine.png`).

| # | Line | Old | A | B | C | Evidence for the old screen |
|---|---|---|---|---|---|---|
| 1 | Main tasks' steps | 1 | 3 | 3 | 2 | T8 2 taps, but the numbers are the routine's own (the same set twice) while the workout opens with last time's (a heavy set and a lighter one). T9 for a weight: the pencil, the editor, the field, save, and the routine itself changes. |
| 2 | Read at a glance | 1 | 3 | 3 | 3 | Large clear numbers, but not the ones that open; warm-ups read "–"; no last time. |
| 3 | Nothing that must stay fast got slower | 3 | 3 | 3 | 3 | The reference: Start 1 tap on the page. |
| 4 | Its friction rows | 0 | 3 | 2 | 2 | F2 as the user described it. |
| 5 | What is looked at is in view | 2 | 3 | 3 | 3 | Everything but the body map at the bottom is used. |
| 6 | Found where it is expected | 2 | 3 | 2 | 2 | Start and edit are where expected; planning has no place. |
| 7 | The standing rules | 2 | 2 | 2 | 2 | Start is full width; the header icons were not measured. |
| | Total of 33 | 16 | 32 | 29 | 27 | |

Versions (mockup `hevier/ux/mockups/workout-tab.html`): A "Plan in place, set by set"
(recommended), B "One choice per exercise", C "Decide at the gym". In all three the page shows
what the workout opens with, last time on the left, and a plan is for the next session only; the
routine is not changed. The user chose A on 2026-11-16 (D128). The routines
list and folders are drawn with the routine editor.

### Add / replace exercise picker

Old screen scored 2026-11-16 on the emulator (Replace exercise on Lever Military Press in TBJP
Upper A; picture `~/.local/state/go-hevier/before-after/picker-old.png`).

| # | Line | Old | A | B | C | Evidence for the old screen |
|---|---|---|---|---|---|---|
| 1 | Main tasks' steps | 1 | 3 | 3 | 2 | T4: More, Replace exercise, the row: 3 taps when the wanted one is among "Suggested substitutes", else a search. |
| 2 | Read at a glance | 1 | 3 | 2 | 2 | A row shows name and muscle; not whether the user ever did it, nor the last set. |
| 3 | Nothing that must stay fast got slower | 3 | 3 | 3 | 3 | The reference. |
| 4 | Its friction rows | 1 | 3 | 3 | 1 | F3 and F5: three substitutes are suggested ("Same movement and muscle", for the gym and the muscle), but from the catalogue, not from the user's swaps; planned backups were never found. |
| 5 | What is looked at is in view | 2 | 3 | 2 | 2 | Search, the gym and muscle chips and the list are in view; 214 catalogue rows follow the three suggestions. |
| 6 | Found where it is expected | 2 | 3 | 3 | 2 | The sheet is where expected once Replace is found (D127 moved Swap into view). |
| 7 | The standing rules | 2 | 2 | 2 | 2 | Rows are tall enough; not measured further. |
| | Total of 33 | 18 | 32 | 29 | 22 | |

Versions (mockup `hevier/ux/mockups/picker.html`): A "Your own swaps first" (recommended), B
"Three choices right in the list", C "Backups you pick yourself". The user chose A on 2026-11-16
(D129): a swap never changes the routine, and at Finish a tick box replaces the "Update routine?"
pop-up (to be drawn with the Save workout screen).

### Routine editor (with the routines list)

Old screen scored 2026-11-16 on the emulator (Edit routine of TBJP Upper A; picture
`~/.local/state/go-hevier/before-after/routine-editor-old.png`; the list is
`navigation-old-routines.png`). F5 is settled by D129, so line 4 is left out: total of 27.

| # | Line | Old | A | B | C | Evidence for the old screen |
|---|---|---|---|---|---|---|
| 1 | Main tasks' steps | 2 | 3 | 3 | 2 | T9, the routine's shape: a set is a scroll and Add Set; a warm-up and a reorder go through the ⋮ menu. |
| 2 | Read at a glance | 1 | 3 | 2 | 2 | Two of nine exercises fit a screen; the routine as a whole is never seen. |
| 3 | Nothing that must stay fast got slower | 3 | 3 | 3 | 3 | The reference. |
| 5 | What is looked at is in view | 1 | 3 | 2 | 2 | KG and REPS take most of the page and are not what the workout opens with; warm-ups read "–"; "Add routine notes here" on every exercise. |
| 6 | Found where it is expected | 2 | 2 | 2 | 3 | Done and the name are where expected; folder and rotation are elsewhere. |
| 7 | The standing rules | 2 | 2 | 2 | 2 | Not measured beyond the full-width Add Set. |
| | Total of 27 | 17 | 25 | 22 | 21 | |

Versions (mockup `hevier/ux/mockups/routine-editor.html`): A "The routine on one screen"
(recommended), B "Edit on the routine's own page", C "Today's editor, with the new buttons", and
one routines list shared by all three. The user chose C on 2026-11-16 (D130), not the recommended A;
the list was not commented on and stands as drawn.

### Exercise details

Old screen scored 2026-11-16 on the emulator (an exercise's sheet opened from the library;
picture `~/.local/state/go-hevier/before-after/exercise-details-old.png`).

| # | Line | Old | A | B | C | Evidence for the old screen |
|---|---|---|---|---|---|---|
| 1 | Main tasks' steps | 2 | 3 | 3 | 2 | T6: the page opens on Summary; the last sessions are 1 more tap (History tab), the records a scroll of two screens. |
| 2 | Read at a glance | 1 | 3 | 3 | 2 | The first screen is the animation, the muscles and the top of the chart. |
| 3 | Nothing that must stay fast got slower | 3 | 3 | 3 | 3 | The reference. |
| 4 | Its friction rows | 0 | 3 | 3 | 2 | F6 and F7 as the user described: the last sessions need the History tab; a best set is one "PR" badge on a session, and the rep records are a plain table far down. |
| 5 | What is looked at is in view | 1 | 3 | 2 | 2 | The animation takes half the first screen; "How to" (never used) is one of three tabs. |
| 6 | Found where it is expected | 2 | 3 | 2 | 2 | Tabs are clear; brand compare is only on the History tab. |
| 7 | The standing rules | 2 | 2 | 2 | 2 | Not measured. |
| | Total of 33 | 17 | 32 | 30 | 24 | |

Versions (mockup `hevier/ux/mockups/exercise-details.html`): A "Last sessions, then best sets,
then the chart" (recommended), B "Set by set, across sessions", C "The chart first". Lift trends,
strength levels and brand compare keep their pages and are drawn with the statistics pages. 

Approved 2026-11-16 as D131: A, with two changes from the user. The animation stays at the top
and the best at each rep count is a vertical list. With the animation on top the best sets need
one short scroll, so line 5 drops to 2 and A scores 31 of 33. The mockup is trimmed to A.

### Save workout

Old flow scored 2026-11-16 on the emulator (Finish on a started routine; picture
`~/.local/state/go-hevier/before-after/save-workout-old-1.png`; the finished page and the routine
pop-up read from `views/SaveWorkout.jsx`, not saved on the emulator).

| # | Line | Old | A | B | C | Evidence for the old flow |
|---|---|---|---|---|---|---|
| 1 | Main tasks' steps | 1 | 3 | 3 | 3 | Finish, Save, Done: 3 taps, 4 when the routine changed. |
| 2 | Read at a glance | 2 | 3 | 2 | 3 | Title, duration and sets are clear; duration shows twice. |
| 3 | Nothing that must stay fast got slower | 3 | 3 | 3 | 2 | The reference. C saves with no stop before it. |
| 4 | Its friction rows | 0 | 3 | 3 | 2 | The finished page the user does not need always shows; the routine question is a pop-up. |
| 5 | What is looked at is in view | 2 | 3 | 2 | 3 | The rest bar and the tab bar cover the lower third; Save is in the top corner. |
| 6 | Found where it is expected | 2 | 3 | 2 | 2 | |
| 7 | The standing rules | 2 | 2 | 2 | 2 | Not measured. |
| | Total of 33 | 18 | 32 | 28 | 27 | |

Versions (mockup `hevier/ux/mockups/save-workout.html`): A "One page, Save at the bottom, no
finished page" (recommended), B "A sheet over the workout", C "Save at once, land on the
workout". All three carry D129's unticked "Update the routine too" box.

Approved 2026-11-16 as D132: B, the sheet over the workout. The mockup is trimmed to B plus the
Today page it lands on.

### Workout detail

Old page scored 2026-11-16 on the emulator (a workout opened from the Home feed; picture
`~/.local/state/go-hevier/before-after/workout-detail-old.png`). No friction row names this page,
so line 4 is left out and the total is of 27.

| # | Line | Old | A | B | C | Evidence for the old page |
|---|---|---|---|---|---|---|
| 1 | Main tasks' steps | 2 | 3 | 3 | 2 | Reading the sets needs a scroll past the muscle bars; Edit is a button at the very bottom or in the menu. |
| 2 | Read at a glance | 2 | 3 | 2 | 3 | The summary is clear; each set is a row plus a heart-rate line. |
| 3 | Nothing that must stay fast got slower | 3 | 3 | 3 | 3 | The reference. |
| 5 | What is looked at is in view | 1 | 3 | 2 | 2 | Muscles show twice (a line and eight bars); the first set is at the bottom edge of the first screen. |
| 6 | Found where it is expected | 2 | 3 | 2 | 2 | |
| 7 | The standing rules | 2 | 2 | 2 | 2 | Not measured. |
| | Total of 27 | 19 | 26 | 22 | 22 | |

Versions (mockup `hevier/ux/mockups/workout-detail.html`): A "The sets first, one line per
exercise" (recommended), B "This time beside last time", C "Sets, Muscles, Heart rate as three
views".

Round 2, 2026-11-16: the user turned all three down ("I want something closer to what we have
now. The only thing I'm willing to let go is the muscle split - all other info stays"). Redrawn
as today's page without the "Muscle split" bar chart; the muscle line, the cards and every row
stay. Line 5 goes 1 → 3 (the first exercise and its sets are on the first screen), the rest
as today: 21 of 27.

Approved 2026-11-16 as D133, with effort as its own RPE column between weight and reps and the
heart rate.

Per-side sets, 2026-11-16: the user reported that the release shows per-side sets differently by
set type, with holds right. Reproduced with `hevySetText(hevySetLabel(...))`
(`views/WorkoutDetail.jsx:85`): a per-side hold is an L row and an R row; a per-side rep set
(normal, warm-up, failure, drop alike) is one row reading "L 20×10 · R 20×9", with no unit and no
"reps", where a plain set reads "60kg × 8 reps". A third frame in the mockup draws every per-side
set the way the hold is: an L row and an R row under one set number. Approved 2026-11-16 and added to
D133. The fix comes with the rework build; the release is not patched on its own unless the user
asks.

### Today page (Home)

Old Home scored 2026-11-16 on the emulator, on a rest day (picture
`~/.local/state/go-hevier/before-after/home-old.png`). No friction row names Home itself, so line
4 is left out and the total is of 27. The contents of Today are D126's; this is its layout.

| # | Line | Old | A | B | C | Evidence for the old Home |
|---|---|---|---|---|---|---|
| 1 | Main tasks' steps | 1 | 3 | 3 | 3 | Starting the next routine is 3 taps (Workout tab, find it, Start Routine); Home has no Start. |
| 2 | Read at a glance | 2 | 3 | 2 | 2 | "Next" is a small line under six chips. |
| 3 | Nothing that must stay fast got slower | 3 | 3 | 3 | 3 | The reference. |
| 5 | What is looked at is in view | 1 | 3 | 2 | 2 | The chips fill half the first screen; the next session's sets are not on Home. |
| 6 | Found where it is expected | 2 | 3 | 3 | 2 | |
| 7 | The standing rules | 2 | 2 | 2 | 2 | Not measured. |
| | Total of 27 | 17 | 26 | 23 | 22 | |

Versions (mockup `hevier/ux/mockups/today.html`): A "The next session leads" (recommended), B
"Closest to today's Home", C "The round as a list".

Approved 2026-11-16 as D134: A. The mockup is trimmed to A.

### Lifts and History tabs (Profile)

Old Profile scored 2026-11-16 on the emulator (picture
`~/.local/state/go-hevier/before-after/profile-old.png`). No friction row names Profile, so line 4
is left out and the total is of 27.

| # | Line | Old | A | B | C | Evidence for the old Profile |
|---|---|---|---|---|---|---|
| 1 | Main tasks' steps | 2 | 3 | 3 | 2 | An exercise's numbers: Profile, Exercises, the row (3 taps), then its page. |
| 2 | Read at a glance | 2 | 3 | 2 | 3 | "0s this week" and a chart of hours lead. |
| 3 | Nothing that must stay fast got slower | 3 | 3 | 3 | 3 | The reference. |
| 5 | What is looked at is in view | 1 | 3 | 2 | 2 | The chart takes 40 % of the first screen; the first workout card starts at its bottom edge. |
| 6 | Found where it is expected | 1 | 3 | 2 | 2 | The same feed is on Home and on Profile; exercises sit under Profile. |
| 7 | The standing rules | 2 | 2 | 2 | 2 | Not measured. |
| | Total of 27 | 18 | 26 | 22 | 22 | |

Versions (mockup `hevier/ux/mockups/lifts-history.html`): A "History keeps the weekly chart,
Lifts lists what you trained last" (recommended), B "History is only the feed, Lifts by muscle",
C "History opens on the month, Lifts shows trends". The workout cards stay as today. Statistics,
Month report, Sets per muscle, Body weight, Calendar, Strength levels, Trends and Exercise time
are not drawn: proposed to stay as they are, opened from the chips.

Round 2, 2026-11-16, after a talk with the user: History is "kind of both" (how training is
going, and the feed); "lifts makes sense" (A's Lifts stands); the statistics pages stay as they
are ("all good"); the weekly chart is rarely read and "can go under statistics or as extra info
on calendar header"; Calendar's two doors and Body weight under History are fine. History redrawn
with the week in three numbers in place of the chart, a Statistics chip added, the chart moved to
Statistics.

Approved 2026-11-16 as D135, with the user's addition "let's also have lifts separated by
muscles": read as a switch Recent · By muscle on the one list (my reading of "also").

2026-11-17, from the design critique (`hevier/ux/mockups/critique-2026-11.html`): the user took
proposal 4 version C, History's six chips in two labelled rows (Look back, Numbers) at 48 dp with
"More" renamed "All statistics" (23 of 27 against 21), and proposal 1 version C, upstream's week
streak card hidden on All statistics so D59's streak is the only one on the app's pages. Recorded in D135.

### Lifts: progress over time (round 3, F11)

Today's Lifts (D135) scored 2026-11-19 from the code: the emulator is shared, so there is no picture
and nothing measured. F11 counts on line 4; F12 and F13 belong to parts 3 and 4. Mockup
`hevier/ux/mockups/lifts-progress.html`.

| # | Line | Old | A | B | C | Evidence |
|---|---|---|---|---|---|---|
| 1 | Main tasks' steps | 3 | 3 | 3 | 3 | T6: 2 taps in all (the tab, the lift). |
| 2 | Read at a glance | 1 | 3 | 3 | 2 | Old: last and best, no direction. C cuts names. |
| 3 | Nothing that must stay fast got slower | 3 | 3 | 3 | 3 | T6 stays 2 taps. |
| 4 | F11 | 0 | 3 | 2 | 3 | B's chart is 64 px. |
| 5 | What is looked at is in view | 2 | 2 | 3 | 2 | A: 4 lifts a screen against 8. C: last and best a tap away. |
| 6 | Found where it is expected | 2 | 3 | 2 | 2 | Old: no phase on Lifts. B filters by tapping a count. C has no sort. |
| 7 | The standing rules | 2 | 2 | 2 | 1 | Read off the frames. C cuts names at 200 %. |
| | Total of 33 | 20 | 31 | 29 | 27 | |

A "a card per lift, with its chart" (recommended), B "a summary first, then compact rows", C "a grid of tiles".

Round 2, 2026-11-19, the owner: "A with totals from B, B with bigger graphs and still smaller elements than A". C dropped.

| # | Line | Old | A2 | B2 | Evidence |
|---|---|---|---|---|---|
| 1 | Main tasks' steps | 3 | 3 | 3 | T6: 2 taps. |
| 2 | Read at a glance | 1 | 3 | 3 | The totals lead; the change beside every lift. |
| 3 | Nothing that must stay fast got slower | 3 | 3 | 3 | T6 stays 2 taps. |
| 4 | F11 | 0 | 3 | 3 | A2 a 62 px chart with its scale; B2 32 px with its scale (round 3). |
| 5 | What is looked at is in view | 2 | 2 | 3 | Under the controls: A2 2½ lifts, B2 5. |
| 6 | Found where it is expected | 2 | 3 | 3 | The window on Lifts; the totals are outlined buttons with a line saying they filter. |
| 7 | The standing rules | 2 | 2 | 2 | Read off the frames. |
| | Total of 33 | 20 | 31 | 32 | |

B2 recommended. Round 3: B2's chart 32 px with its scale. Approved 2026-11-19 as D140.

### Settings, gyms, strap, library, Measurements

2026-11-16: not redrawn. The user: "settings can be kept as they are, just make group separators
more noticeable. Exercise library also stays, same for gyms strap and measurements." Recorded as
D136. Only Settings was opened on the emulator this round
(`~/.local/state/go-hevier/before-after/settings-old.png`).

All thirteen screens are settled. Still undrawn: the Note sheet of the live workout (D127), a
plain text sheet. Next is the build on `hevier/rework`.

Note for every mockup: numbers, dates and gym names are made up; nothing from the user's backup
goes into a committed file.


## Agreed so far

Filled while a screen's mockup is with the user, one heading per screen, a line per settled
point, so the work can stop and carry on in another session. Cleared once the screen's decision
is written.

## Open questions

Questions and ideas that belong to a screen, for its mockup to answer.

- **Save workout and the finished screen:** the user does not need the finished screen at all
  (interview, 2026-11-16). Does that mean only "Nice work!" or the Save Workout step too, and
  where do the "Update routine?" prompt and the editable duration go?
- **Add / replace exercise picker, Routine editor:** the user expected the app to work out an
  exercise's alternatives from their own swaps (F3, F5), not to set backups by hand.
- **Exercise details:** the last few sessions in view without the full history (F6); the best
  sets made to stand out (F7).
- **Live workout:** choosing an RPE already ticks the set, so the RPE could replace the tick:
  "why have two" (the user's idea, interview 2026-11-16).
- **Live workout:** more noticeable icons for the actions in the exercise's menu, "Replace
  exercise" easier to reach (F4).
