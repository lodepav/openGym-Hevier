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
   is (`emulator-check` skill) and restore the test profile (`hevier/ux/JOURNEYS.md`, "The test
   profile"). On `#/workout`, start each routine in turn (its **Start Routine** button), save what
   it opens with to `<scratchpad>/routines-before.json`, then **Discard Workout** and confirm.
   Read it from the stored session, not the screen:
   `node hevier/tools/cdp.mjs eval "JSON.stringify(JSON.parse(localStorage.gym_state_v1))"`.
   Keep per routine its name and `hvProg`, and per exercise of `S.active.entries`:
   - `id`, `target.side`, `target.dbLoad`, and `S.hvSideOrder[id]` (absent means left first);
   - the brand shown: `hvBrand` if it is a string, else `S.hvMachines[id][gym]`; the cable setup:
     `hvCable`, else `S.hvCables[id][gym]`, else 1:1. `gym` is `S.active.hvGym` if it is a string,
     else `S.activeEquipId` (`workoutGym` in `frontend/src/hevier/lib/gym-labels.js`);
   - each set: warm-up or work (`phase: 'warmup'` or `warmup: true`), `w`, `r`, `sec`, `sides`,
     `hvLast`, `edited`.
   Keep the top-level settings too: `S.modules`, `S.activeEquipId`, `S.warmupAuto` and every
   `hv…` field of `S` (`hvModuleParts` among them).
   Then the warm-ups: in a routine with progression off whose exercise opens with a warm-up from
   last time, and in one with it on that opens with an automatic warm-up, type a new weight into
   the first work set and note the warm-ups after it (off: unchanged, D69; on: they follow). A
   warm-up made by hand in the session is marked `edited` and never moves, so it shows nothing: if
   the profile has no such exercises, say so in the notes instead of making one.
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
   **Compare with before the merge:** repeat step 3a on the merged build with the same profile,
   into `routines-after.json`, and diff the two. Any difference (a brand or per-side setting gone,
   a set opening at other numbers, a warm-up that moves, a setting or module part reset) is a
   regression unless a decision of step 3 explains it: show the user the diff, never land over it.
   Then every UX journey (`ux-review` skill, all of JOURNEYS.md), compared with the ledger's last
   rounds: each should finish roughly as before. Then the `release-check` skill (D26): upstream's new or bumped npm packages and new
   endpoints fail its gates until they are reviewed, and the accepted baseline is committed
   with the merge. Anything drift turns up that the user would see is a decision too: ask.
8. **Land.** Commit message body: the conflicted files with the rule used for each, seams
   added, moved or removed, and drift items skipped. `git checkout hevier/main && git merge
   --ff-only sync/$TARGET`. Push only
   when the user asks. Never force-push a `hevier/*` branch, never commit to `main`.
