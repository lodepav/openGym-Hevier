# Code review: `3557ad47..0a40947c` (hevier/main)

57 commits, about 3,000 lines added: D49–D58, S29–S34, the release tooling and the screen
check. Docs-only changes (DECISIONS, RULES, PIPELINE, CHANGELOG) were skimmed, not reviewed.
The fork suite passes: 71 files and 449 tests (`npx vitest run src/hevier`), plus
`node --test hevier/tools/*.test.mjs`.

On the whole the code is in good shape. Seams are short and marked, logic sits in pure helpers
with tests, and most tests check real behaviour. Nothing found is a data-loss bug. Most findings
are about performance in the live workout, some duplication, leftover dead code and a few
brittle couplings.

Severity: **M** = worth fixing soon, **L** = low, fix when nearby, **N** = nit.

---

## 1. Possible bugs

| # | Sev | Where | Finding |
|---|---|---|---|
| 1.1 | M | `hevier/components/HevyExerciseBlock.jsx:104, 401, 405` | **`liveRecords(S)` runs once per exercise block on every render, plus twice per tick.** Each call recomputes `sessionRecords` over *all* session entries, so a render costs O(N²) in the number of exercises. Each call also builds `sigOf` (the whole `workouts` JSON + `dbLoad` + …) and string-compares it with the cached one. That compare is O(size of the log), so with a big imported Hevy history it is several MB of work per keystroke. The old D22 code had a `useMemo` here; it was dropped with the switch to D51. **Fix:** work out `liveRecords` once in `HevyWorkout` (or memoize by `S` identity in a `WeakMap`, since the store clones S on every change anyway) and pass it to the blocks. |
| 1.2 | L | `HevyExerciseBlock.jsx:133` + `views/Workout.jsx:1365` | **The count-up timer is offered while logging a past workout** (`playOn` excludes `editing` but not `A.backfill`), and backfill's **Mark all sets done** marks sets done without stopping a running timer. A done set that still has `hvRun` keeps counting in its TIME cell until Finish's `stopAll`. Easiest fix: `playOn = (timed \|\| cardio) && !editing && !A.backfill`, since a timer makes no sense for a past workout. |
| 1.3 | L | `hevier/components/WorkoutCard.jsx:76` | `who ? who.trim()[0].toUpperCase()` crashes the feed when the user's name is only whitespace (`' '.trim()[0]` is `undefined`). Use `who.trim()` as the condition. |
| 1.4 | L | `hevier/lib/records.js:202` | `recordValue('sec')` rounds the seconds but not the minutes: 119.6 s reads `1:60`, and an hour-long hold reads `61:40`. Use `elapsedClock(Math.round(r.v))` from `elapsed.js`, which the rest of D53 already uses. |
| 1.5 | L | `lib/update.js` (S6) | `tagVersion` strips `gohevier-` **or** plain `v`, so if a GitHub *release* is ever made from an upstream `vX.Y.Z` tag on the fork's repo, `releases/latest` would offer `1.4.x` (upstream's numbering, a higher number than Go Hevier's) as an "update". Pushed tags without a release are harmless, so this is a trap more than a bug. Accepting only `gohevier-v…` in the fork would close it. |
| 1.6 | L | `hevier/lib/hevy-import.js:122` (`bareBrand`) | In a Hevy title, *any* second bracket becomes a brand. A Hevy custom exercise named e.g. `Hip Thrust (Barbell) (Paused)` would import as plain hip thrust with brand "Paused", and its history would merge with the normal lift. This follows D29 as documented, but the risk is not written down there and could surprise later. At least mention it in D29, or only take the bracket as a brand when the remaining title matches something. |
| 1.7 | N | `hevier/lib/nearby-gyms.js:85–87` | Photon failures throw `'overpass timeout'` / `'overpass 500'`. The messages are wrong for Photon, and if anything ever branches on them the two services will be confused. Give `ask` a name argument. |
| 1.8 | N | `frontend/android/app/hevier.gradle` | `tokenize('.').collect { it as int }` fails the build on a pre-release VERSION such as `1.3.0-rc1`. Fine as long as the fork never uses one (YAGNI), but the failure would be cryptic. |

## 2. Code smells and brittle couplings

