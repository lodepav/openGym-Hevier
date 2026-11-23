# Implement-review: area `shell`

Branch `hevier/review-shell`, from hevier/main 564ad08ec. Files: `python3 hevier/review/areas.py shell` (102).

Intent: the fork's shell is a layer that upstream never feels. With `VITE_HEVIER` off, upstream's UI
and its tests run exactly as upstream wrote them; with it on, the fork's tabs, settings root,
Modules parts, accent look and back handling do what their decisions say (D16, D97, D102, D114,
D123, D126). A field the fork adds to the stored profile survives a sync merge and a backup
round-trip. The tooling cannot lie: verify.sh, the hooks and the CI workflows fail when a step
fails, heavy.sh's lock can be neither skipped nor deadlocked, no script removes or overwrites
anything outside its own folders, and no workflow leaks a secret.

Decisions: D1 D2 D10 D11 D16 D17 D26 D28 D38 D52 D62 D84 D97 D100 D102 D114 D123 D126 D127.

Baseline: vitest 34 files, 272 passed and 1 expected fail (the area's own test files);
`node --test` on the area's six tool tests, 19 passed.

## Ledger

| Round | Id | Sev | Claim | Decision | Reason |
|---|---|---|---|---|---|
| 0 | P1 | - | Hevy export toggle off/on within ~20 s during a send can leave it off | reject | dismissed by owner 2026-10-22 |
| 0 | P2 | - | Watchdog-abandoned send can overlap the next and POST a workout twice | reject | dismissed by owner 2026-10-22 |
| 0 | P3 | - | note-text.js `\n` fix runs on any imported workout's notes, not only Hevy's | reject | dismissed by owner 2026-10-22 |
| 0 | P4 | - | HevierLocationPlugin (API < 30) requestSingleUpdate listener not removed after 25 s fallback | reject | dismissed by owner 2026-10-22 |
| 1 | F1 | medium | verify.sh's "already verified" shortcut skips the seam, decision-index and features checks, which read .md files, so a commit that only adds a decision row passes the pre-push hook with a stale index | accept | the quick checks (markers, seams, siblings, index, features) now run before the shortcut; in a scratch clone with a stamp, a DECISIONS.md-only commit printed "passed at" (exit 0) before and fails on the index diff (exit 1) after; a clean docs-only change still takes the shortcut |
| 1 | F2 | medium | A verify run that skips the Java tests (CI, or a worktree never synced) still writes the stamp, so a later push from the main checkout skips them too | accept | the skip sets `partial`, and the stamp is written only without it; no test (needs an unsynced worktree and a full suite pass), read and `bash -n` |
| 1 | F3 | low | CI picks the conditional steps from `HEAD^`, so a cancelled run or a multi-commit push can skip the locale check | defer | only the locale check of a non-merge push; the fork stays out of the locale packs |
| 1 | F4 | low | seam_check ignores a deleted or renamed upstream file and says "fine" when the merge base cannot be found | accept | `--no-renames --diff-filter=MD`, and a missing base is a finding; in the scratch clone a deleted upstream test file passed before and fails after; the repo still checks fine |
| 1 | - | - | notes: S74 (Modals.jsx) changes upstream in both builds, documented in SEAMS.md and offered as #1510; hevier.css and theme.css ship in upstream's bundle but every rule is under `:root[data-ui="hevier"]`; heavy.sh has no timeout, a hung holder blocks the rest (says it is waiting, not a deadlock) | - | not findings |

Round 1 tests: area vitest unchanged (no frontend change); seam_check on the repo "59 seams, 33 files with markers: fine"; verify.sh and seam_check reproduced in a scratch clone as above.
| 2 | G1 | medium | useDragReorder keeps its touchmove hold on the list element it saw when the row count last changed, so after a routine search hides and brings back the folder list, a long press on a folder scrolls the page and the folder drops back | accept | the hold follows the element through a callback ref; new test (list unmounted and back, same count, a lifted row's touchmove is not prevented) failed before and passes after; restores D13/D15's long press, no visible change otherwise |
| 2 | G2 | low | store-watch's "writes each copy of S out once per field" compares two equal strings, so dropping the cache keeps it green | accept | the test counts serialisations through a `toJSON`; with the cache removed it fails (mutation run), restored it passes |
| 2 | - | - | notes: `hvModuleParts` syncs as one field (D102 says so, tested); `cdp.mjs click` prints NOT FOUND and exits 0, nothing chains on it; a second finger on a grip handle replaces the gesture (cosmetic) | - | not findings |

Round 2 tests: area vitest plus BackupsSheet.test.jsx, 35 files, 276 passed and 1 expected fail.
| 3 | H1 | medium | Settings search in the fork still finds upstream's "Add a gym" and "Your gym", the hidden gym reminder's sub-pages, which lead to a background-location setting the fork's manifest removes | accept | `gym-find` and `gym-edit` join `HIDDEN_PAGES`, as their parent `gym` (D16, D47); the new assertions in SettingsRootHevy.test.jsx failed before and pass after |
| 3 | H2 | low | emulator.sh never prints the serial it booted when the install or launch fails, so the emulator stays up unnoticed on a shared machine | accept | one line: the serial goes to stderr right after boot; `bash -n` only (needs a failing install on an emulator) |
| 3 | H3 | low | upgrade-fixture.sh writes to a path built from its argument | withdrawn | by the reviewer: needs a deliberately malformed argument from the owner |
| 3 | - | - | notes: round 1-2 fixes checked and kept; no fork CSS selector outside `:root[data-ui="hevier"]` (every rule parsed); hevier-checks.yml checks out without `persist-credentials: false` (token is contents: read, push-only); cdp.mjs `send()` waits forever if the app dies mid-command | - | not findings |

Round 3 tests: area vitest 34 files, 273 passed and 1 expected fail.
