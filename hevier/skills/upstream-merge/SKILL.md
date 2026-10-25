---
name: upstream-merge
description: Merge a new upstream openGym release into the fork (hevier/main, then hevier/ux), resolve conflicts by the fork's rules, and check for silent drift. Use when asked to sync, update from upstream or merge a tag.
---

# Upstream merge

`hevier/CONFLICTS.md` is the authority. Read it in full first, along with `hevier/SEAMS.md`.
Below is the procedure as a checklist. Stop and ask at any "stop" point in CONFLICTS.md.

1. **Prepare.** `git status --short` is empty. `git fetch upstream --tags`.
   `git checkout main && git merge --ff-only upstream/main` (if that fails: stop, ask).
2. **Target.** Newest tag: `git tag --list 'v*' --sort=-v:refname | head -3`. Tell the user
   the target and how many commits it brings (`git log --oneline hevier/main..$TARGET | wc -l`).
   **Whether to merge at all** (CONFLICTS.md): weigh the seams it removes against the bloat and
   trouble it adds, recommend, and let the user decide. No merge without a yes.
3. **Read first.** The CHANGELOG between the versions, and `git diff --stat
   hevier/main...$TARGET` for the seam files (`git grep -l '\[hevier\]'`).
   **Decide with the user.** List the release's new features and behaviour changes, sort out
   the ones that need a decision and ask the user about each, with options and a
   recommendation (CONFLICTS.md, "Decide what a release brings"). Record each answer in
   DECISIONS.md. Never decide one yourself; an open item keeps the merge off `hevier/main`.
4. **Merge on a throwaway branch.** `git checkout -b sync/$TARGET hevier/main`, then
   `git merge --no-ff $TARGET -m "hevier: merge upstream $TARGET"`.
5. **Resolve.** Classify each file with `git diff --name-only --diff-filter=U` and apply
   rule A (rebuild the seam on theirs), B (undeclared edit: take theirs, re-home it),
   C (locales: take theirs) or D (package files: take theirs). Never restore the old upstream
   code.
6. **Silent drift.** Even after a clean merge, work through CONFLICTS.md's five checks:
   - `npx vitest run src/hevier/contract.test.js`
   - new Workout.jsx/components features missing from `HevyWorkout`
   - `build:mobile` changes, to mirror in `hevier/tools/emulator.sh`
   - renamed CSS selectors and variables that `hevier.css` uses
   - new routes or tabs
   Also diff the screens the fork copies or wraps: `git diff <old>..$TARGET --
   frontend/src/views/Home.jsx frontend/src/views/Settings.jsx frontend/src/sheets.jsx
   frontend/src/components/ExerciseBlock*` and list what the fork's screens should pick up.
7. **Verify.** Run the `verify` skill at its "before a merge" level, then the `seam-check`
   skill, then the `emulator-check` skill with the smoke walk: start a routine, log two sets,
   minimise, resume, finish, see it in history, start it again, see the progressed weights.
   Then every UX journey (`ux-review` skill, all of JOURNEYS.md), compared with the ledger's last
   rounds: each should finish roughly as before. Then the `release-check` skill (D26): upstream's new or bumped npm packages and new
   endpoints fail its gates until they are reviewed, and the accepted baseline is committed
   with the merge. Anything drift turns up that the user would see is a decision too: ask.
8. **Land.** Commit message body: the conflicted files with the rule used for each, seams
   added, moved or removed, and drift items skipped. `git checkout hevier/main && git merge
   --ff-only sync/$TARGET`, then `git checkout hevier/ux && git merge hevier/main`. Push only
   when the user asks. Never force-push a `hevier/*` branch, never commit to `main`.