| # | Sev | Where | Finding |
|---|---|---|---|
| 2.1 | M | `hevier/lib/rest-default.js:12` (S33) | The rest wheel's "default rest" is detected by **comparing the translated `off` label** with `t('Default ({0})', fmtRest(restSec))`. If upstream rewords that string, or one caller formats the rest differently, D56 silently stops working, and the test can't catch it because it builds the label the same way. A seam that passes an explicit flag (`durationSheet({ …, defaultRest: true })`) would be sturdier, at the cost of touching callers. At least add a test that opens upstream's real `durationSheet` from the workout's rest row. |
| 2.2 | L | `hevier/views/ExerciseDetails.jsx:41–43` | `ExerciseFacts` sorts upstream's `detailTags` into Primary, Secondary and Equipment **by their icon names** (`figureStrength`, `kettlebell`). That reads upstream's presentation as data: an icon change upstream silently empties these lines. Reading `ex` (its muscles and equipment) directly would be more robust. |
| 2.3 | L | `HevyExerciseBlock.jsx:337` and `:348` | The `onTypeOver` / `onRestore` pair (structuredClone, restore, untouch) is copy-pasted between the `DurationField` branch and the `HintNumberField` branch. Pull it into one `hintProps(k)` helper. |
| 2.4 | L | `hevier/views/WorkoutTab.jsx:34` vs `components/HevyTabBar.jsx:55` | The discard (`active = null`, `stopRest`, `stopWork`) is written twice. A shared `discardActive()` would keep the two from drifting, for example if the stopwatch (`hevier_stopwatch`) ever needs clearing too. |
| 2.5 | L | `hevier/views/Statistics.jsx:84` | The Monthly report row checks `all.workouts.length` but Structural balance checks the *counted* `S.workouts.length`. If every workout is excluded from progression, one row disappears and the other doesn't. Pick one. |
| 2.6 | L | `hevier/components/useDragReorder.js:33` | The `touchmove` listener effect has no dependency array, so it is removed and added again on every render of every reorderable list (the Workout tab re-renders often). `[]` works because `listRef` is stable. |
| 2.7 | N | `hevier/components/HevyTabBar.jsx` | `last.current = tab` mutates a ref during render. It works, but it is the pattern React warns about. Harmless here. |
| 2.8 | N | `hevier/views/HevyWorkout.jsx:70` | The live workout still has its own `.hv-bar` markup, while every other page moved to `PageBar` (D49). Intentional? If so, note it in D49. |
| 2.9 | N | `hevier/lib/records.js:55, 71` | `isAssisted(exId)` is computed into `assisted` and then called again two lines later. |

## 3. Dead code and leftovers

| # | Where | What |
|---|---|---|
| 3.1 | `hevier/hevier.css:334` | `.hv-xd-tags` is no longer rendered (it was replaced by `ExerciseFacts`). |
| 3.2 | `hevier/hevier.css:221` | `.hv-routine .hv-bar`: the routine editor and preview now use `PageBar`. |
| 3.3 | `hevier/components/ClockSheet.jsx:90` | `(on ? ' on' : '')`: the line above returns when `!on`, so it is always `' on'`. |
| 3.4 | `hevier/components/WeeklyChart.jsx:47` | `axis`: the `volume` branch and the fallback are identical (`fmtNum(Math.round(v))`). |
| 3.5 | `hevier/tools/release-notes.mjs:81` | `tags.find(t => t !== ref)`: `ref` is `HEAD` or `<tag>^`, never a tag name, so this is always the first tag. |
| 3.6 | `hevier/tools/screens.mjs:168` | The comment says the Workout tab can't be reached while a workout is open. Since D13's 2026-10-18 change it can (`/routines`), and `SCREENS` doesn't include `/routines`. Add it and drop the "not checked" note. |
| 3.7 | `hevier/hooks.js:7` | The `done` hook's comment still lists `prs, e1prs`. Upstream does pass them, but the fork's handler no longer reads them. Fine, but a one-word "(unused by the fork)" would help. |

## 4. Over-engineering and simplifications

