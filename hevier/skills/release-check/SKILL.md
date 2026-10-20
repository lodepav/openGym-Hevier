---
name: release-check
description: Run the fork's security gates (D26, D38) on a release build — leaked secrets, vulnerable dependencies, new npm packages, unexpected endpoints or code in the bundle, and the APK's signing certificate, debuggable flag and permissions. Use before building a release APK, after an upstream merge, when a lockfile changed, or when asked to check security, secrets or the supply chain.
---

# Release check

```bash
hevier/tools/install-scanners.sh        # once per machine: pinned gitleaks + trivy, user-local
hevier/tools/release-check.sh           # clean tree; builds the mobile bundle, runs every gate
hevier/tools/release-check.sh --apk <signed release APK>   # + the APK gates (D38)
node --test hevier/tools/*.test.mjs     # the release tools' tests alone (release-check.sh runs them too)
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
- **APK: signing certificate**: an unsigned or debug-signed APK is not a release; sign it
  (docs/MOBILE.md, "align + sign"). A digest that is not pinned means a different key: never
  pin a new one without the user saying it is the fork's release key (updates only install
  over an app signed with the same key). The first time, nothing is pinned and the user pins
  their key's digest in `~/.config/hevier/apk-cert.txt` (beside the keystore, never in the repo;
  `HEVIER_CERT` points elsewhere).
- **APK: release build**: the `.test` app id or `debuggable` means a debug build was given.
- **APK: permissions**: find who adds it (`app/build/intermediates/merged_manifest*`, the
  manifest merger's report `app/build/outputs/logs/manifest-merger-*-report.txt`): a plugin, an
  upstream merge or the fork. Add it to `hevier/security/apk-permissions.txt` only with what
  uses it, with the user's agreement. A permission listed but no longer asked for is reported
  and should be removed from the list.
- **APK: signature scheme**: sign with apksigner (v2/v3 on by default), not jarsigner alone.
- **APK: native libraries / exported components**: find who brings it (the merged manifest, or
  `unzip -l` and the dependency's AAR): a plugin, an upstream merge or the fork. List it in
  `hevier/security/apk-native-libs.txt` / `apk-exported.txt` only with what it is and why it
  must be there (an exported one: who calls it, and the permission guarding it), with the
  user's agreement. An exported component nobody needs is closed instead (`exported="false"`
  in the fork's manifest overlay, `tools:node="merge"`).
