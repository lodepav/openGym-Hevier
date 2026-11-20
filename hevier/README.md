# openGym-Hevier — fork notes

This repository is a fork of [openGym](https://github.com/DuarteSantos8/openGym) that gives the
Android app a UX of its own in OpenBite's look (D123, D125): the owner's logbook. It started as
a [Hevy](https://www.hevy.com/)-like experience and is built on openGym's training logic (1RM,
recovery, sync, storage), and it stays easy to update from upstream.

Everything that belongs only to the fork lives in this `hevier/` folder or in
`frontend/src/hevier/`, plus a few fork-owned `hevier` folders inside upstream's tree that only
the build reads (`frontend/android/app/src/hevier*`, `frontend/public/hevier`). Upstream never
touches any of them, so they never conflict.

| File | What it is |
|---|---|
| [DECISIONS.md](DECISIONS.md) | The agreed design decisions, numbered D1, D2, … (take the next free number for a new one). They override RULES.md and the spec where they differ. |
| [DECISIONS-INDEX.md](DECISIONS-INDEX.md) | One line per decision, loaded into every Claude Code session in place of DECISIONS.md. Regenerate it with `tools/decision-index.sh > DECISIONS-INDEX.md` after adding or rewording a decision. |
| [FEATURES.md](FEATURES.md) | Every feature the fork adds, with its decision, each marked Fork (stays in the fork), Offer (could go upstream), Offered (already sent upstream) or Ported (until upstream's release replaces it). |
| [RULES.md](RULES.md) | How the fork is built and kept mergeable: scope, branches, the build flag, the test rig, the rules every change follows, and the risks. The finished implementation plan is in git history. |
| [CONFLICTS.md](CONFLICTS.md) | How to merge upstream and resolve conflicts, written for AI agents (and people). |
| [reference/SCREENS.md](reference/SCREENS.md) | The UX spec: every Hevy screen, element by element, mapped to what openGym already has. `reference/fetch.sh` downloads the screenshots it cites. |
| [PIPELINE.md](PIPELINE.md) | What upstream's unreleased `release-*` branches already bring and its milestones plan, and what it means for the fork. Check it before starting a milestone. |
| [archive/](archive/) | Older notes moved out of PIPELINE.md as written: what is merged ([PIPELINE-merged.md](archive/PIPELINE-merged.md)) and the dated log and snapshots up to 2026-11-06 ([PIPELINE-2026-11.md](archive/PIPELINE-2026-11.md)). Read, not kept current. |
| [SEAMS.md](SEAMS.md) | The list of every place the fork edits an upstream file. Keep it current: it is what makes conflicts predictable. |
| [tools/emulator.sh](tools/emulator.sh) | Builds the debug APK, boots the Android 16 emulator, installs and launches it. |
| [tools/cdp.mjs](tools/cdp.mjs) | Drives the app's WebView over the Chrome DevTools Protocol: click, read text, screenshot. |
| [tools/fake-strap/](tools/fake-strap/) | A pretend Bluetooth heart-rate strap for a second emulator, to test D79 without a real strap (RULES.md, "Test rig"). |
| [tools/screens.mjs](tools/screens.mjs) | Checks every main screen on phones of different sizes and ratios (the emulator resized, not extra AVDs): screenshots plus a layout report. |
| [tools/routine-snapshot.mjs](tools/routine-snapshot.mjs) | Starts every routine on the emulator, saves what each opens with (brands, cable setups, per side, sets, warm-ups, settings) and prints the differences from an earlier snapshot. Run before and after an upstream merge, or before a release. `frontend/src/hevier/lib/routine-open.test.js` checks the same on a fixture profile in every test run. |
| [tools/routine-check.sh](tools/routine-check.sh) | The same on the emulator in one command: restores the test profile, runs `routine-snapshot.mjs` and compares with the baseline kept on this machine (`--accept` keeps a meant change, `--build` builds this checkout first). The release script runs it before anything is built. |
| [tools/upstream-status.mjs](tools/upstream-status.mjs) | Prints every PR and issue the fork opened upstream: state, milestone, base branch, and which upstream branch already carries it (`--open`, `--json`); then the merged branches and finished worktrees that could be deleted. It prints only. Run `git fetch upstream` first. |
| [tools/release-notes.mjs](tools/release-notes.mjs) | Numbers the next Go Hevier release and writes its notes from the merges since the last one (D52); the release script uses it, and [CHANGELOG.md](CHANGELOG.md) collects them. |
| [tools/release-check.sh](tools/release-check.sh) | The security gates for a release build (D26): secrets, vulnerable dependencies, supply chain, and with `--apk` the APK's certificate and signature scheme, debuggable flag, permissions, native libraries and exported components (D38). The gates run in parallel, the release tools' own tests among them. Scanners from `tools/install-scanners.sh`, allow-lists in [security/](security/). |
| [tools/verify.sh](tools/verify.sh) | The check that guards `hevier/main`: conflict markers, the seams, the decision index, the suites and the fork's build, and the api, mcp, locale and Java checks for what changed. The `verify` skill, the pre-push hook and the release run it. |
| [tools/heavy.sh](tools/heavy.sh) | Runs a build or a whole suite while no other one runs, here or in OpenBite, which shares the lock: two at once beside the emulator run this machine out of memory. |
| [tools/install-hooks.sh](tools/install-hooks.sh) | Run once per clone: points git at [hooks/](hooks/) (pre-push runs `verify.sh`, commit-msg checks merge subjects). |
| [tools/seam_check.py](tools/seam_check.py) | Checks SEAMS.md against the `[hevier]` markers in the code; `verify.sh` runs it. |
| [upstream/](upstream/) | Notes on what the fork offered upstream and what became of it. |
| [../PRODUCT.md](../PRODUCT.md) | The product record the `impeccable` design skill reads at the repo root: who Go Hevier is for, what it must keep, and where the decisions are. It points here, it does not repeat the decisions. |
| [../DESIGN.md](../DESIGN.md) | The fork's look as it ships, for the same skill: the tokens of `theme.css`, type, shapes, the main components and the do's and don'ts. `.impeccable/design.json` beside it holds what the format cannot (shadows, motion, component snippets). Re-run `/impeccable document` after the look changes; a decision still wins over it. |
| [ux/](ux/) | The UX review: [STANDARDS.md](ux/STANDARDS.md) (the rules a finding cites, A · P · H · G · C, after WCAG 2.2, Android and NN/g; the decisions come first), [JOURNEYS.md](ux/JOURNEYS.md) (seven people walked through the app, the test profile, the device snapshot) and [LEDGER.md](ux/LEDGER.md) (each round's findings and what became of them), and [REWORK.md](ux/REWORK.md) (the rework of flows and pages past Hevy's UX: north star, friction list, each screen's status). |
| [agents/](agents/) | Claude Code agents: `ux-reviewer`, a fresh-context reviewer that walks the journeys on the emulator and cites the standards. Link them in once per clone: `ln -s ../hevier/agents .claude/agents`. |
| [skills/](skills/) | Claude Code skills for this fork: `verify`, `seam-check`, `upstream-merge`, `emulator-check`, `before-after` (scores a screen against the one it replaces), `release-check`, `ux-review` (runs the reviewer, fixes only minor findings, brings the rest to the user), `ux-rework` (D125: a mockup of every screen in three versions, scored against the old screen, then one build; only on /ux-rework). Upstream ignores `.claude/`, so link them in once per clone: `ln -s ../hevier/skills .claude/skills`. |

## Where code goes

- `frontend/src/hevier/lib/x.js` is pure: it decides, and `x.test.js` beside it proves it.
  `x-run.js` (or an `init*` export) is the wiring around it: timers, listeners, the store.
- Every `init*` helper takes the same store object (`storeAdapter` in `lib/store-watch.js`), and
  `index.js` installs them all in one `install()`, grouped by area.
- `components/` and `views/` draw; a rule they need is a helper in `lib/`.

## The four rules

1. **Add, don't edit.** New behaviour goes in new files under `frontend/src/hevier/`. An upstream
   file is edited only at a *seam*: a short, marked hook listed in [SEAMS.md](SEAMS.md).
2. **Upstream's logic files stay as they are.** `frontend/src/lib/`, `frontend/src/store/` and
   `api/` are reused unedited. A behaviour that needs different logic (D125 allows it, with a
   decision) gets a *new* pure helper in
   `frontend/src/hevier/lib/` with a test beside it, wrapping upstream's helper rather than
   changing it.
3. **Upstream's tests stay green, unmodified.** They are the proof that the logic was not
   changed. The fork's UI is behind a build flag (`VITE_HEVIER=1`), so the upstream suite still
   tests the upstream UI.
4. **Merge upstream, never rebase.** `main` mirrors upstream; `hevier/main` merges it. See
   [CONFLICTS.md](CONFLICTS.md).
