---
name: release-check
description: Run the fork's security gates (D26) on a release build — leaked secrets, vulnerable dependencies, new npm packages, and unexpected endpoints or code in the bundle. Use before building a release APK, after an upstream merge, when a lockfile changed, or when asked to check security, secrets or the supply chain.
---

# Release check

```bash
hevier/tools/install-scanners.sh        # once per machine: pinned gitleaks + trivy, user-local
hevier/tools/release-check.sh           # clean tree; builds the mobile bundle, runs every gate
hevier/tools/release-check.sh --apk frontend/android/app/build/outputs/apk/release/app-release.apk
node --test hevier/tools/*.test.mjs     # only if supply-chain.mjs changed
```

Bash timeout 600000 (the build and Trivy's database download). Report each gate's result and
quote every finding.

## When a gate fails

Never edit an allow-list to make a finding go away without understanding it. Show the user the
finding, what it is and where it comes from, and propose the fix or the allow-list entry with
its reason; accept only with the user's agreement.

- **secrets**: a real secret is rotated first (the key is burned once it is in git history,
  even unpushed), then removed. A false positive (a test fixture, a public key) goes in
  `hevier/security/gitleaksignore` by fingerprint, the reason above it.
- **dependencies**: upgrade if the package is the fork's own. If it is upstream's, check
  whether upstream has fixed it (PIPELINE.md) and say so; accept in
  `hevier/security/trivyignore.yaml` only if the vulnerable code can't run in the shipped app,
  scoped to the version (`purls`) with an `expired_at` about three months out.
- **supply chain: npm packages**: for each new or changed line, check the npm page and repo:
  maintainers, publish date (very new versions are suspect), install scripts, downloads, and
  whether the change came from an upstream merge (`git log -p -- '*package-lock.json'`). When
  every line is explained, `node hevier/tools/supply-chain.mjs packages --accept` and commit
  `hevier/security/packages.txt` with the explanation.
- **supply chain: built bundle**: find the source of the new host or pattern
  (`grep -rn <host> frontend/src node_modules/<pkg>`). Add a host to
  `hevier/security/endpoints.txt` only with what it is and whether the app fetches it.
