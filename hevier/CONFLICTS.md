# Syncing upstream and resolving conflicts — guide for AI agents

You are merging upstream openGym into this fork. Read this whole file before touching a
conflict. Also read [README.md](README.md) (the four rules) and [SEAMS.md](SEAMS.md) (the
only places the fork edits upstream files).

## The one principle

**Upstream owns logic; the fork owns presentation.** When the two collide, keep upstream's
code as it is now and re-apply the fork's intent on top of it, at the seam or in the fork's
own files. Never "fix" a conflict by bringing back the old upstream code the fork was built
against.

## Procedure

```bash
# 0. Clean tree, on the fork trunk
git status --short            # must be empty
git checkout hevier/main

# 1. Update the mirror (fast-forward only; if this fails, someone committed to main: stop and ask)
git fetch upstream --tags
git checkout main && git merge --ff-only upstream/main && git checkout hevier/main

# 2. Choose the target: the newest release tag is preferred over the tip of main
git tag --list 'v*' --sort=-v:refname | head -3
TARGET=v1.4.2                 # or: TARGET=main

# 3. Read what changed BEFORE merging: the intent behind the code
git log --oneline hevier/main..$TARGET | wc -l
git show $TARGET:CHANGELOG.md | sed -n '1,80p'
# which seam files did upstream touch? (these are where conflicts will be)
git diff --stat hevier/main...$TARGET -- $(git grep -l '\[hevier\]' hevier/main | cut -d: -f2-)

# 3b. List what the release brings and get the user's decisions (see "Decide what a release
#     brings"). Nothing lands until every item has one.

# 4. Merge on a throwaway branch, so a bad resolution never lands on the trunk
git checkout -b sync/$TARGET hevier/main
git merge --no-ff $TARGET -m "hevier: merge upstream $TARGET"
#    rerere re-applies resolutions it has seen before; check them anyway (git diff)

# 5. Resolve (rules below), then the gate (the verify skill): the whole suite and the fork
#    build, and the api, mcp, locale and fork Java checks for what changed
(cd frontend && npm ci) && (cd api && npm ci) && (cd mcp && npm ci)
hevier/tools/verify.sh

# 6. Device check (see "Verification")
HEADLESS=1 hevier/tools/emulator.sh

# 7. Land it
git checkout hevier/main && git merge --ff-only sync/$TARGET && git branch -d sync/$TARGET
```

Never `git push --force` a `hevier/*` branch, and never commit to `main`.

## Whether to merge at all

Agreed with the user on 2026-10-25: **a release is not merged just because it is out.** The user
likes how the app works now, so before any merge, weigh what the release actually gives the fork
and bring the user a recommendation:

- **For:** seams it removes (a feature the fork ported ahead, D27, D47, …, that upstream now
  carries), fixes to logic the fork reuses, security fixes.
- **Against:** bloat (features, settings or screens the fork would only have to hide, new
  dependencies, a bigger bundle or APK) and trouble down the road (new seams, restructured files
  the fork wraps, behaviour the fork would have to undo).

A release that removes several seams without much bloat is worth merging; one that mostly adds
what the fork would hide is not, and can wait for a later one. Write the weighing down (the
release, what it removes, what it adds, the recommendation) and let the user decide. Only then
the decision round below.

## Decide what a release brings

Every upstream release gets a decision round with the user, **before it lands on
`hevier/main`**. A merge can be clean and still change how the fork's app works, so this is not
about conflicts: it is about what the user wants. The agent lists and recommends; **the user
decides**. Don't settle an item yourself because it looks obvious.

1. **List** every new feature and every change of behaviour in the release: its CHANGELOG entry
   since the last merged version, `git log --oneline hevier/main..$TARGET`, and PIPELINE.md's
   rows for that version (what the fork built ahead and its "At the merge" notes, D27, D45, …).
