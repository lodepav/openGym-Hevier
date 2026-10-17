---
name: verify
description: Run the fork's checks — on every commit the fork tests and the VITE_HEVIER build; before a merge also upstream's full suite. Use after any change under frontend/src, before merging a branch into hevier/main or upstream into the fork, or when asked to verify, test or "check everything".
---

# Verify

Two levels. Run the steps in order, one at a time. Never run two vitest suites at once: that
has caused false skips. Report the counts, and quote any failure in full.

## Every commit

```bash
export PATH="$HOME/.local/opt/node/bin:$PATH"
cd frontend
npx vitest run src/hevier                 # fork tests, fast
VITE_HEVIER=1 npx vite build              # the fork build
node scripts/check-locales.mjs            # only if a locale or t() key was touched
```

- A red upstream `src/lib/i18n-plural.test.js` naming a fork string means a fork file calls
  `tn()` with a plural key upstream's ru/uk/pl packs lack (the test reads every `tn()` in `src`,
  the fork's included). Use a plural key upstream already has, or reword so `t()` does, never a
  new one. The fork-only test run doesn't catch this: check `tn(` in new fork code at every commit.
- A red `src/hevier/contract.test.js` means an upstream export the overlay uses changed:
  adapt the fork to the new shape.
- Then run the `seam-check` skill if any upstream file changed.

## Before a merge

When merging a branch into `hevier/main`, or upstream into the fork (the `upstream-merge`
skill), or when asked to "check everything": the steps above, then upstream's tests.

```bash
npm test                                  # upstream + fork, ~2 min: Bash timeout 400000
cd ../api && npm test                     # only if api/ changed since the last merge
cd ../mcp && npm test                     # only if mcp/ changed since the last merge
```

- A red **upstream** test means a seam or a fork wrapper changed behaviour it shouldn't have.
  Fix the fork, never the test (hevier/README.md, rule 3).

## Before a release

Before building an APK to install or share: the steps above, then the `release-check` skill
(`hevier/tools/release-check.sh`, D26). Its gates block: a release is not built until they pass.