| # | Where | Suggestion |
|---|---|---|
| 4.1 | `hevier/lib/records.js:150–175` | Two module-level single-slot caches (`last`, `lastPrior`), each keyed by a concatenated multi-MB string. Since `S` is a new object on every store change, a `WeakMap<S, result>` (plus the `editing` id for the prior bests) gives the same hit rate with no string building or comparing. Together with 1.1 this removes most of the live-workout cost. |
| 4.2 | `hevier/views/ExerciseDetails.jsx:142–143` | `all` (counted) and `logged` (raw) are both `exerciseSummary` calls, even when nothing is excluded (`countedS(st) === st`). `const logged = counted === st ? all : …` halves the work in the usual case. The same applies to `sum`/`hist`. |
| 4.3 | `hevier/lib/set-timer.js` | `stopAll` returns the `[entry, set]` pairs it stopped, but only the test reads them. Returning a count (or nothing) is enough. Minor. |
| 4.4 | `hevier/lib/note-text.js` | `initNoteFix` runs at launch and on every `workouts` change, forever, to fix a one-off import bug from before D54. Fine for now (cheap `needsFix` scan), but the subscription could be dropped after a release or two, keeping only the launch pass for workouts that arrive by sync. Consider a "remove after" note. |

## 5. Tests that test little

| # | Where | Finding |
|---|---|---|
| 5.1 | `hevier/lib/hevy-import.test.js` (new block "follows Hevy's own picture…", and the `0585→7108`, `1767→1755`, `2289→2315` edits) | Most assertions **restate the `FIXES` table**: change a row and you change the test with it, so they catch typos at best. The valuable parts are the `EXIDX` existence loop and the brand, cable and per-side parsing. Consider cutting the per-title id checks down to one or two representative ones and keeping the parsing cases. |
| 5.2 | `hevier/lib/records.test.js:77` | "holds and cardio: the longest" tests **only holds**. The cardio `min` kind (a session record summed over sets) has no test. |
| 5.3 | `hevier/lib/records.test.js:6, 78` | The fallbacks `?.id \|\| 'plank'` and the two-step `PULLUP` lookup **hide a missing catalogue entry**: if the plank isn't found, the test runs with a made-up id and still passes, because the target's `mode: 'time'` carries it. Look up a known id directly (as `CABLE = '8878'` does) or `expect` the lookup. |
| 5.4 | `hevier/lib/rest-default.test.js` | It builds `off` with the same `t('Default ({0})', fmtRest(sec))` expression as the code, so it can never catch the coupling in 2.1. |
| 5.5 | `hevier/lib/counted.test.js` "keeps one answer per log and per S" | It checks that a cache returns the same object twice, which is an implementation detail. Harmless, but it doesn't guard any behaviour users see. |
| 5.6 | Missing | No test for `useDragReorder`'s long press (slop cancel, click swallowed after a drag), and none for the Workout tab's "starting another workout asks first" path (D13). Both are user-facing behaviour that is easy to regress in a merge. |

What's good: `set-timer`, `duration-entry`, `chart-ticks`, `elapsed`, `note-text`, `hold-mode`
(including the hook-empty upstream case), the records ordering, tie, brand and editing cases,
the nearby-gyms fallback with fake timers, and `release-notes` all test real behaviour at the
edges.

## 6. Process

- **658d4cab** removed a merge-conflict marker that had been committed into `DECISIONS.md` and
  shipped in a merge. The `verify` or `seam-check` skill could add a one-line guard:
  `git diff --cached | grep -nE '^\+(<{7}|={7}|>{7})( |$)' && exit 1`.

---

### Suggested order

1. 1.1 together with 4.1 (live-workout performance with a large log).
2. 1.2, 1.3, 1.4 (one-liners).
3. 2.1 or 5.4 (make D56 fail loudly rather than silently).
4. Section 3's cleanup and 5.2 / 5.3, in one small branch.

---
---

# Part 2: Dependency security (2026-10-18)

**Method.** Trivy 0.74.0 (the fork's pinned scanner; vulnerability DB updated 2026-10-17
18:34 UTC, under a day old) over all four lockfiles, dev dependencies included, every severity.
It was run twice: with `hevier/security/trivyignore.yaml`, as `release-check.sh` runs it, and
without, to see what the allow-list hides. `npm audit` was a second source. `npm ls` traced each
finding to what pulls it in, `npm outdated` / `npm view` gave the newest versions, and the fork's
`supply-chain.mjs` checked the package baseline and the built bundle.

## 2.1 Result

