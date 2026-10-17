---
name: verify
description: Run the fork's checks before a commit or push — fork tests, the full upstream+fork suite, and the VITE_HEVIER build. Use after any change under frontend/src, or when asked to verify, test or "check everything".
---

# Verify

Run the steps in order, one at a time. Never run two vitest suites at once: that has caused
false skips. Report the counts, and quote any failure in full.

```bash
export PATH="$HOME/.local/opt/node/bin:$PATH"
cd frontend
npx vitest run src/hevier                 # fork tests, fast: fix these first
npm test                                  # upstream + fork, ~2 min: Bash timeout 400000
VITE_HEVIER=1 npx vite build              # the fork build
node scripts/check-locales.mjs            # only if a locale or t() key was touched
```

- A red **upstream** test means a seam or a fork wrapper changed behaviour it shouldn't have.
  Fix the fork, never the test (hevier/README.md, rule 3).
- A red `src/hevier/contract.test.js` means an upstream export the overlay uses changed:
  adapt the fork to the new shape.
- `api/` or `mcp/` changed? Also run `cd api && npm test` and `cd mcp && npm test`.
- Then run the `seam-check` skill if any upstream file changed.

## Before a release

Before building an APK to install or share: the steps above, then the `release-check` skill
(`hevier/tools/release-check.sh`, D26). Its gates block: a release is not built until they pass.
