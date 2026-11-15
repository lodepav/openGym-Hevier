# UX rework

The tracker for moving Go Hevier's flows and pages past Hevy's UX: openGym and Hevy are the
starting point, not the measure. First an interview on how the app is really used, then the
north star, then each screen (navigation first) is grilled with the user, recorded as a decision,
built and tried in real workouts. How it runs: [the `ux-rework` skill](../skills/ux-rework/SKILL.md)
(`/ux-rework status`, `friction`, `interview`, `north-star`, `<screen>`).

Started 2026-11-15. The look is not part of this: it is D123 (OpenBite's look) and `DESIGN.md`,
and the rework builds on it once it has landed on
`hevier/main` (grills can start before that, builds cannot).

## Usage

Filled by `/ux-rework interview`.

Status: not started.

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

### Jobs

What the user comes to the app for, in their words, most important first.

### Facts from the data

Counted from the user's own data (a Go Hevier backup, the Hevy export), with the source and its
date. Where an answer disagrees, both, with the one the user stands by.

### Stats

The numbers and charts that are really looked at, most important first, and those never opened.

| Stat or chart | Where | When looked at | How often | Used to decide | Notes |
|---|---|---|---|---|---|

Never opened:

### Features

Use: every workout, weekly, rarely, never. Matters: must keep, nice to have, could go.

| Area (FEATURES.md) | Feature | Use | Matters | Notes |
|---|---|---|---|---|

## North star

Not set. The first grill (`/ux-rework north-star`) settles it. Draft to start from:

> openGym's logic, Go Hevier's own UX: the fastest and clearest way to do each task, one-handed
> between sets. openGym and Hevy are where it started, not what it is measured against.

## Friction

Collected from the user's workouts, UX review rounds and anything else. One row per pain point;
`/ux-rework friction` adds them.

Source is `gym`, `review Rn` (a LEDGER.md round) or `other`.

| Id | Date | Screen | What happened | Source |
|---|---|---|---|---|
| F1 | 2026-11-15 | Live workout | Taking a note is the slowest part of logging, so notes are rarely taken | other (questionnaire) |

## Screens

Status: **not started**, **grilling** (see "Agreed so far"), **agreed** (decision), **built**
(branch), **settled**, **reopened**. The order is a first guess by how much each screen is used
in J1; the user re-ranks it after the interview, with Usage and the friction list in view.

Baseline and Result: the taps and steps of the screen's main task on its journeys, counted
before the build and after it, against the target in its decision.

| Rank | Screen | Main files (`frontend/src/hevier/`) | Journeys | Friction | Baseline | Result | Status |
|---|---|---|---|---|---|---|---|
| 0 | Navigation: the tabs and where things live | `components/HevyTabBar.jsx`, `routes.jsx`; upstream's `frontend/src/App.jsx` | all | | | | not started |
| 1 | Live workout: set table, rest timer, PREVIOUS | `views/HevyWorkout.jsx` | J1, J3, J4, J7 | F1 | | | not started |
| 2 | Add / replace exercise picker | `views/ExercisePickerHevy.jsx` | J1, J2, J6 | | | | not started |
| 3 | Save workout and the finished screen | `views/SaveWorkout.jsx` | J1 | | | | not started |
| 4 | Workout tab: routines and folders | `views/WorkoutTab.jsx`, `views/RoutinePreview.jsx` | J1, J6 | | | | not started |
| 5 | Routine editor | `views/RoutineEditHevy.jsx` | J6 | | | | not started |
| 6 | Home feed | `views/HevyHome.jsx` | J1, J5 | | | | not started |
| 7 | Workout detail and edit | `views/WorkoutDetail.jsx` | J5 | | | | not started |
| 8 | Exercise details, trends and brand compare | `views/ExerciseDetails.jsx`, `views/LiftTrends.jsx`, `views/StrengthLevels.jsx` | J5 | | | | not started |
| 9 | Profile, statistics and the pages it opens | `views/Profile.jsx`, `views/Statistics.jsx`, `views/Calendar.jsx`, `views/MonthReport.jsx`, `views/ExerciseTime.jsx`; `/stats/all`, `/structural-balance` in `routes.jsx` | J5 | | | | not started |
| 10 | Exercise library | `/library` in `routes.jsx` | J6 | | | | not started |
| 11 | Measurements | `views/Measures.jsx` | J5 | | | | not started |
| 12 | Settings, gyms and the heart-rate strap | `views/SettingsRootHevy.jsx`, `components/StrapScreen.jsx` | J2, J3 | | | | not started |

## Agreed so far

Filled during a grill, one heading per screen, a line per settled branch, so a grill can stop
and carry on in another session. Cleared once the screen's decision is written.

## Open questions

Questions raised in one screen's grill that belong to another screen.
