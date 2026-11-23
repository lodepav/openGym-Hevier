# Whole-fork implement-review: brief for one area's run

You run ONE complete implement-review for ONE area of the Go Hevier fork. Follow
`~/.claude/skills/implement-review/SKILL.md` exactly (Read it first), with the adaptations below.
You are the orchestrator: you spawn the `reviewer` agent each round (a new spawn every round),
triage, get fixes made, run tests, keep the ledger and write the report.

## The work under review

- There is no new task to implement. The "change" is everything the fork added or edited for
  this area since it forked from upstream: the diff from `git merge-base HEAD main` to the
  area's branch tip.
- The area's files: `python3 hevier/review/areas.py <area>` (one path per line). The reviewer's
  diff command is exactly:
  `git diff $(git merge-base HEAD main) HEAD -- $(python3 hevier/review/areas.py <area>)`
  Most files are new, so the diff is the whole file. Tell the reviewer it may also Read any file
  in the repo for context (callers, upstream helpers), but findings must be in the area's files.
- Never feed media to a reviewer or yourself: no `res/` images, no `catalogue/media`.

## Set up

1. `git switch -c hevier/review-<area> hevier/main` in /home/pavel/IdeaProjects/openGym-Hevier
   (the main checkout; no worktree). Check `git status` is clean first; stop and report if not.
2. Intent: read hevier/DECISIONS-INDEX.md and pick the decisions that govern this area's files
   (grep the D numbers named in the files' comments). Write a 2-4 sentence intent from the
   owner's point of view, plus the list of D numbers. Read full DECISIONS.md rows only for those.
3. Baseline: run the area's own test files (`*.test.js(x)` / `*.test.mjs` / Java tests among the
   area's files) through the lock:
   `hevier/tools/heavy.sh bash -c 'cd frontend && npx vitest run <files>'`
   (Java: `cd frontend/android && ./gradlew :app:testHevierDebugUnitTest` or whatever verify.sh
   uses, then `./gradlew --stop`; `.mjs` tool tests with `node --test`). Record the counts.
4. Ledger file: `hevier/review/<area>.md`. Write it after every round, not only at the end.
   Seed it with these as already rejected (dismissed by the owner, never re-raise):
   - Hevy export toggle / double POST; note `\n` fix scope; old-Android location listener;
     the fourth one in `~/.claude/projects/-home-pavel-IdeaProjects-openGym-Hevier/memory/dismissed-review-findings.md`
     (Read that file for the exact wording).

## Non-goals (put them in every reviewer prompt)

- Progression-on paths: the fork always has progression off (D61, D69).
- Upstream's own logic (`frontend/src/lib/`, `frontend/src/store/`, `api/`) except the fork's
  marked `[hevier]` seam lines in it; upstream code outside a seam is not reviewed.
- Visual design and wording taste.

## Rules for fixes (the fork's, on top of the skill's)

- hevier/README.md "The four rules": fixes go in `frontend/src/hevier/` or `hevier/`; an upstream
  file only at an existing seam listed in hevier/SEAMS.md; upstream tests are never edited.
- A fix that changes what the owner sees or how a flow works is NOT made: it goes to
  "Needs your call" with one line. Only fixes with no visible change, or a plainly broken thing
  restored to what its decision says, go in.
- Each bug fix: test first, see it fail, fix, see it pass (say so in the ledger reason).
- A fix batch over about ten tool calls goes to one `implementer` agent with `model: opus`; read
  its diff before accepting it.
- Tests per round: the area's test files plus any test file beside code you changed, via heavy.sh.
- After 3 failed attempts at one fix, defer it with the reason.

## Finish

1. After round 4: run `hevier/tools/heavy.sh hevier/tools/verify.sh` (read verify.sh for its
   flags first; use the full mode it uses before a merge). Quote its result line.
2. Commit on `hevier/review-<area>` in small commits (one per fix or per round), subjects like
   `hevier: <what> (D<n>)`, ending with the attribution lines from your system reminder. The
   ledger file is committed too. Do NOT merge, do NOT push.
3. `git switch hevier/main` and leave the tree clean. Run `cd frontend/android && ./gradlew --stop`
   if gradle ran. Stop any emulator you booted (you should not need one).
4. Report back, short: the skill's final report sections (Result, Ledger as a compact table,
   Deferred, Round 4 net, Needs your call, Not checked), the branch name, commit list
   (`git log --oneline hevier/main..hevier/review-<area>`), and the verify result line.

If a `[heavy-usage]` WIND DOWN line appears: finish the current round's triage, commit, write the
ledger with where to resume, switch back to hevier/main and report.
