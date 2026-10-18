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

# 4. Merge on a throwaway branch, so a bad resolution never lands on the trunk
git checkout -b sync/$TARGET hevier/main
git merge --no-ff $TARGET -m "hevier: merge upstream $TARGET"
#    rerere re-applies resolutions it has seen before; check them anyway (git diff)

# 5. Resolve (rules below), then
cd frontend && npm ci && npm test && npm run build && node scripts/check-locales.mjs && cd ..
cd api && npm ci && npm test && cd ..

# 6. Device check (see "Verification")
hevier/tools/emulator.sh

# 7. Land it
git checkout hevier/main && git merge --ff-only sync/$TARGET && git branch -d sync/$TARGET
# then bring the active phase branch up to date:
git checkout hevier/ux && git merge hevier/main
```

Never `git push --force` a `hevier/*` branch, and never commit to `main`.

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

- **S3/S4 `views/Workout.jsx`.** The file upstream changes most often after `sheets.jsx`.
  The fork only adds `'hevy'` to the layout list, one render branch, and header/footer
  branches. If upstream added new props to `blockProps` or `ExerciseBlock`, the merge is clean
  but `HevyWorkout` may need to *use* them (see "silent drift").
- **S5 `sheets.jsx`.** Only the default layout at session creation. If `beginWorkout` was
  split or renamed, follow `S.workoutView` to where `s.active.workoutView` is now
  snapshotted.
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
   either added to the Hevy layout or consciously skipped. List skipped items in the merge
   commit body.
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
7. **Exercise detail tags changed?** `git diff <old>..<new> -- frontend/src/lib/exercises.js | grep -n detailTags`.
   The fork's exercise details (`hevier/views/ExerciseDetails.jsx`, `ExerciseFacts`) sorts
   upstream's `detailTags` into Primary, Secondary and Equipment by their **icon names**
   (`figureStrength`, `kettlebell`), so a renamed icon empties those lines without any test
   failing (review 2026-10-18, item 2.2). Open an exercise's details on the emulator and check
   the three lines; when that code is next touched, read the exercise's own muscles and
   equipment instead.

## Verification (required before landing)

1. `cd frontend && npm test`: upstream's suite **and** `src/hevier/**`, all green. A red
   upstream test means a seam or wrapper changed behaviour it shouldn't have. Fix the fork,
   never the test.
2. `npm run build` and `node scripts/check-locales.mjs`.
3. `hevier/tools/emulator.sh`, then the smoke walk (cdp.mjs): start a routine, log two sets,
   minimise, resume, finish, open history, start the same routine and see progressed
   weights. Screenshot each step into the scratchpad and compare with
   `hevier/reference/*/after-*.png`.
4. Merge commit message: `hevier: merge upstream <TARGET>`, then a body listing conflicted
   files and how each was resolved (rule letter), any seam added, moved or removed, and any
   silent-drift items skipped.

## When to stop and ask the human

- `main` won't fast-forward.
- A seam no longer has a hook point (Rule A, step 5).
- An upstream test fails and the cause is a fork seam whose purpose you can't keep without
  changing upstream logic.
- Resolution would add a new seam to a logic file (`lib/`, `store/`, `api/`).
- More than about 15 files conflict. Something structural happened upstream; summarise it
  first.