2. **Sort** them. *Nothing to decide:* fixes, server, security, sync and store internals, and
   anything that only changes upstream's own screens the fork doesn't show. *Needs a decision:*
   - a new feature, screen, setting or flow the user would see or could reach;
   - a change in how something works that a decision (D1, D2, …) or a fork screen relies on, or
     that goes against Hevy's UX (RULES.md, "Scope");
   - something the fork already built ahead (take upstream's and delete the fork's copy, or
     keep the fork's);
   - a new permission, endpoint, dependency or data field.
3. **Ask**, one item at a time or a short batch: what it is (with the commit id), what the fork
   does today and which decision it touches, the options, and your recommendation. The usual
   options are: take it as upstream has it · take it, shown the Hevy way in the fork's UI ·
   leave it out of the fork's UI (as D16 hides rows; stored values untouched) · keep the fork's
   way. Keeping old *behaviour* against upstream's logic is a fork wrapper with a test (rule 2),
   never upstream's code put back.
4. **Record** each answer before the code that follows it: a new D row in DECISIONS.md, or a
   dated change to the decision it touches (an "at the merge" decision is closed there). The
   items with nothing to decide, and the ones left out, go in the merge commit's body; update
   PIPELINE.md's rows for that version.
5. An item still open keeps the merge on its `sync/` branch. Don't land it with a guess.

## Classify every conflicted file first

```bash
git diff --name-only --diff-filter=U
```

| Where the file is | What to do |
|---|---|
| `hevier/**`, `frontend/src/hevier/**` | Can't conflict with upstream. If it does, a fork branch is involved: resolve by fork intent. |
| An upstream file **with** a `[hevier]` marker (a seam in SEAMS.md) | **Rule A**: rebuild the seam on top of upstream's new code. |
| An upstream file **without** a marker | The fork should never have edited it. **Rule B**: take upstream (`git checkout --theirs <file>`), then move the fork's change into a seam or a fork file, *and* add it to SEAMS.md. |
| `frontend/src/locales/*.js` | **Rule C**: always take upstream. The fork has no locale entries. |
| `frontend/package.json`, `package-lock.json` | **Rule D**: take upstream, then re-run `npm install` to regenerate the lock if the fork really added something (it shouldn't: no new dependencies). |
| `CHANGELOG.md`, `README.md`, `docs/**`, `.github/**`, `.gitlab*` | Take upstream. The fork documents itself in `hevier/` only. |
| `frontend/android/**` | Take upstream, then re-apply seam S7 (one `apply from:` line). |

## Rule A — rebuilding a seam

In a conflict hunk (style `zdiff3`) you see three versions:

```
<<<<<<< ours        the fork: base + the seam
||||||| base        upstream as the fork last saw it
=======
>>>>>>> theirs      upstream now
```

1. Diff **base → theirs**: this is what upstream changed, and it is non-negotiable. Note
   renamed variables, moved code, and new conditions.
2. Diff **base → ours**: this should be *only* the lines between `[hevier]` markers. If ours
   differs from base anywhere outside the markers, that is undeclared fork drift. Treat it as
   Rule B.
3. Write the result as **theirs + the seam re-applied**, adapted to upstream's new names and
   structure. The seam stays as small as before. Don't grow it to restore code upstream
   removed.
4. If upstream removed the thing the seam hooks into (for example the layout whitelist in
   `Workout.jsx` became a registry), find the new equivalent hook point. If upstream now has a
   proper extension point, **use it and delete the seam.** That is a win; update SEAMS.md.
5. If there is no sane hook point left, stop and report: what upstream changed (with commit
   ids), why the seam no longer fits, and two options. Don't invent a large edit to
   upstream's file.

### Seam-specific notes

- **S3 `views/Workout.jsx`.** The file upstream changes most often after `sheets.jsx`.
  The fork only adds two imports and `if (HEVIER) return <HevyWorkout …/>` before
  `ActiveWorkout`'s final `return`, after every hook. If upstream added new props to `blockProps`
  or `ExerciseBlock`, the merge is clean but `HevyWorkout` may need to *use* them (see "silent drift").
- **S9 `sheets.jsx`.** The finish: `finishWorkout` calls `hooks.finish`, `doFinishWorkout` calls
  `hooks.done` before `FinishSummary` opens, and the export line names three functions. Keep
  upstream's new finish steps and put each hook back at the same point; re-export a renamed function.
- **S36 `sheets.jsx` (`EquipmentProfileSheet`).** Four `hooks.gymSheet` calls: the ticks it opens
  with, `saved(p)` in both save branches, the chips and the note. Take upstream's sheet and wrap
  its new equivalents; a new save branch gets its own `saved(p)`.
- **S50 `sheets.jsx` (`ExConfig`, `exConfigSheet`) and `views/Workout.jsx`.** The `autosave`
  prop, the save-on-close effect, the Done button and `{ autosave: true }` in
  `openProgressionSettings`. If upstream changed how `ExConfig` saves, the effect calls the new save.
- **S58 `sheets.jsx` (`ExConfig`).** `exPart(part)` guards around categories of the sheet. Keep
  upstream's new rows; a row moved into another category takes that category's guard, and a new
  category stays unguarded until a decision says otherwise.
- **S40 `lib/session-start.js` (`planEntry`, under `buildPlannedEntry`).** A logic file: the
  `plain` lines that turn off the prescription and upstream's warm-ups and hand the rows to
  `hooks.plainRoutine.rows` (D69). Take upstream's code and put each `plain` check back on its new
  steps (Rule A); don't grow the seam.
- **S54 `views/Modules.jsx` (`ModulesPage`).** The `hooks` import, the fork's modules' copy and
  `setModule`, the `shown` list without the hidden modules, its count, and `hvRow` around each
  row. Keep upstream's page and re-apply each on its new names.
- **S2 `App.jsx`.** If upstream changed the tab-bar conditions (`noTabs`, `inWorkout`), keep
  upstream's conditions and swap only the component.
- **S6 `lib/update.js`.** If upstream rewrote the updater, re-introduce
  `import.meta.env.VITE_UPDATE_REPO || <upstream's repo constant>`.

## Rule B — undeclared edits

`git checkout --theirs <file>` throws the fork's edit away. Before doing that, save the
fork's version (`git show hevier/main:<path> > /tmp/ours`) and work out what it was for. Then
re-home it: a new file under `frontend/src/hevier/`, or a new seam (row in SEAMS.md, markers in
code). Mention it in the merge commit message.

## Logic files: extra care

`frontend/src/lib/**` (except `lib/update.js`, seam S6), `frontend/src/store/**`, `api/**`,
`mcp/**`: the fork does not edit these. A conflict here means a past fork commit broke
rule 2. Take upstream, and port the fork's need into `frontend/src/hevier/lib/` as a wrapper
with a test. The fork's own helpers in `hevier/lib/` call upstream helpers. If an upstream
helper's signature changed, adapt the wrapper and its test; never the upstream helper.

## Silent drift (no conflict, still broken)

A clean merge can still break the fork. After every sync, check these:

1. **Contract test**: `npx vitest run src/hevier/contract.test.js`. A failure means an export,
   prop or behaviour the overlay relies on changed. Fix the overlay.
2. **New workout-screen features**: `git log --oneline <old>..<new> -- frontend/src/views/Workout.jsx frontend/src/components/` and the CHANGELOG. Anything new that
   upstream's `list` layout renders (a chip, a sheet, a handler) and `HevyWorkout` doesn't is
   a decision for the user (see "Decide what a release brings"): added to the Hevy layout or
   skipped. List skipped items in the merge commit body.
3. **`build:mobile` changed?** `git diff <old>..<new> -- frontend/package.json | grep build:mobile`.
   If so, mirror it in `hevier/tools/emulator.sh`.
4. **CSS selectors/variables renamed?** `git diff <old>..<new> -- frontend/src/index.css | grep -E '^[-+](\.|:root|--)'`.
   Check that `hevier.css` still targets names that exist.
5. **New routes or tabs?** Compare `App.jsx` routes and `TabBar.jsx` with `HevyTabBar`'s
   entries. A new screen must be reachable from the three-tab navigation (usually Profile →
   Dashboard).
6. **Icons or the PWA manifest changed?** `git diff --stat <old>..<new> -- frontend/android/app/src/main/res frontend/public`.
   New or regenerated icons: rerun `python3 hevier/tools/recolour-icons.py`. A changed
   `frontend/public/manifest.json`: bring the change into `frontend/public/hevier/manifest.json`,
   whose `start_url` and `scope` are `../` and whose name is Hevier (`pwa-icons.test.js` checks
   both resolve the same).
7. **Android libraries changed?** The APK's Java dependencies are locked
   (`frontend/android/app/src/hevier/gradle.lockfile`, review G1), so an upstream merge that
   bumps Capacitor, a plugin or an AndroidX library fails the Android build with "dependency lock
   state" errors, though nothing conflicted. Write the lock again
   (`cd frontend/android && ./gradlew :app:dependencies --write-locks`), read its diff, run
   `hevier/tools/release-check.sh` (Trivy scans the lockfile) and commit it with the merge.
8. **A hidden Settings row renamed?** The fork hides upstream's Settings rows by their English
   title (`HIDDEN_ROWS` in `frontend/src/hevier/lib/settings.js`, D16). A test under
   `frontend/src/hevier` checks that every title there still exists on upstream's page, so when
   upstream renames a row it fails, naming the title. Rename the entry in `HIDDEN_ROWS` to match.

## Verification (required before landing)

1. `hevier/tools/verify.sh`: upstream's suite **and** `src/hevier/**`, all green, and the fork
   build; also the api, mcp, locale and fork Java checks when those files changed. A red
   upstream test means a seam or wrapper changed behaviour it shouldn't have. Fix the fork,
   never the test.
2. `HEADLESS=1 hevier/tools/emulator.sh`, then the smoke walk (cdp.mjs): start a routine, log
   two sets, minimise, resume, finish, see it in history, start it again, see each set open at
   what was done last time (D69). Screenshot each step into the scratchpad.
3. **The UX journeys** (`hevier/ux/JOURNEYS.md`, the `ux-review` skill): every journey again on
   the test profile, to see that each still finishes roughly as before and nothing broke with
   the release. Compare with the last rounds in `hevier/ux/LEDGER.md`.
4. Merge commit message: `hevier: merge upstream <TARGET>`, then a body listing conflicted
   files and how each was resolved (rule letter), any seam added, moved or removed, and any
   silent-drift items skipped.

## When to stop and ask the human

- A release brings a new feature or changes how something works (see "Decide what a release
  brings"). Always, every release.

- `main` won't fast-forward.
- A seam no longer has a hook point (Rule A, step 5).
- An upstream test fails and the cause is a fork seam whose purpose you can't keep without
  changing upstream logic.
- Resolution would add a new seam to a logic file (`lib/`, `store/`, `api/`).
- More than about 15 files conflict. Something structural happened upstream; summarise it
  first.