| Lockfile | Trivy (with allow-list) | Trivy (raw) | npm audit |
|---|---|---|---|
| `package-lock.json` (root) | 0 | 0 | 0 |
| `api/package-lock.json` | 0 | 0 | 0 |
| `mcp/package-lock.json` | 0 | 0 | 0 |
| `frontend/package-lock.json` | 0 | **16** (1 critical, 11 high, 4 medium) | 7 packages (1 critical, 3 high, 3 moderate) |

Supply-chain gates: `packages: ok, 674 reviewed`; `bundle: ok, 86 files, 17 hosts all
allow-listed`.

**Nothing vulnerable ships in the APK, the PWA or the API image.** All 16 raw findings sit
under one dev tool, `@capacitor/assets@3.0.5`, and every one is in the reviewed, expiring
allow-list (expires 2027-01-17).

## 2.2 The findings, and what pulls them in

```
@capacitor/assets@3.0.5            (upstream devDependency, run by hand only: npx capacitor-assets generate)
├─ @capacitor/cli@5.7.8 ─ tar@6.2.1          13 CVEs (1 critical, 8 high, 4 medium)
├─ @trapezedev/project@7.1.10 ─ xcode@3.0.1 ─ uuid@7.0.3   1 CVE (medium)
└─ sharp@0.32.6 (pinned exactly)              3 GHSAs (high; libvips, libheif, librsvg)
@capacitor/cli@7.6.8 (the CLI the build runs) ─ tar@7.5.21   clean
```

`npm audit` also flags `@capacitor/cli`. That is **the nested 5.7.8 copy under
`@capacitor/assets`**, not the 7.6.8 the build runs (`cap sync`), whose `tar@7.5.21` already has
every fix. I checked this because the allow-list says "all of these come from
@capacitor/assets", and it is correct.

| Package | Installed | Worst | CVEs / advisories | Safe (minimum fixed) | Newest |
|---|---|---|---|---|---|
| tar | 6.2.1 | **CRITICAL** CVE-2026-59873 (DoS, gzip bomb) | CVE-2026-23745, -23950, -24842, -26960, -29786, -31802 (file overwrite / path traversal, HIGH), -59874, -73566 (DoS, HIGH), -53655, -59871, -59875 (MEDIUM) | **7.5.21** (the last fix, CVE-2026-73566) | 7.5.22 |
| sharp | 0.32.6 | HIGH | GHSA-f88m-g3jw-g9cj (libvips), GHSA-rgj7-g3m4-5g8c (libheif), GHSA-wq5f-xc86-pv6w (librsvg) | **0.35.5** | 0.35.5 |
| uuid | 7.0.3 | MEDIUM | CVE-2026-41907 (missing buffer bounds check in v3/v5/v6) | **11.1.1** (or 12.0.1 / 13.0.1) | 14.0.3 |
| @capacitor/assets | 3.0.5 | (carrier) | pins `sharp@0.32.6` exactly and `@capacitor/cli@^5.3.0` | none: **3.0.5 is the newest** (2026-09-28) and still pins them | 3.0.5 |

**Exposure.** It is low in practice: these only run when someone runs `npx capacitor-assets
generate` on a source image they chose. The tar issues need a malicious archive, and the sharp
ones a malicious image. Still, the allow-list's expiry (2027-01-17) only puts the decision off.

**What to do (in order of preference):**
1. **Drop `@capacitor/assets` upstream** (the fork recolours PNGs with
   `hevier/tools/recolour-icons.py` and never runs it; PIPELINE.md notes the solhren fork already
   dropped it). This is upstream's `package.json`, so it should go as an upstream PR, as the
   allow-list already says.
2. If it must stay, **npm `overrides`** in `frontend/package.json`:
   `"overrides": { "@capacitor/assets": { "sharp": "0.35.5", "@capacitor/cli": "7.6.8" }, "uuid": "11.1.1" }`.
   That clears all 16, but the fork can't carry it without a new seam in an upstream file. Also
   `@capacitor/assets` was written against sharp 0.32's API and Capacitor CLI 5, so test
   `capacitor-assets generate` once before relying on it.
3. Otherwise keep the allow-list, and re-check at expiry whether upstream moved.

## 2.3 Direct dependencies: current, safe and newest

None of these has a known advisory at the installed version, so "safe" is the version
installed. "Wanted" is the newest within the declared range (a lockfile refresh). "Newest" may
be a major upgrade.

