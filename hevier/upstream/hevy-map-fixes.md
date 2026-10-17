# Hevy import fixes to offer upstream

Found on 2026-10-17 by running the user's Hevy CSV export (165 exercises, about 6,000 sets)
through upstream's `parseWorkoutCSV` and checking every match against its catalogue artwork
(`catalogue/media/still/<id>.webp`). The fork carries these in `frontend/src/hevier/lib/hevy-import.js`
(`FIXES`, D29) and deletes each row once upstream has it. Not sent yet: the user decides when to
open the pull request.

## 1. The CSV's name cache merges different exercises

`parseWorkoutCSV` caches a match by `keyOf(name)`, a sorted word bag that drops filler words. So
`Triceps Dip` and `Triceps Dip (Weighted)`, or `Back Extension (Hyperextension)` and `Back Extension
(Weighted Hyperextension)`, share one cache slot, and the first title in the file decides both.
Fix: cache by the exact lower-cased title (the word bag is still right for `matchExercise`).

## 2. Wrong rows in `HEVY_TITLE_MAP` / wrong name matches

| Hevy title | Upstream gives | Should be |
|---|---|---|
| Seated Leg Curl (Machine) | 0586 lever lying leg curl | 0599 lever seated leg curl |
| Single Leg Extensions | 10537 seated single leg knee extension (body weight, a floor exercise) | 1571 lever one leg extension (or 0585 per side) |
| Single Arm Cable Row | 6510 cable single arm high row | a horizontal seated cable row (0861 per side) |
| Reverse Grip Lat Pulldown (Cable) | 0673 reverse grip machine lat pulldown | 5123 cable reverse grip pulldown |
| Lat Pulldown (Machine) | 0673 reverse grip machine lat pulldown | 0579 lever front pulldown |
| Skullcrusher (Dumbbell) | 0060 barbell skull crusher | 0351 dumbbell lying triceps extension |
| Romanian Deadlift (Smith Machine) | 0085 barbell romanian deadlift | 1597 smith stiff legged deadlift (the catalogue has no Smith RDL) |
| Triceps Dip | 0591 lever overhand triceps dip | 0814 triceps dip |
| Triceps Dip (Weighted) | 0591 lever overhand triceps dip | 1767 weighted triceps dip on high parallel bars |
| Back Extension (Hyperextension) | 0573 lever back extension | 5813 45 degree hyperextension |
| Back Extension (Weighted Hyperextension) | 0573 lever back extension | 5035 weighted hyperextension |
| Seated Overhead Press (Dumbbell) | 0091 barbell seated overhead press | 0405 dumbbell seated shoulder press |
| Overhead Press (Barbell) | 0091 barbell seated overhead press | 1162 barbell standing military press |
| Shoulder Press (Machine Plates), Seated Shoulder Press (Machine) | 0603 lever shoulder press (its artwork is a landmine press) | 1454 lever seated shoulder press |
| Seated Cable Row - V Grip (Cable) | 0218 cable seated wide-grip row | 2661 cable seated row with v bar |
| Seated Cable Row - Bar Grip | 0218 cable seated wide-grip row | 0861 cable seated row |
| Triceps Extension (Dumbbell) | 0607 lever triceps extension | 0430 dumbbell standing triceps extension |
| Hanging Knee Raise | 0472 hanging leg raise | 9819 hanging knee raise |
| EZ Bar Biceps Curl | 2404 ez-bar biceps curl (with arm blaster) | 0447 ez barbell curl |
| Plank | 2135 weighted front plank | 0463 front plank |
| Crunch | 0832 weighted crunch (by name, though the title map leaves this alias out on purpose) | 0274 crunch floor |
| Air Bike | 0003 air bike (the crunch of that name) | 3893 assault bike run |
| Walking | 1460 walking lunge | 2258 walking |

## 3. Hevy titles upstream leaves unmatched

| Hevy title | Catalogue |
|---|---|
| Seated Cable Row - Bar Wide Grip | 0218 |
| Iso-Lateral High Row (Machine) | 2662 |
| Iso-Lateral Low Row | 4214 |
| Band Pullaparts | 1503 |
| Triceps Rope Pushdown | 0200 |
| Triceps Pressdown | 0241 |
| Straight Arm Lat Pulldown (Cable) | 0238 |
| Lying Neck Curls | 10780 |
| Single Arm Tricep Extension (Dumbbell) | 4343 |
| Pull Up (Close Neutral Grip) | 0651 |
| Single Leg Standing Calf Raise | 3712 |
| Calf Extension (Machine) | 2289 |
| Iso-Lateral Chest Press (Machine) | 1029 |
| Triceps Extension (Cable) | 0194 (left out of upstream's map on purpose, as a lever machine; the cable overhead extension fits) |
| Bulgarian Split Squat (Smith Machine) | 0768 |

And one more wrong match: **Standing Leg Curls** gives 0795 standing single leg curl (body weight,
against a wall); Hevy's is the machine, 4347 lever standing leg curl.
