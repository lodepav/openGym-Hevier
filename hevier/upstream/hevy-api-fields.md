# Hevy API import: fields to offer upstream

Written 2026-10-17 from Hevy's published API spec (`https://api.hevyapp.com/docs`). The fork reads
these through seam S21 (`frontend/src/hevier/lib/hevy-more.js`, D31) and deletes its copy of each
once upstream's `lib/import-hevy.js` does the same. The routine folders (D30) are left out here:
they need D13's folders, which upstream doesn't have. Not sent yet: the user decides when to open
the pull request.

Each item is small and independent, so they can be separate pull requests.

## 1. A workout's routine (`routine_id` → `routineId`)

`parseHevyWorkouts` writes `routineId: null`, though every Hevy workout started from a routine
carries its `routine_id`, and `mergeHevyRoutines` keeps each routine's Hevy id (`hevyId`). Keep
the id on the parsed workout, and once both are merged give each workout the routine with that
`hevyId`. "Last time" in the same routine, the rotation and the history then read Hevy's history
as the user did it. The sheet merges workouts before routines, so the link goes after both. A
workout imported earlier (from the CSV, which has no routine column, or before this change) is
never re-imported, as existing days win: such a workout on the same day, starting within a couple
of minutes of the API's and still without a routine, can take the API workout's routine the same
way, stamped with `stampWorkout` so the change syncs.

## 2. Body measurements

`fetchHevyAccount` already pages through `/v1/body_measurements`, but `parseHevyBodyweight` reads
only `weight_kg`. The rest maps straight onto `lib/measurements.js` (cm):

| Hevy | openGym |
|---|---|
| `neck_cm`, `shoulder_cm`, `chest_cm` | `neck`, `shoulders`, `chest` |
| `abdomen`, `waist`, `hips` | `abdomen`, `waist`, `hips` |
| `left_bicep_cm`, `right_bicep_cm` | `upperArmLeft`, `upperArmRight` |
| `left_forearm_cm`, `right_forearm_cm` | `forearmLeft`, `forearmRight` |
| `left_thigh`, `right_thigh`, `left_calf`, `right_calf` | `thighLeft`, `thighRight`, `calfLeft`, `calfRight` |
| `fat_percent` | `bodyFat` |
| `lean_mass_kg` | (none) |

The unsuffixed fields carry cm examples in the spec. One entry a day, an existing day kept as with
weigh-ins, and a field that gets values switched on in `measurementEnabled` (abdomen and body fat
are optional and off by default). The sheet would need one more row and switch ("Import body
measurements"); English strings only in the fork.

## 3. Routine rest times (`rest_seconds` → `restSec`)

Each routine exercise has `rest_seconds`; openGym's routine exercise already has `restSec`. One line
in `parseHevyRoutines`.

## 4. Routine rep ranges (`rep_range` → `repsMin`–`reps`)

A Hevy routine set can hold `rep_range: { start, end }` with `reps: null`; the parse then falls back
to 10 reps. A range is openGym's double progression: `normalizeRepRange(end, start)` and
`prog: 'double'`. A range of one number is that rep count.

## 5. Workout notes

`parseHevyWorkouts` drops the workout's `description` and each exercise's `notes`, which the CSV
import keeps (`note` on the workout and on the entry, 280 characters). Same fields, same limits.

## 6. Custom exercises' muscles and equipment

`/v1/exercise_templates` gives a custom template's `equipment`, `primary_muscle_group` and
`secondary_muscle_groups`; the resolver makes the custom exercise with `eq: 'custom'` and no muscles,
so it is missing from the muscle map and balance. A mapping onto `MUSCLES`:

| Hevy | openGym |
|---|---|
| abdominals | abs |
| shoulders | deltoids |
| biceps, triceps, chest, calves, quadriceps, adductors | the same |
| forearms | forearm |
| hamstrings | hamstring |
| glutes, abductors | gluteal |
| lats, upper_back | upper-back |
| traps | trapezius |
| lower_back | lower-back |
| cardio, neck, full_body, other | (none) |

Equipment: none → body weight, barbell, dumbbell, kettlebell the same, machine → leverage machine
(cable or Smith machine when the title says so), plate → weight plate, resistance_band → resistance
band, suspension → suspension trainer, other → left as it is. Filling it into a custom exercise an
earlier import made is safe only while that exercise has no muscles yet (one the user edited has).

## 7. The account's unit (`/v1/user/info`)

`weight_unit` is `kg` or `lbs`. The API returns kg either way, so the import is right; a line when
it differs from the profile's unit explains why the numbers don't look like Hevy's screen.

## Not done

`/v1/workouts/events` (workouts changed or deleted since a date) would make a re-import an
incremental sync, including edits made in Hevy after the first import. That is a bigger change to
the merge (existing days win today) and is left for its own discussion.