**api/** (ships in the API image):

| Package | Installed | Wanted (safe, in range) | Newest | Note |
|---|---|---|---|---|
| @simplewebauthn/server | 13.3.2 | 13.3.3 | 14.0.3 | Major 14 is the auth path: read its changelog before moving. 13.3.3 is a patch, take it. |
| undici | 7.30.0 | 7.30.1 | 8.12.2 | 7.x is still patched (7.30.1, 2026). Major 8 needs Node ≥ 22, which the image already has. |
| web-push | 3.6.7 | 3.6.7 | 3.6.7 | Current. |
| @anthropic-ai/claude-agent-sdk (optional) | 0.3.223 | 0.3.302 | 0.3.302 | 79 releases behind. A pre-1.0 SDK, so take the update in range, but only with the AI coach off by default in the fork (D11). |

**frontend/** (ships in the APK and PWA):

| Package | Installed | Wanted | Newest | Note |
|---|---|---|---|---|
| react / react-dom | 19.2.8 | 19.3.1 | 19.3.1 | In range. |
| react-router-dom | 7.18.2 | 7.18.4 | 7.18.4 | In range. |
| zustand | 5.0.14 | 5.0.15 | 5.0.15 | In range. |
| lean-qr | 2.7.3 | 2.7.4 | 2.7.4 | Only serves the gym check-in, which the fork hides (D12). |
| @capacitor/core, cli, android, ios | 7.6.8–7.6.9 | 7.6.9 | **8.5.3** | Capacitor 8 is what upstream's `release-1.4.2` moves to (memory: `npm ci` on branch switch). Take it with that merge, not on its own. |
| @capacitor/app, filesystem, local-notifications, share | 7.x | 7.x | 8.x | Same: with the Capacitor 8 merge. |
| @aparajita/capacitor-secure-storage | 7.1.6 | 7.1.6 | 8.0.1 | Holds the Hevy API key (D34). Move with Capacitor 8. |
| @capacitor-mlkit/barcode-scanning | 7.5.0 | 7.5.0 | 8.2.1 | Its native code is already stripped from the APK (D50). |
| vite | 8.1.5 | 8.3.4 | 8.3.4 | Build only. |
| vitest, @vitest/coverage-v8 | 4.1.11 | 4.1.12 | 5.0.5 | Test only. |
| happy-dom | 20.11.2 | 20.14.6 | 21.0.3 | Test only. |
| @vitejs/plugin-react | 6.0.4 | 6.1.2 | 6.1.2 | Build only. |

**mcp/**: `zod` 3.25.76 (newest 4.6.7, a major rewrite; 3.x is fine) and vitest as above.

**Advice.** A plain lockfile refresh within ranges (`npm update` in api, frontend and mcp) picks
up every "Wanted" column and changes no major. This is upstream's lockfile, so it is best
inherited from upstream's next release. The Capacitor 8 move belongs to the upstream 1.4.2 merge.

## 2.4 Gaps in the gates

| # | Sev | Finding |
|---|---|---|
| G1 | M | **The Android (Gradle) dependencies are not scanned.** Trivy runs over the npm lockfiles only. `androidx.*`, `androidx.health.connect:connect-client`, Capacitor's Android library and the plugins' AARs reach the APK with no vulnerability check, and there is no Gradle lockfile for a scanner to read. Fix: turn on Gradle dependency locking in `hevier.gradle` (`dependencyLocking { lockAllConfigurations() }`, then `./gradlew dependencies --write-locks`) and add the lockfile to Trivy's scan (Trivy reads `gradle.lockfile`). This touches the fork's own file only. |
| G2 | L | The vulnerability DB is refreshed only when `release-check.sh` runs. It was under a day old today, but a stale DB passes silently. Print `UpdatedAt` from `~/.cache/trivy/db/metadata.json` in the gate's output, and fail if it is older than e.g. 7 days. |
| G3 | L | `npm audit` and Trivy agree today, but they read different databases (GitHub advisories vs. Trivy's merged DB). One of them is enough for the gate. Running `npm audit --omit=dev` as an informational line costs nothing and catches GHSA-only advisories sooner. |

---

# Part 3: UI/UX review (2026-10-18)

**How this was checked.** The debug APK of `0a40947c` ran on the emulator (`xperia1vi_api36`,
1080×2340) and was driven with `cdp.mjs`, following the `emulator-check` and `hevy-side-by-side`
skills. So that Statistics, the report and Profile had realistic data, the user's real Hevy
history (`~/Downloads/workout_data.csv`) was imported first: 255 workouts and 6,160 sets from
18 Mar 2025 to 15 Oct 2026, for 258 workouts in all. **That history is still on the emulator.**
The state before the import was saved outside the repo. The Hevy references
are SCREENS.md §6 (`Img-4630-4631-4632`) and §10 (`Img-4360-4361-4362-1`). Each difference was
checked against DECISIONS.md: *intended* means a decision chose it, and theme and colour are D17's.

Severity: **H** = misleading or wrong for the user, **M** = friction or inconsistency the user
notices, **L** = polish.

## 3.1 Settings

### Root (`/settings`)

| # | Sev | Element | Hevy | Fork | Kind | Fix |
|---|---|---|---|---|---|---|
| S1 | M | Page bar | Title in a 44 pt bar with a hairline, the same on every page | The title sits ~13 CSS px lower than on Statistics and Profile, with no hairline; the search field is part of the header block | layout | `theme.css`, "Page bars": give upstream's `.sp-root` header the same height and padding as `PageBar` and the same `border-bottom`. Without that, D49 ("one page bar everywhere") is broken on the most visited upstream page. |
| S2 | M | Durations | `2min 0s` everywhere (Workout Settings → Default Rest Timer) | The root reads `1:30 rest`, the Workout page `1:30` and `15s`, the live workout `Rest Timer: 1min 30s`, the report `24h 17m`, Profile `3h 11m this week`, the live header `25h 42min` | copy | D49 makes Hevy's format the rule (`hevier/lib/elapsed.js`). Route the remaining previews through it: `relabelPage`/the row previews in `hevier/lib/settings.js`, Profile's headline, and the report's tiles (`min` versus `m`). |
| S3 | L | "Workout" group | — | The group **Workout** opens with a row also called **Workout**, which reads as a duplicate | copy | Rename the row in the fork's root (D16 regroups the root, so the label is fork-owned): "Rest & logging" or "During a workout" (upstream's own old title). |
| S4 | L | Volume + Muscle sets | — | Two root rows, two pages, for one question ("how are sets per muscle counted?"); the second has a stick-figure icon | layout | Fold D42's choice into D18's page as a second section (one row, "Volume", preview `Sets · main muscle`). Both are fork rows (`hevier/lib/settings.js`), so no seam changes. Also, D18 and D42 say these rows sit "under Preferences", which D16's 2026-10-17 regroup renamed. The decision text is stale. |
| S5 | L | Look & Home | — | The only navigating row without a preview, so it looks unfinished next to `kg · English` | copy | Preview the body diagram (`Male`) or the number of Home widgets shown. |
| S6 | L | Version | Hevy shows its version once, on a sub-page | `v1.2.0+0a40947c` on the About row **and** `Go Hevier 1.2.0+0a40947c · based on openGym 1.4.1` as the footer two lines below it | extra | D52 chose both places on purpose (*intended*). Still, the row preview could be dropped (keep `Off`-style previews for state), leaving the footer as the one place. Keep this as a suggestion. |
| S7 | — | Grouped bands, search, previews | Hevy's root has no previews and no search | The fork keeps upstream's search and previews | extra | *Intended* (D16). It is the better UX here: a preview answers "what is it set to" without a tap. |

### Workout page (upstream's, by D16)

| # | Sev | Finding | Fix |
|---|---|---|---|
| S8 | L | **Fine-tuning** hangs under "Before and during" with a large gap above it and no group of its own, so it reads like a stray row. | `theme.css`: tighten the gap, or relabel it as its own group in the page tree (`relabelPage`, S12). |
| S9 | L | The rest note says per-exercise rest is set "in the exercise settings of a routine". The live workout's ⋮ and D56's wheel set it too. | Upstream copy, so offer the fix upstream rather than patching it. |
| S10 | — | The rows D16 hides (Layout, Collapse completed, steppers…) are gone, and Effort per set, Weigh in and Keep screen awake read clearly, with Hevy's grey paragraphs. | Good as is. |

### Look & Home

| # | Sev | Finding | Fix |
|---|---|---|---|
| S11 | L | "Body diagram: Male / Female" and "Exercise drawings: Male / Female" are two identical-looking choices on the same screen. The subtitle of the second explains it only partly. | Upstream's rows. A one-line subtitle on the first ("The body maps on Stats and Home") would remove the doubt; offer it upstream. |
| S12 | L | "On Home → Body weight" is a second switch for a widget that Edit Home also shows and hides. | *Intended* (D12 reuses `S.showWeightCard`). It may be worth pointing the subtitle at Edit Home, so the user learns the main path. |

## 3.2 Statistics (`/stats`, `/stats/all`, `/report`, Profile chart)

### Statistics root

| # | Sev | Element | Hevy | Fork | Kind | Fix |
|---|---|---|---|---|---|---|
| T1 | **H** | Sets per muscle, two answers | One number per muscle | Statistics says **Quadriceps 4** for this week. All statistics → Muscle balance, "Week of 12 Oct" (the same week), says **Quads 14.6/11.2 · 130%**. Glutes are 12 against 12.4. The name differs too (Quadriceps / Quads). | copy, logic | Both are right for their own rule (D42's "main muscle only" against upstream's share-load), but next to each other they read as a bug. Either show D42's mode on Muscle balance's caption ("counts secondary muscles in part"), or, when `hvMuscleSets === 'main'`, label the fork's own list "main muscle only" more visibly than the small caption at the bottom (it is the last line of the card). Unifying the muscle names is upstream's (`labels`). |
| T2 | M | Body map | Heat with clear steps | With six training days, nearly every muscle is the same saturated blue; only forearms, neck and shins stand out. The map says "you trained everything", which carries no information | colour | Scale the shading to the week's maximum, or use 3–4 discrete steps (Hevy's heat). It is upstream's `BodyMap` with the fork's blue (D49), so the fix is the fork's scale passed in, not a change to upstream's map. |
| T3 | M | Deltas | — | Three glyphs for the sign: `+11`, `-3` (hyphen-minus, amber), `–` (en dash for "no change"); the report uses `−13` (true minus, red) | type | One helper for signed deltas (`−` U+2212, `+`, and `±0` or a blank for zero), used by Statistics, the report and the Profile week sheet. Amber on Statistics against red on the report is also a mismatch for the same "down". |
| T4 | L | "Cardio" as a muscle group | Hevy counts cardio apart | `Cardio 1 +1` is listed among the muscles | logic | Leave cardio out of the per-muscle list (or show it under the list as "Cardio sessions"). `hevier/lib/` muscle count (D18/D42 helper). |
| T5 | L | Chart over time | A line chart per muscle, period and granularity menus | Bars for the period plus a delta against the last one | layout | No decision covers it. The fork's version is easier to read at a glance; the over-time view lives in All statistics. Note it as a possible follow-up, not a defect. |
| T6 | L | Footnote | — | "Work sets, each for its main muscle · vs last week" sits under 12 rows, where it is easily missed, and it is what explains T1 | layout | Move it under the Week · Month · Year chips. |

### Monthly report (`/report`, D23)

| # | Sev | Finding | Fix |
|---|---|---|---|
| T7 | **H** | **The PR list buries the report.** September has 44 records over about 25 cards, each card 2–3 lines high, so the calendar, muscle split and top exercises start three or four screens down. The same exercise shows up four times (Dumbbell Standing Single Leg Calf Raise). Hevy's report shows the PR count and a short list. | Show the first 5 (or one row per exercise, with its best record and "+3 more"), then **Show all 44**. `hevier/views/MonthlyReport.jsx`. |
| T8 | M | "PRs 44" counts records, while the list has ~25 rows. A user counting rows sees a mismatch. | Say "44 records in 25 sessions", or count rows. |
| T9 | M | The date on each PR card is set as large as the exercise name and right-aligned, so it competes with the name and squeezes long names onto two lines ("Smith Unilateral Bulgarian Split / Squat From Deficit"). | Grey date at the secondary text size, under the records or inline with the first one. |
| T10 | L | The tiles mix units of change: Workouts `+4` and Sets `−13` are absolute, Duration `+13%`. | One kind, absolute (`+2h 47m`), as Hevy's report does. |
| T11 | L | "Longest Duration · 21 min" for cardio: D53 shows set times as a clock (`21:00`) everywhere else in the fork. | Use `hevySetLabel`'s clock in `records.js`'s display value. |
| T12 | L | A custom exercise from the import shows as "Face Pull (Lifefitness)". The CSV has "LifeFitness" (the casing changed on the way in), and the brand stayed in the name because it is the only bracket (D29 cuts a second bracket only). | Data, not UI. The D33 review can map it to Face Pull with brand LifeFitness. It may be worth widening D29's rule to a known-brand list (the user's own brands from `S.hvMachines`) for a single bracket. |

### Profile chart (D14, D49)

| # | Sev | Finding | Fix |
|---|---|---|---|
| T13 | L | The x-axis labels are 4, 3 and 4 weeks apart (27 Jul · 24 Aug · 14 Sept · 12 Oct), so the bars under them look misaligned with the dates. | `chartTicks` (S30): pick an even step that divides the bar count, or label every 4th bar counting from the right edge. |
| T14 | L | The headline "3h 11m this week" and the 258 above it are two different scopes stacked with no separation. Hevy puts the workout count in the header beside the avatar. | *Intended* in part (D49 puts the count under the bar). Make it smaller and grey, one line: "258 workouts". |

### All statistics (upstream's, S34)

| # | Sev | Finding | Fix |
|---|---|---|---|
| T15 | L | "Stats / Progress & history" is a second title under the page bar, and "Weight 30d –" shows an empty tile when there are no weigh-ins. | Hide the inner heading by CSS (as D49 does elsewhere), and hide the empty tile. Both stay in `theme.css`. |
| T16 | L | "14.6/11.2 · 130%" has no unit or legend on the row; you have to know it is "sets done / sets planned". | Upstream's. Offer "14.6 of 11.2 planned" upstream. |

## 3.3 The new features in the live workout and picker

| # | Sev | Feature | Finding | Fix |
|---|---|---|---|---|
| F1 | M | D43 cable ×2 | With **Cable ×2** chosen, the weight column still reads **KG**, although the number typed is per stack and volume counts both stacks. A user switching to ×2 halfway through a workout gets no hint that the meaning changed. | Header `KG / STACK` (or `KG ×2`) while the entry is `dbLoad: 'each'`. `HevyExerciseBlock`'s header. |
| F2 | M | D10 / D53 | The open test workout has run for **25h 42min**, and its stopwatch for 24 h, with nothing saying so. Hevy asks whether you are still training after a few hours. | A "Still training?" line in the resume bar or the header after e.g. 4 h, offering Finish (with the end time set to the last ticked set) or Discard. That needs a decision. |
| F3 | L | D2 | In a fresh workout, set 1's `0` kg renders bold white while sets 2–3 render grey. This workout was left open from earlier tests, so set 1 may have been edited then. **Unconfirmed**: start a fresh workout and check that all three rows are grey. | If it reproduces, check the "touched" derivation for the first row (`HintNumberField`). |
| F4 | L | D54 | "Add workout notes here…" sits directly under the gym line's hairline and above the first exercise with less space than between exercises, so it reads as part of the first exercise. | `theme.css`: the same vertical rhythm as the exercise note, or a hairline under it too. |
| F5 | — | D58 | The chart button on each picker row works, has an accessible name (`Details`) and a 36×36 target, and "Recent Exercises" is right (the log is in date order after the import). | Good as is. |
| F6 | — | D49 / D28 | The gym line (`Holmes Place ⌄`), the machine-label line and the Rest Timer line read cleanly and match Hevy's block (D7). | Good as is. |

## 3.4 Suggested order (UI/UX)

1. **T7** (cap the report's PR list) and **T1/T6** (say which count Statistics uses). These are
   the two places where the screen misleads.
2. **S1** and **S2/T3**: one page bar on Settings, and one duration format and one minus sign.
   These are small CSS and helper changes that make D49 true everywhere.
3. **F1** (the ×2 header) and **T2** (body map scale).
4. The L items as they come up; **F2** needs a decision (D59) first.

Screenshots of every screen above are in [screenshots/](screenshots/): settings.png,
settings-bottom.png, settings-workout.png, settings-look.png, stats.png, stats-all.png,
report.png, profile.png, workout.png, picker.png.
