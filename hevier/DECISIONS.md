# Design decisions

Agreed with the user on 2026-10-16, before implementation. These override anything in
PLAN.md or reference/SCREENS.md that says otherwise. Change a decision here first, with the
date, before changing the code.

**Scope rule:** openGym's functionality, Hevy's UX and UI. New features wait until phases 1–2
work well (PLAN.md §5, backlog).

## Workout screen

| # | Decision |
|---|---|
| D1 | **One layout.** The Hevy list (`workoutView = 'hevy'`) is the only workout layout in the fork. Upstream's Cards / List / Compact / Focus stay in the code but are not offered in the UI. |
| D2 | **Prefilled values are grey until touched.** openGym pre-fills each set with its progression target. In the Hevy row, an untouched value of an unticked set renders grey (like Hevy's hint text) and turns bold once it is edited or the set is ticked. Ticking logs the values exactly as upstream does, so there is **no logic change**. "Touched" is view state derived from the set (done, or edited in this session), not a new persisted field. |
| D3 | **PREVIOUS column.** Last time's value for the same set number: same routine first, else any workout (`lastEntryFor(S, exId, rid)`). Tap copies it into the row. Replaces openGym's "Last time / Best set" recap line. |
| D4 | **No ± steppers** in the Hevy rows. Values are typed with the system numeric keypad. |
| D5 | **Set types.** Tap the set number to open the sheet: Warm-up · Normal · Failure · Drop · Remove (Hevy's), then openGym's extras (rest-pause, left/right sides, timed). Drops render as indented `D` rows under their parent set, matching openGym's nested `drops`. Labels: `W` yellow, number, `F` red, `D` blue. |
| D6 | **Effort column** only when Settings → effort is RIR or RPE, labelled accordingly, opening openGym's effort picker. |
| D7 | **Exercise block**: thumbnail · blue name (→ exercise details) · ⋮ · "Add notes here…" · "⏱ Rest Timer: 2min 0s" · set table · "+ Add Set". Muscle/equipment chips, "Plan: 4 × 8" and the large animation move to exercise details. |
| D8 | **Progression guidance lives behind ⋮** (⋮ → Progression shows the guidance line and its settings). Nothing about progression is on the card itself. |
| D9 | **Swipe left deletes a set** (with undo), as in Hevy. openGym's swipe-right-to-copy stays as an unadvertised extra. |
| D10 | **Header and finish flow.** ⌄ · duration · ⏱ · **Finish**, then a stats row (Duration · Volume · Sets). Finish → **Save Workout** page (title, when, duration, description = session note, Discard) → **"Nice work!"** summary from openGym's own PRs, 1RM records and finish comparison. Discard Workout also sits at the bottom of the workout. Upstream's `finishWorkout` / `doFinishWorkout` do the saving, unchanged. |

## Navigation

| # | Decision |
|---|---|
| D11 | **Three tabs: Home · Workout · Profile.** No Coach tab. **The AI coach is disabled by default** and appears nowhere in the fork's navigation; only upstream's own opt-in under Settings remains. |
| D12 | **Home is configurable.** Home is a list of widgets the user can **add, remove and rearrange** (an "Edit Home" mode with drag handles and switches). It always includes the **workout feed** (Hevy-style cards of finished workouts) as one widget. The widgets are existing openGym pieces: today's plan + week strip, workout feed, body weight, check-in, week streak, muscle recovery map, weekly chart. Show/hide reuses upstream's existing switches where they exist (`S.checkIn`, `S.showWeightCard`). The order and the other widgets' visibility are device-local (`localStorage`, key `hevier_home`), not added to `S`, so nothing changes in sync or exports. |
| D13 | **Workout tab**: Quick Start ("+ Start Empty Workout") · a **Today card** ("Today: Leg Day · Start", from openGym's schedule or rotation) · Routines header with **New Routine**, **Explore** (→ openGym's starter plans) and a **Schedule** button (→ openGym's weekly plan / rotation editor) · Hevy-style routine cards with **Start Routine**. No routine folders (backlog). |
| D14 | **Profile**: header with the weekly chart (Duration / Volume / Reps) · a 2×2 dashboard: Statistics · Exercises · Measures · Calendar · then the workout list. openGym's muscle map, recovery, muscle balance and progress photos live under Statistics and Measures. ⚙ opens Settings. |

## Still open (decide in phase 2)

- Default theme and accent. Hevy is light-first with a blue accent; openGym defaults to dark
  with green.
- Settings page structure: Hevy's grouping (SCREENS.md §10) vs upstream's pages.
