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

## Other forks (2026-10-17)

Upstream has ~1,575 forks. 501 were pushed after v1.4.1 (2026-10-10), and 99 of those have
commits that aren't on any upstream branch or PR head (default branches only; most add 1–5
commits). Most are rebrands, hosting set-ups (Vercel, Railway, Cloudflare, Postgres, Supabase),
nutrition and social features, or iOS build workflows: nothing for the fork. What's left, by
fork item. All are AGPL like us, so code may be reused with credit, but asking the author to
send it upstream is better (rule 2: it would come in through a merge, not as fork code). Read
the commit before taking anything: none of it is reviewed upstream.

```bash
# the scan: list forks, compare, then fetch candidates and drop anything reachable from upstream
gh api --paginate "repos/DuarteSantos8/openGym/forks?per_page=100" --jq '.[]|[.full_name,.pushed_at,.default_branch]|@tsv'
gh api "repos/DuarteSantos8/openGym/compare/main...OWNER:REPO:BRANCH" --jq '[.ahead_by,.behind_by]'
git log --no-merges <fork-ref> --not <all upstream heads and refs/pull/*/head>
```

**Matches a planned fork item**

| Fork · commit | What | Fork item |
|---|---|---|
| hpeppitt/opengym `7a689334c`, `d3c01db9b` | Health Connect *read* plugin (`HealthReadPlugin.java`, `lib/health-read.js` with tests), backfills body weight; tagged "[upstream]" by its author | §5 item 1: the read plumbing, already written. Ask whether it is going upstream before building ours |
| awkaplan/openGym `2105f02ef` | Health Connect: read weigh-ins other apps logged, extends upstream's own `HealthConnectPlugin` / `health-sync.js` (tests) | §5 item 1, a second take that extends upstream's code rather than adding a plugin: the better base |
| frdc/openGym `3eae35eac` | Wear OS controls and heart-rate tracking (3.8k lines) | §5 item 2 (heart rate), for the data shape only |
| hpeppitt/opengym `69d1db2c7` | Import review step: search the whole library for a match | §5 item 12, the review step (their importer is a photo one, the UI idea carries) |
| linjames890828/openGym `8cf2010f5` | CSV import reads Chinese and Japanese dates | §5 item 12, small, for upstream |
| camilopez/openGym `168205bb7` | Fixes up Strong exports before import | §5 item 12, neighbouring |
| frdc/openGym `940e6f410` | Search exercises by machine names | §5 item 5 (machine labels) |
| kdaneshmir-gif/lift `05b7b51dd`, `14c44f184` | "Machine taken" swap; several gyms each saved as a profile | §5 items 4–6 (upstream 1.4.2 backups cover the swap) |
| Hugo-Mllr/Biscotos (2026-10-14 "chore(security)"), geniok1980/openGym (CI structural checks) | gitleaks pre-commit hook and history audit; CI checks for secrets, big files, line endings, lockfiles | §5 item 11, examples for the release check |
| solhren/openGym (2026-10-10) | Drops `@capacitor/assets` tooling for a vulnerable dependency | §5 item 11; check whether upstream still carries it |
| alikulovuzz/kuch (2026-10-14/15) | Signed APK built on GitHub Actions; a "storage boundary" test that fails when an upstream merge touches the store; a sync runbook | Fork upkeep ideas (CONFLICTS.md, item 11's signing check) |

**Hevy behaviours the fork has no item for yet (backlog candidates)**

| Fork · commit | What | Note |
|---|---|---|
| vinayakgupta62/openGym `9ce5015f8`, `2e4e56286`, `502d63818` | After finishing, offer to keep exercises added mid-workout in the routine; also from History. Pure helper `lib/session-routines.js` with tests | Hevy asks "Update routine?" on Save. Good fit for M4 (Save Workout) |
| vinayakgupta62/openGym (2026-10-15 "automatically advance") | Move to the next exercise after the last set, every layout | Compare with upstream PR #563 first |
| soldsawn/openGym `be14748ab` | Running-workout bar above the tab bar with Resume and Discard | Hevy has exactly this; check what the fork's tab bar does today |
| ifrankerem/openGym `997992509` → `6c4635a9e` | Per-exercise weight unit (kg on one, lb on another), synced, with tests (`lib/exercise-unit.js`) | Hevy has per-exercise units. Touches sync (`api/sync-stamps.js`): only through upstream |
| ifrankerem/openGym `debf782c9`, `2c27004cf`, `1d9fe8a75` | Warm-ups carry over from the last session; "Repeat last session" progression incl. warm-ups | Upstream PR #485 is the same idea; follow that |
| jeanluyac-sketch/openGym `eac00d74a` | Swap opens on the same muscle | Hevy does this; check the fork's swap picker |
| Packebusch/openGym `49c494328` | Show what a workout holds before it starts | Hevy's routine preview (SCREENS.md); the fork may already have it via the routine card |
| its-everdred/openGym `ad781c945` | Set how long an exercise took | Small |
| furittsu-desu/openGym `6287c7efb` | Body-weight unit separate from the lifting unit | Small |
| slippylabs/opengym (2026-10-16) | Live PR toasts while logging | §5 backlog "live personal-record badge" |
| em4go/openGym `37e4b4d60`, `4be1c540e` | Percentage-of-training-max loading; ordered program blocks | Not Hevy; progression logic, upstream's call |
| camilopez/openGym `36d34ade7` | Progression says why it restarted | Not Hevy; for upstream |

Not taken: dafepro/openGym's Google Drive sync through a snapshot provider (D20 chose the sync-app
route); everything Coach (D11), nutrition, social and hosting.
