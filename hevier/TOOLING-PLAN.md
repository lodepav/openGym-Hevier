# Tooling plan: cost, speed and delegation (2026-11-22)

From the history review of both forks (967 transcripts, Oct 22 to Nov 21; scripts in the
2026-11-21 session scratchpad `hist/`, rerun them to get new numbers). Each item: what to build, how to
test it, what to measure and what counts as success. Baselines are from that history.
OpenBite parts are marked (OB); global ones change `~/.claude`.

Rule for every item that changes a skill, agent or CLAUDE.md: dry-run it with a fresh
subagent on a copy of the file (Sonnet, see 12) before calling it done.

## Measurement harness (build first)

`hevier/tools/usage-report.py` (copy for OB): the history scripts made reusable. For a
session id or a date range it prints main vs subagent cache reads, output tokens, tool calls,
cross-session messages, compactions and "what's left / is it hanging" questions.
- Test: rerun on Oct 22 to Nov 21 and get the review's numbers (main cache reads 11.25 B,
  subagents 7.1 B, 924 SendMessage calls, 189 compactions).
- Every item below is measured with it: one week before, one week after.

## Phase 0: cheap, no risk

Done 2026-11-22: harness (reproduces the review within 1 %), 8, the node half of 3, and 9b as
a hook. Found while measuring:
- 3: the PATH prefix is on 5,987 main-chat calls, not 1,000. Node is already on PATH; flutter and
  adb are not. Adding them to `~/.profile` needs the owner's OK (the edit was blocked).
- 9b: exit 144 is not a hang. `pkill -f "x"` matches its own shell and kills it (reproduced).
  `~/.claude/hooks/pkill-self.py` (PreToolUse) denies it and says to write `"[x]..."`.
- 9a dropped: 18 status questions a month, too few for a skill change.
- verify fails on clean hevier/main: `sibling_check` sees `-gpu host` here and none in
  OpenBite's launcher, which boots through `emu` since 2026-11-21. Blocks every push.

| # | Build | Test | Measure, success |
|---|---|---|---|
| 3 | Absolute PATH (node, flutter, platform-tools) in `~/.claude/settings.json` `env` | `node -v`, `flutter --version`, `adb version` in a fresh session without exports | Calls with `export PATH=` drop from >1,000/month to near 0; no "command not found" |
| 9b | Default timeouts in `cdp.mjs`, `screens.mjs` (OB: `ux-drive.sh`) with a clear error | Unit test: a hung eval exits with the timeout message | Exit-144 kills (25 in the history) go to 0 |
| 9a | `progress.md` convention for long runs (skill text in implement, ux-review, critique loop) | Dry-run; one real long run writes it | "what's left / is it hanging" questions per week, baseline about 6 |
| 8 | `verify.sh` doc check: every D has a FEATURES row, every Offered row has a PR that exists (OB: same in its verify) | Test with a fixture that misses a row and one with a dead PR number | "docs up to date?" asks, baseline about 12/month; verify stays under +2 s |

## Phase 1: main chat lean (biggest lever)

| # | Build | Test | Measure, success |
|---|---|---|---|
| 1 | Global CLAUDE.md trigger: more than about 5 searches or reads, or a multi-file edit, goes to a subagent | Dry-run on two real past tasks (e.g. 323584d1 audit fixes, 5bc5eb64 upstream PRs) | Main-thread cache reads per shipped task down 40 % or more; Python edits in main, baseline 2,900/month, down by half |
| 2 | Resume note + `/clear` after each shipped task; screenshots read only inside agents | Dry-run of the rule; check one critique round keeps images out of main | Compactions, baseline 189/month, down by half; main context per call (cache read / calls) down |

## Phase 2: script plus skill

| # | Build | Test | Measure, success |
|---|---|---|---|
| 5 | Emulator lock: `emu up` waits for a free AVD; `heavy.sh` / `test-slot` queue; stale-lock timeout. Drop the "message before boot or stop" rule | Two sessions boot at once: the second waits, no overlap; kill a holder and the lock frees after the timeout | Cross-session messages, baseline 924 sent / 1,165 received, down 80 %; no build+emulator memory crash |
| 4 | Critique/audit round runner: capture script on the three light emulators, `scores.tsv` per page and round, skill with stop rule (36/40, gain < 1, or a drop) | Run on 3 pages for 2 rounds; table shows both rounds; a page at 36 is skipped | Time per round vs today's runs; "run again / choices / scores?" messages, baseline about 40 in 5 days |
| 7 | CodeRabbit wait: `gh api` loop under Monitor, wakes only on a new review (check pr-triage first) | On an open PR: no model turns while waiting, wakes within 2 min of a review | Model turns while waiting on a PR go to 0 |
| 6 | Upstream offers: one script joining SEAMS, FEATURES, upstream branches and PRs (Hevier `upstream-status.mjs`, OB `upstream_status.py`); skill drafts posts, posts after OK | Its list matches a hand check of 5 seams and 5 features | "what can we offer upstream" answered in one run instead of about 25 asks |

