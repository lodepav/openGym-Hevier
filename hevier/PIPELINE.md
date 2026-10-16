# Upstream pipeline

What upstream has finished but not yet tagged, so the fork doesn't build something that is
already coming. Read this before starting a milestone, and refresh it after each `git fetch upstream`.

Saved 2026-10-16 from `upstream/release-1.4.2` (3bf5a1ce, 243 commits past v1.4.1) and
`upstream/release-1.4.3` (0f8e46ee, 367 commits, which contains 1.4.2). The full notes, word
for word: [upstream/CHANGELOG-pipeline.md](upstream/CHANGELOG-pipeline.md).

```bash
git fetch upstream
git branch -r | grep release-                        # new release branches?
git show upstream/release-X.Y.Z:CHANGELOG.md | awk '/^## v1.4.1/{exit} {print}'   # since our base
```

## What touches the fork

| Upstream item | Fork impact |
|---|---|
| **Swipe from the left edge to go back**, the previous page sliding in | Don't build a fork back gesture. Check that it doesn't fight D9's set swipes or the fork's sheets and drag handles. |
| **Backups for an exercise** (up to 5, in the routine editor, listed first in a swap) | `RoutineEditHevy` must offer them (⋮ or Settings & progression). Silent drift: the upstream editor gets it, the fork's doesn't. |
| Settings → Workout: **Animation quality**, **Skip finished exercises** (Cards/Focus only), **Rest between warm-ups** | Skip finished only steers upstream layouts: add it to `HIDDEN_ROWS` (D16). Keep the other two. |
| Settings → Equipment: **Your bars**, plate quick picks, change plates | Nothing to do (upstream pages, D16). |
| Settings → Account: **Delete account**, **Add another device** | The fork's root repeats the account card (S11): check it still links to these. |
| Settings → Reminders: **Gym reminder** (1.4.3) | Nothing to do (an upstream page). |
| Settings → About: **support links** (1.4.3) | Nothing to do. |
| **Notifications asked for at the start**, a start logo | Onboarding: don't add a fork prompt. |
| **Running workout saved on every change** and on background | Nothing to do (store logic). |
| Timed exercises move on by themselves; per-side warm-ups; bodyweight has no weight step | `HevyWorkout` and its set-type sheet (D5) must follow: check after the merge. |
| **Progress photos for any day**, delete with Undo; **body weight for an earlier day** | M6 Measures (D14): use upstream's flows, don't build our own. |
| Muscle balance: tap an untrained muscle to see its exercises | M6 Statistics: reuse it. |
| The Undo toast gains an × | Fork toasts use upstream's: nothing to do. |
| Effort stats average the whole training | M6 Statistics: reuse it. |
| Android targets 16, minSdk 24, Standard/Plus/HD APKs | `hevier/tools/emulator.sh` and seam S7 (gradle): check the flavours on merge. |
| iOS app, Watch, widgets, Apple Health | Out of scope for the fork (Android). |
| Security fixes, owner role, CSP | Server side: take as is. CSP: the fork loads nothing external, but check it on merge. |

## Open pull requests (2026-10-16)

Upstream had 100 open PRs. Some are already in the release branches as upstream's own version
(#526, #530, #539, #548, #564, #565, #570, #579, #581). The rest may or may not land. Judged
from their **titles only**, so read a PR before acting on it. Refresh:
`gh pr list -R DuarteSantos8/openGym --state open --limit 100`.

**Overlaps the fork's plan: watch these before building the matching item**

| PR | What | Fork item |
|---|---|---|
| #590 | Home: health widgets, a pencil to arrange the cards | D12 configurable Home: if it lands, back the fork's Edit Home with it |
| #589, #463, #434 | Health area (body composition, activity, heart, sleep) reading Apple Health; weigh-in from Apple Health; weight provenance | §5 items 1–2: the read side may come for Android too, check before building Health Connect reads |
| #568, #495 | Gym check-in with barcode membership cards | §5 item 4 gyms |
| #531 | QR codes on machines: scan to jump to the exercise | §5 item 5 machine labels |
| #624 | Editable aliases for built-in and custom exercises | §5 item 5 labels (maybe) |
| #509 | Social: friendships and progress on Profile | D14 Profile, Hevy's feed |
| #484 | Home: favourite lifts with their best e1RM | D12 Home widget candidate, M6 |
| #498 | Stats: exercise progress defaults to per set | M5 exercise details, M6 |
| #528 | Liquid Glass redesign (tokens, glass surfaces) | **Phase 2 theme**: a large CSS change, conflicts with `hevier.css` |
| #549 | Dark mode inverts exercise artwork | Phase 2 theme |
| #312 | Prescription engine v2, smart warm-ups, v1→v2 migration | **D15 routine editor** reads the v1 prescription: big drift if it lands |

**Workout-screen features `HevyWorkout` would need to follow** (CONFLICTS.md, silent drift):
#563 a persistent Complete / Next button · #490 a timer bar that says what it times, timed
exercises that run themselves · #610 workout phases (reorder, colours, skip/resume) · #626
automatic superset intervals, editable round rest · #625 warm-up / work-set / per-set rest ·
#636 rest between sides · #587 extra exercises counted as training · #608 one builder for added
or swapped exercises · #507 interval training mode · #613 YouTube demos inline · #650, #622,
#595, #574 scroll and collapse fixes · #299 Android widget, early finish.

**Other features, no fork impact expected:** #478 Strava upload · #391 OpenID Connect sign-in ·
#538 a routine more than once in a rotation · #485 progression "Repeat last session" · #519 last
session carries weight with progression off · #542 any plate weight · #604 global bar weight
(shipped as "Your bars") · #441 admins publish custom exercises · #591, #504 Strong import fixes ·
#567, #566, #480 planner and API tokens · #643, #588, #492 and others: Coach (off in the fork, D11) ·
#435 Apple Watch, #314, #310, #326 MCP · locale PRs (take upstream, rule C).
