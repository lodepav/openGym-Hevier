# Implement-review: area `hevy`

Branch `hevier/review-hevy`, from hevier/main 6394b8689. Files: `python3 hevier/review/areas.py hevy` (79).

Intent: the owner's workouts go to Hevy through Hevy's web login (D138, D143) or the Pro key
(D34), with set times and the gym, and Hevy data comes in by API or CSV (D29-D31, D33); the
login session and key stay encrypted on the phone and never reach `S`, a backup or a sync.
Gym backups (D47/D86 files), the update notice (D77) and version (D52) work as decided, and the
release and supply-chain gates (D26, D38) block what they claim to block. Nothing leaves the
phone except to Hevy and GitHub releases, and an imported file cannot do more than add data.

Decisions: D26 D29 D30 D31 D33 D34 D38 D47 D52 D54 D77 D86 D106 D114 D115 D137 D138 D143.

Baseline: vitest 22 files, 212 passed; node --test release-notes + supply-chain 14 passed;
Java HevierHevyLoginActivityTest (testSideloadDebugUnitTest): 2 passed.

## Ledger

| Round | Id | Sev | Claim | Decision | Reason |
|---|---|---|---|---|---|
| 0 | P1 | - | Hevy export toggle off/on within ~20 s during a send can leave it off | reject | dismissed by owner 2026-10-22 |
| 0 | P2 | - | Watchdog-abandoned send can overlap the next and POST a workout twice | reject | dismissed by owner 2026-10-22 |
| 0 | P3 | - | note-text.js `\n` fix runs on any imported workout's notes, not only Hevy's | reject | dismissed by owner 2026-10-22 |
| 0 | P4 | - | HevierLocationPlugin (API < 30) requestSingleUpdate listener not removed after 25 s fallback | reject | dismissed by owner 2026-10-22 |
| 1 | F1 | medium | Fork import step re-matches and doubles one-limb sets in openGym's own CSV (ids from the file) | accept | D29 scopes the step to Hevy; test round-trips an own CSV, failed before (10538 r=20 sides), passes after; `answer()` returns null for source openGym |
| 1 | F2 | low | Turning Send to Hevy off while a pass refreshes leaves the session stored again | accept | D34/D138 "turning it off forgets"; one line: remove the session again after the pass settles; test failed before (session a2 kept), passes after |
| 1 | F3 | low | Two web clients refreshing at once can wipe a good session (or a Keystore error on load) | defer | needs two refreshes within ms; recovery is one login, no data lost; a shared refresh promise is more than a one-liner |
| 1 | F4 | low | APK list gates pass when aapt2 reads nothing | accept | D38 gate fails open; empty read against a non-empty list now fails; checked with a harness (exit 0 before, 1 after) and `--lists-only` on the debug APK (all three gates ok) |
| 1 | F5 | low | Bundle endpoint scan skips .css and IP-literal hosts | accept | D26 "any other host fails"; css + IPv4 added, test failed before, passes after; two upstream placeholder IPs (127.0.0.1, 192.168.1.20) listed in endpoints.txt with reasons; bundle gate ok on frontend/dist |

Round 1 tests: vitest 22 files 214 passed; node --test hevier/tools 36 passed.
| 2 | G1 | low | A workout with an out-of-range time (corrupt backup/sync) makes toISOString throw and stops every later send silently | defer | needs corrupt data the app's clocks never make; worth a guard in workoutDraft if it is ever seen |
| 2 | G2 | low | Package gate misses a tarball swapped under an unchanged name@version | accept | D26 "a new or bumped package fails"; `resolved` must be that name's own tarball URL; test failed before, passes after; `packages` gate ok on the real lockfiles (565) |
| 2 | G3 | low | Editing a sent workout sends `is_private: false`, so one made private in Hevy goes public again | needs your call | changes what Hevy shows; D143 leaves a hand-set gym alone, privacy is not decided |
| 2 | G4 | low | An unusable Keystore key alias is never deleted, so the session can't be kept again until reinstall | defer | key not bound to user auth, so rare; needs a device to check the fix |
| 2 | G5 | low | Hevy measurement with an impossible date or huge value is stored as is | reject | data comes only from the owner's own Hevy account over the API, which validates dates |
| 2 | - | - | 3 withdrawn (session from another page, path injection through ids, empty digest in publish()) | - | reviewer's own counterargument |

Round 2 tests: node --test hevier/tools 36 passed (supply-chain 8). No high or medium stood: early exit, round 3 skipped.
| 4 | H1 | medium | `apk_permissions` repeats `against()` (the empty-read guard had to go in twice) | accept | now one pipeline into `against`; `--lists-only` on the debug APK: 37 permissions, all listed; only the "gone" line's wording changes |
| 4 | H2 | low | `rebrand` and `byName` in hevy-import.js move ids the same way | reject | saves ~6 lines across two import paths for a refactor risk; tests pass either way |
| 4 | H3 | low | Both workout loops in hevy-export-sync.js end with the same five lines | accept | `sentAs(item, id)` beside `refuse`; area tests 214 passed |
| 4 | H4 | low | Username lookup and paged workouts URL written twice | reject | ~3 lines; the callers react differently to no user |
| 4 | H6 | low | `shouldOffer`'s `busy` is always false in the app | reject | tests use it as its own unit; saving is small |
| 4 | H7 | low | `hevyGymFor` filters id-less gyms its caller already dropped | reject | exported pure helper, the filter costs nothing |
| 4 | H8 | low | seam-check SKILL.md repeats seam_check.py, and its pathspec misses `android/app/src/hevier*` and `public/hevier` | defer | a skill edit needs a dry-run; verify.sh runs the script, so nothing slips through |
| 4 | - | - | 5 withdrawn (H5 isPrivate waits on G3, H9 publish() cert pin, H10 early tool tests, H11 first removeSecret, H12/H13 shared fetch helpers) | - | reviewer's own counterargument |

Round 4 tests: vitest 22 files 214 passed; node --test hevier/tools 36 passed. Round 4 net: 11 added, 21 removed.
