# Implement-review: area `native`

Branch `hevier/review-native`, from hevier/main a832477ce. Files: `python3 hevier/review/areas.py native` (66),
plus `frontend/android/app/src/hevier/AndroidManifest.xml` (areas.py maps it to `shell`; it declares the
exported components and permissions this area's Java uses, so the reviewer read it too).

Intent: the fork's Android side does what its decisions say and nothing more. Another app can read or
call only what is meant for it (OpenBite's phase and strength provider behind a signature permission,
D93, D95; the launcher aliases, D123), and every permission is asked for only on the tap that needs it
(location for Find gyms nearby, D47; Nearby devices for the strap, D79). The strap's foreground service
and the location request stop with the workout or the request, and losing Bluetooth or a permission
mid-use does not crash or leak. The month widget (D44, D68) and the strength provider never crash on
empty, missing or old data, and the media pack (D115) downloads and keeps its files safely.

Decisions: D24 D39 D44 D47 D53 D68 D79 D80 D91 D93 D95 D97 D106 D110 D115 D116 D123 D138.

Baseline: vitest 15 files, 94 passed (the area's own test files). Gradle `:app:testSideloadDebugUnitTest`
170 tests passed (the area's: HrStrapService 4, Icons 8, MediaPlugin 18, MonthWidget 3), and
`:app:compileSideloadReleaseJavaWithJavac` built.

## Ledger

| Round | Id | Sev | Claim | Decision | Reason |
|---|---|---|---|---|---|
| 0 | P1 | - | Hevy export toggle off/on within ~20 s during a send can leave it off | reject | dismissed by owner 2026-10-22 |
| 0 | P2 | - | Watchdog-abandoned send can overlap the next and POST a workout twice | reject | dismissed by owner 2026-10-22 |
| 0 | P3 | - | note-text.js `\n` fix runs on any imported workout's notes, not only Hevy's | reject | dismissed by owner 2026-10-22 |
| 0 | P4 | - | HevierLocationPlugin (API < 30) requestSingleUpdate listener not removed after 25 s fallback | reject | dismissed by owner 2026-10-22 |
| 1 | F1 | medium | Nothing tests that the strap's recording stops and is merged or let go when the workout ends; deleting the stop, the 1.5 s settle or flipping the open-workout check leaves the suite green | accept | two tests in hr-strap-run.test.js (saved: stop, read, clear; discarded: stop, clear); each of the three mutations turns them red (2, 2 and 1 failed), restored they pass |
| 1 | F2 | low | A strap whose pairing was refused is reconnected every 10 s for the whole workout, and watched by a scan every minute | defer | real, but a stop with a "needs pairing" state changes what the owner sees; rare (a strap that needs pairing, a declined prompt) |
| 1 | F3 | low | A link whose `discoverServices()` returns false stays "connecting" for the rest of the workout | accept | one line: drop the link so `retry()` makes it again, as `subscribe` failing does; no JVM test (needs a GATT stack, no Robolectric in the project), compiled |
| 1 | F4 | low | A second plugin instance (activity recreated during a media download) deletes the running download's `.part` and `.new` files, which can leave a partial pack marked complete | defer | the window is one download's tens of seconds during an activity recreation; the fix (process-wide run state) is more than a one-liner |
| 1 | F5 | low | The strap notification's tap targets the launcher alias, which HevierIconPlugin may have just switched off after an accent change | accept | names MainActivity with MAIN/LAUNCHER, as HevierWidgetPlugin.openIntent does; no JVM test (needs PackageManager), compiled |
| 1 | F6 | low | `theRestCardAndTheWorkoutCardAreNotPostedOver` only checks the channel predicate | accept | renamed to `theRestCardAndTheWorkoutCardAreToldApart` |
| 1 | - | - | notes: the develop permission and `<queries>` pair is in the release manifest too (extra package visibility only); the launch sweep may clear a crash-left recording if localStorage was also evicted; ScanSheet leaves its scan running up to 10 s after closing | - | not findings |

Round 1 tests: hr-strap-run.test.js 6 passed; Gradle `:app:testSideloadDebugUnitTest` 170 passed, `compileSideloadReleaseJavaWithJavac` built.
