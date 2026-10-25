---
name: ux-review
description: Run user journeys through Go Hevier on the emulator with the fresh-context ux-reviewer agent against hevier/ux/STANDARDS.md, triage its findings, fix only the minor ones, and bring anything noticeable to the user. Use for /ux-review, or when asked for a UX review or journey run.
argument-hint: "[journeys, default J1 J2] [rounds, default 1]"
disable-model-invocation: true
---

# UX review loop

Adapted from the OpenNutriTracker fork's `/ux-review`. The reviewer is the `ux-reviewer` agent
(`hevier/agents/ux-reviewer.md`, linked as `.claude/agents`). If that agent type is not loaded,
spawn a general-purpose agent and tell it to follow that file. It starts with a clean context
every round, and that independence is the value: never pass it your opinion of the screens or the
reasons behind them. Pass only what "Reviewer prompt" lists.

**The user is happy with how the app works.** Fix only findings whose fix is **minor** (see
`hevier/ux/STANDARDS.md`). Anything the user would notice is brought to them, never built on
your own judgement.

## 0. Set up

1. Nothing else heavy runs: no Gradle, test suite or second emulator (the machine has run out of
   memory). Boot and install: `HEADLESS=1 hevier/tools/emulator.sh`, in the background.
2. Take the snapshot ("Before and after a round" in `hevier/ux/JOURNEYS.md`). Set up the test
   profile if the snapshot lacks it.
3. Read `hevier/ux/LEDGER.md`.

## 1. Rounds (default 1; each round is two journeys, about 25 minutes)

1. **Spawn** the reviewer with the prompt below. Do not touch the emulator while it runs.
2. **Triage** every finding that was not withdrawn, after looking at its screenshot and the code:
   - **accept**, when its fix is minor;
   - **discuss**, when its fix is noticeable or it touches a decision;
   - **reject**, when it is wrong, a decision covers it, or the fix costs more than it gives;
     say which;
   - **defer**, when it is upstream's to fix or out of scope.

   Lows are rejected or deferred unless the fix is small and clearly helps. Triage the
   improvements the same way.
3. **Fix** the accepted findings on a branch (`hevier/ux-<topic>`), with the smallest change, in
   fork files or at seams (`seam-check`). Run `verify`'s fork tests and build. Only after the
   reviewer has finished, reinstall (`--no-build` is not enough after a fix) and check each fix
   on screen yourself.
4. **Restore** the snapshot.
5. **Write** the round into `hevier/ux/LEDGER.md`.

### Reviewer prompt

```
Round N of M. Follow hevier/agents/ux-reviewer.md.
Screenshots: <scratchpad>/ux/roundN
Journeys: <ids from hevier/ux/JOURNEYS.md, or a focus>
Ledger (do not re-raise rejected or deferred items without new evidence;
check that fixed ones are fixed on screen):
<ledger rows>
```

## 2. Report

Do not commit or merge unless asked. End with:

- the rounds and journeys run, and whether each person finished;
- the fixes made, with their branch;
- **a list for the user to decide**: each "discuss" finding with its screenshot, the rule, what
  would change on screen, and the decision it touches, if any;
- the deferred list, and any high where you and the reviewer disagreed.

## Guardrails

- At most one reviewer spawn at a time: they share the emulator.
- If a round mostly raises new lows or rephrases rejected findings, that is the noise floor.
  Say so and stop.
- If a `[heavy-usage]` WIND DOWN line appears, stop after the current triage, restore the
  snapshot and report.