Phase 1 item 1 done 2026-11-22: a "Main chat" section in ~/.claude/CLAUDE.md (backup
CLAUDE.md.bak-mainchat), dry-run by a fresh agent and fixed. Measure it with usage-report.py
(main context per turn, 165,741 before) after a week. Item 7 dropped: pr-triage already waits
through Monitor. Next: item 5 (emulator lock), 4 (critique round runner), 6, 12.

Item 4 done 2026-11-22 as `tools/critique-rounds.mjs`: impeccable already saves every score
(109 reports here, 59 in OpenBite), so no scores.tsv, and `screens.mjs --screens` already
captures. Over the 87 rounds before 2026-11-21 the stop rule would have skipped 30 (34 %). The
2026-11-21 round (a fresh critic) scored every page 4 to 9 points lower: scores from a critic
that saw the page before creep up, so a drop between critics is not a regression.

Item 5 done 2026-11-22: `emu up` waits (EMU_WAIT, default 1800 s) for a free light AVD and the
memory, letting the boot lock go while it waits; tested with a fake adb (gives up after the
wait; boots once one frees). The flock already frees when a holder dies, so no stale timeout.
530 of 942 cross-session messages were emulator handoffs. The "message before boot or stop"
rule stays until the owner says otherwise: it also carries "the other session has priority".

Item 6 done 2026-11-22 as `tools/seam-offers.mjs` beside `upstream-status.mjs`: 12 of 54 seams
go once upstream takes what was offered (5 of them D124's), none is waiting on an offer not yet
sent (the two Offer rows, D19 and D51, name no seam). Hand check of D124, D89, D48, D63 and D17
matched. A seam that names a decision only in passing can read as going too early.

## Phase 3: cheaper models, only with proof

14 run 2026-11-22 (`.claude/hillclimb/reviewer/sonnet-2026-11-22/results.md`): Sonnet found 4 of
15 known bugs (5 leniently) against Opus's 10 of 15, in 30 to 70 s and under 10 tool calls a case.
Reviews stay on Opus. Simplify rounds were not measured.

| # | Build | Test | Measure, success |
|---|---|---|---|
| 12 | Sonnet default for read-only lookups, web research, doc drafts (Opus reads the diff) and skill dry-runs | 5 past lookups answered by Sonnet vs the recorded answer | Same facts in 5 of 5; else keep Opus for that kind |
| 14 | Reviewer eval with Sonnet: the 8 cases in `.claude/hillclimb/reviewer` | One Sonnet run per case, scored like the Opus and Fable runs | Within 2 known bugs of Opus (10/15) on simplify-style findings. Only then ask the owner about moving the 48 simplify rounds; full bug reviews stay Opus |
| 16 | Rounds per change: count confirmed findings per review round from the reports | Script over the review reports and LEDGER.md | If round 3+ rarely finds a confirmed medium or high, propose "two rounds unless round 2 finds a high" |

16 measured 2026-11-22 over 165 reviewer runs (standing findings in each report's summary line):
round 1: 22 high, 120 medium in 48 runs; round 2: 3 high, 65 medium in 45; round 3: 0 high, 43
medium in 35; round 4: 0 high, 3 medium in 37. Round 4 is implement-review's simplify round, so
its low bug count is by design, and the skill already skips the remaining full rounds after a
clean one. The full rounds keep finding mediums (71 % of round-3 runs), so no change: rounds stay.

13 (Haiku as the model under test in OB's AI evals) and 15 (implementers, bug reviews, UX
judgement, CodeRabbit triage, Fable merges stay as they are) need nothing.

12 run 2026-11-22 on the four "Scope D… port to upstream" lookups of 2026-11-18 (the fifth's inputs
were gone), fork pinned at 5eed1a414, graded by a fresh Opus agent
(`.claude/hillclimb/reviewer/sonnet-2026-11-22/lookups-grade.md`): Sonnet led to the same decision
on 2 of 4 (D120, D70). On D35 it called upstream's open #990 unrelated and kept a set count upstream
refuses; on D53 it chose a set field without the copy rule it needs. Below 4 of 4 (the bar was
5 of 5), so upstream scoping stays on Opus. Plain lookups (find a file, list callers) were not
tested: none were in the recent history.

## Owner decision

- 10: standing permission to commit, merge into the fork main and push once checks pass;
  release only on ask. Baseline about 110 "push / merge and push" messages a month.
- 14: whether any reviewer moves off Opus, after its eval.

## Order

Harness, then phase 0, then 5 and 1 together (both cut main-chat cost), then 4, 7, 6,
then phase 3. Measure each a week after it lands with the harness.
