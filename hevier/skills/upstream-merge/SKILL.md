---
name: upstream-merge
description: Merge a new upstream openGym release into the fork (hevier/main), resolve conflicts by the fork's rules, and check for silent drift. Use when asked to sync, update from upstream or merge a tag.
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
3a. **Note how every routine opens, before the merge.** Build and install `hevier/main` as it
   is (`emulator-check` skill), restore the test profile (`hevier/ux/JOURNEYS.md`, "The test
   profile"), then `node hevier/tools/routine-snapshot.mjs <scratchpad>/routines-before.json`.
   It starts every routine, saves what each opens with (gym, brands, cable setups, per side, side
   order, every set, the settings and fork fields), types a new weight into a first work set to
   see what the warm-ups do, and discards. Its last lines must show a warm-up probe for a routine
   with progression off (warm-ups unchanged, D69) and one with it on (they follow); "saw nothing"
   means the profile lost its warm-up routines: fix the profile first.
4. **Merge on a throwaway branch.** `git checkout -b sync/$TARGET hevier/main`, then
   `git merge --no-ff $TARGET -m "hevier: merge upstream $TARGET"`.
5. **Resolve.** Classify each file with `git diff --name-only --diff-filter=U` and apply
   rule A (rebuild the seam on theirs), B (undeclared edit: take theirs, re-home it),
   C (locales: take theirs) or D (package files: take theirs). Never restore the old upstream
   code.
6. **Silent drift.** Even after a clean merge, work through every item of CONFLICTS.md's
   "Silent drift" list (eight checks), in order. Also diff the screens the fork copies or
   wraps: `git diff <old>..$TARGET -- frontend/src/views/Home.jsx frontend/src/views/Settings.jsx frontend/src/sheets.jsx
   frontend/src/components/ExerciseBlock*` and list what the fork's screens should pick up.
7. **Verify.** Run the `verify` skill at its "before a merge" level, then the `seam-check`
   skill, then the `emulator-check` skill with the smoke walk: start a routine, log two sets,
   minimise, resume, finish, see it in history, start it again, see each set open at what was done last time (D69).
   **Compare with before the merge:** restore the test profile again on the merged build and run
   `node hevier/tools/routine-snapshot.mjs <scratchpad>/routines-after.json --diff <scratchpad>/routines-before.json`.
   Any line it prints (a brand or per-side setting gone, a set opening at other numbers, a
   warm-up that moves, a setting or module part reset) is a regression unless a decision of
   step 3 explains it: show the user the lines, never land over them. `routine-open.test.js`
   (in `verify`) checks the same on a fixture profile; a failure there after a merge is the same
   question, and its snapshot is rewritten only for a change a decision explains.
   D128: check that upstream's start, start-from-last included (seam S40), still runs before the fork lays a routine's plan over it (`hevier/lib/next-plan.js` builds through `buildCombinedEntries`; `RoutinePreview.test.jsx` starts a planned routine for real and compares it with the page).
   Once the merge has landed, `hevier/tools/routine-check.sh --accept` keeps the merged build's
   snapshot as the baseline the next release is checked against.
   Then every UX journey (`ux-review` skill, all of JOURNEYS.md), compared with the ledger's last
   rounds: each should finish roughly as before. Then the `release-check` skill (D26): upstream's new or bumped npm packages and new
   endpoints fail its gates until they are reviewed, and the accepted baseline is committed
   with the merge. Anything drift turns up that the user would see is a decision too: ask.
8. **Land.** Commit message body: the conflicted files with the rule used for each, seams
   added, moved or removed, and drift items skipped. `git checkout hevier/main && git merge
   --ff-only sync/$TARGET`. Push only
   when the user asks. Never force-push a `hevier/*` branch, never commit to `main`.
