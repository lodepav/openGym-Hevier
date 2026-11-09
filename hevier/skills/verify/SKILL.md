---
name: verify
description: Run the fork's checks — on every commit the fork tests and the VITE_HEVIER build; before a merge also upstream's full suite. Use after any change under frontend/src, before merging a branch into hevier/main or upstream into the fork, or when asked to verify, test or "check everything".
---

# Verify

Two levels. Run the steps in order, one at a time. Never run two vitest suites at once: that
has caused false skips. Report the counts, and quote any failure in full.

The merge level is `hevier/tools/verify.sh`, and git enforces it: the `pre-push` hook runs it for
`hevier/main`, and `hevier/tools/release-apk.sh` runs it first. A pass is remembered by commit, so
the push after a passing check doesn't repeat it, and neither does a docs-only commit. Hooks are
on through `hevier/tools/install-hooks.sh`, once a clone. `git push --no-verify` only when the
user says so. The `commit-msg` hook refuses a merge into `hevier/main` without
`Merge hevier/<branch>: what it does`, because the release notes are those subjects. A line
`Release-note: <text>` in the merge's body goes first in the notes, under Before you update, for
what someone must know before updating (a feature that hides itself).

`.github/workflows/hevier-checks.yml` runs the same script on every push to `hevier/main`, once
Actions is on for the repo. `frontend/src/hevier/upgrade/` holds what each release saved, and the
test that the current code still reads it; `hevier/tools/upgrade-fixture.sh <version>` adds one.

Whole suites and builds take turns through `hevier/tools/heavy.sh`, a lock shared with OpenBite's
copy, so one waits for the other, in either repo.

`$FAST` is `--config src/hevier/build/vitest-fast.config.js --maxWorkers=4`: the threads pool with 4 workers, and the tests that set `process.env.TZ` in a process of their own, as a thread cannot move the clock. Threads measured 2026-10-25 (8 cores, 14 GB): the full suite
283 s → 145 s, the fork's 39 s → 25 s, about 3 GB at its peak. Not faster: 6 workers (130 s for
7 GB), `--pool=vmThreads` (filled the memory), `--no-isolate` (311 of upstream's tests fail when
files share a process), Vite's dependency pre-bundling (no change). Most of the time is each
file's setup (the 1.1 MB catalogue, happy-dom), not its tests. With the emulator up, run
`nice -n 19` and `--maxWorkers=2`.

## Every commit

```bash
export PATH="$HOME/.local/opt/node/bin:$PATH"
FAST='--config src/hevier/build/vitest-fast.config.js --maxWorkers=4'
cd frontend
npx vitest run $FAST src/hevier src/lib/i18n-plural.test.js   # fork tests and the plural keys, ~25 s
VITE_HEVIER=1 npx vite build              # the fork build
node scripts/check-locales.mjs            # only if a locale or t() key was touched
# only if the fork's Java changed (frontend/android/app/src/hevier):
(cd android && JAVA_HOME=$HOME/.local/opt/jdk21 ANDROID_HOME=$HOME/Android/Sdk \
  ./gradlew -q :app:testSideloadDebugUnitTest :app:compileSideloadReleaseJavaWithJavac)
```

- A diff from the decision index (`verify.sh` checks it) means a decision was added or reworded without the index:
  run `hevier/tools/decision-index.sh > hevier/DECISIONS-INDEX.md` and commit it with the change.

- A red upstream `src/lib/i18n-plural.test.js` naming a fork string means a fork file calls
  `tn()` with a plural key upstream's ru/uk/pl packs lack (the test reads every `tn()` in `src`,
  the fork's included). Use a plural key upstream already has, or reword so `t()` does, never a
  new one. The every-commit run above includes it.
- A red `src/hevier/contract.test.js` means an upstream export the overlay uses changed:
  adapt the fork to the new shape.
- Then run the `seam-check` skill if any upstream file changed.

## Before a merge

When merging a branch into `hevier/main`, or upstream into the fork (the `upstream-merge`
skill), or when asked to "check everything": the script, which covers conflict markers, seams,
the decision index, the release tools, the whole suite and the fork build.

```bash
../hevier/tools/verify.sh                 # ~3.5 min: Bash timeout 400000
cd ../api && npm test                     # only if api/ changed since the last merge
cd ../mcp && npm test                     # only if mcp/ changed since the last merge
```

- A red **upstream** test means a seam or a fork wrapper changed behaviour it shouldn't have.
  Fix the fork, never the test (hevier/README.md, rule 3).

## Before a release

Before building an APK to install or share: the steps above, then the `release-check` skill
(`hevier/tools/release-check.sh`, D26). Its gates block: a release is not built until they pass.
