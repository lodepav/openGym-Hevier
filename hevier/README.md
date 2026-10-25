# openGym-Hevier — fork notes

This repository is a fork of [openGym](https://github.com/DuarteSantos8/openGym) that gives the
Android app a [Hevy](https://www.hevy.com/)-like user experience and look, while keeping
openGym's training logic (progression, 1RM, recovery, sync, storage) and staying easy to update
from upstream.

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
| [SEAMS.md](SEAMS.md) | The list of every place the fork edits an upstream file. Keep it current: it is what makes conflicts predictable. |
| [tools/emulator.sh](tools/emulator.sh) | Builds the debug APK, boots the Android 16 emulator, installs and launches it. |
| [tools/cdp.mjs](tools/cdp.mjs) | Drives the app's WebView over the Chrome DevTools Protocol: click, read text, screenshot. |
| [tools/fake-strap/](tools/fake-strap/) | A pretend Bluetooth heart-rate strap for a second emulator, to test D79 without a real strap (RULES.md, "Test rig"). |
| [tools/screens.mjs](tools/screens.mjs) | Checks every main screen on phones of different sizes and ratios (the emulator resized, not extra AVDs): screenshots plus a layout report. |
| [tools/release-notes.mjs](tools/release-notes.mjs) | Numbers the next Go Hevier release and writes its notes from the merges since the last one (D52); the release script uses it, and [CHANGELOG.md](CHANGELOG.md) collects them. |
| [tools/release-check.sh](tools/release-check.sh) | The security gates for a release build (D26): secrets, vulnerable dependencies, supply chain, and with `--apk` the APK's certificate and signature scheme, debuggable flag, permissions, native libraries and exported components (D38). The gates run in parallel, the release tools' own tests among them. Scanners from `tools/install-scanners.sh`, allow-lists in [security/](security/). |
| [ux/](ux/) | The UX review: [STANDARDS.md](ux/STANDARDS.md) (the rules a finding cites, A · P · H · G · C, after WCAG 2.2, Android and NN/g; the decisions come first), [JOURNEYS.md](ux/JOURNEYS.md) (seven people walked through the app, the test profile, the device snapshot) and [LEDGER.md](ux/LEDGER.md) (each round's findings and what became of them). |
| [agents/](agents/) | Claude Code agents: `ux-reviewer`, a fresh-context reviewer that walks the journeys on the emulator and cites the standards. Link them in once per clone: `ln -s ../hevier/agents .claude/agents`. |
| [skills/](skills/) | Claude Code skills for this fork: `verify`, `seam-check`, `upstream-merge`, `emulator-check`, `hevy-side-by-side`, `release-check`, `ux-review` (runs the reviewer, fixes only minor findings, brings the rest to the user). Upstream ignores `.claude/`, so link them in once per clone: `ln -s ../hevier/skills .claude/skills`. |

## Where code goes

- `frontend/src/hevier/lib/x.js` is pure: it decides, and `x.test.js` beside it proves it.
  `x-run.js` (or an `init*` export) is the wiring around it: timers, listeners, the store.
- Every `init*` helper takes the same store object (`storeAdapter` in `lib/store-watch.js`), and
  `index.js` installs them all in one `install()`, grouped by area.
- `components/` and `views/` draw; a rule they need is a helper in `lib/`.

## The four rules

1. **Add, don't edit.** New behaviour goes in new files under `frontend/src/hevier/`. An upstream
   file is edited only at a *seam*: a short, marked hook listed in [SEAMS.md](SEAMS.md).
2. **Logic stays upstream's.** `frontend/src/lib/`, `frontend/src/store/` and `api/` are reused
   as they are. A Hevy behaviour that needs different logic gets a *new* pure helper in
   `frontend/src/hevier/lib/` with a test beside it, wrapping upstream's helper rather than
   changing it.
3. **Upstream's tests stay green, unmodified.** They are the proof that the logic was not
   changed. The fork's UI is behind a build flag (`VITE_HEVIER=1`), so the upstream suite still
   tests the upstream UI.
4. **Merge upstream, never rebase.** `main` mirrors upstream; `hevier/main` merges it. See
   [CONFLICTS.md](CONFLICTS.md).
