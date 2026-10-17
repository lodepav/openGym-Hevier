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
| [RULES.md](RULES.md) | How the fork is built and kept mergeable: scope, branches, the build flag, the test rig, the rules every change follows, and the risks. The finished implementation plan is in git history. |
| [CONFLICTS.md](CONFLICTS.md) | How to merge upstream and resolve conflicts, written for AI agents (and people). |
| [reference/SCREENS.md](reference/SCREENS.md) | The UX spec: every Hevy screen, element by element, mapped to what openGym already has. `reference/fetch.sh` downloads the screenshots it cites. |
| [PIPELINE.md](PIPELINE.md) | What upstream's unreleased `release-*` branches already bring, and what it means for the fork. Check it before starting a milestone. |
| [SEAMS.md](SEAMS.md) | The list of every place the fork edits an upstream file. Keep it current: it is what makes conflicts predictable. |
| [tools/emulator.sh](tools/emulator.sh) | Builds the debug APK, boots the Android 16 emulator, installs and launches it. |
| [tools/cdp.mjs](tools/cdp.mjs) | Drives the app's WebView over the Chrome DevTools Protocol: click, read text, screenshot. |
| [tools/release-check.sh](tools/release-check.sh) | The security gates for a release build (D26): secrets, vulnerable dependencies, supply chain, and with `--apk` the APK's certificate and signature scheme, debuggable flag, permissions, native libraries and exported components (D38). Scanners from `tools/install-scanners.sh`, allow-lists in [security/](security/). |
| [skills/](skills/) | Claude Code skills for this fork: `verify`, `seam-check`, `upstream-merge`, `emulator-check`, `hevy-side-by-side`, `release-check`. Upstream ignores `.claude/`, so link them in once per clone: `ln -s ../hevier/skills .claude/skills`. |

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
