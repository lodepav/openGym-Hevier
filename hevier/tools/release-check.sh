#!/usr/bin/env bash
# Security gates for a release build (D26): secrets, vulnerable dependencies, supply chain.
#
#   hevier/tools/release-check.sh                 # build the mobile bundle, run every gate
#   hevier/tools/release-check.sh --no-build      # scan the existing frontend/dist
#   hevier/tools/release-check.sh --apk <file>    # also scan an APK's contents for secrets
#
# Every gate runs even when an earlier one fails; exit 1 if any failed. A finding is fixed, or
# accepted with its reason in hevier/security/ (a reviewed diff). Scanners: install-scanners.sh.
# Needs the network (Trivy's vulnerability database).
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SEC="$ROOT/hevier/security"
export PATH="$HOME/.local/opt/node/bin:$HOME/.local/opt/gitleaks:$HOME/.local/opt/trivy:$PATH"
BUILD=1 APK=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-build) BUILD=0 ;;
    --apk) APK="$(realpath "$2")"; shift ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

for t in gitleaks trivy node; do
  command -v "$t" >/dev/null || { echo "$t not found: run hevier/tools/install-scanners.sh" >&2; exit 2; }
done
cd "$ROOT"

FAILED=()
gate() {   # name, command...
  local name=$1; shift
  echo; echo "── $name"
  if "$@"; then echo "ok"; else FAILED+=("$name"); fi
}

# A release is built from a commit. Uncommitted changes fail this gate, but the others still
# run, so a lockfile change or an allow-list entry can be checked before it is committed.
committed() {
  local dirty; dirty="$(git status --porcelain)"
  [[ -z "$dirty" ]] && { echo "clean"; return 0; }
  echo "uncommitted changes, so this is not a release check of a commit:"; echo "$dirty" | head -20
  return 1
}
gate "working tree committed" committed

if [[ $BUILD == 1 ]]; then
  # The bundle the APK ships, flags as in emulator.sh (and upstream's build:mobile).
  echo "── building the mobile bundle"
  (cd frontend && { [[ -d node_modules ]] || npm ci --no-audit --no-fund; } &&
    VITE_MOBILE=1 VITE_HEVIER=1 VITE_UPDATE_REPO="${VITE_UPDATE_REPO:-lodepav/openGym-Hevier}" \
      npx vite build --logLevel error) || { echo "build failed" >&2; exit 2; }
fi
[[ -d frontend/dist ]] || { echo "no frontend/dist: run without --no-build" >&2; exit 2; }

GL=(--no-banner --redact --verbose --log-level warn --gitleaks-ignore-path "$SEC/gitleaksignore")
gate "secrets: git history" gitleaks git . "${GL[@]}"
# Changes not yet in a commit: unstaged and staged edits, and new files git doesn't ignore
# (copied out, since gitleaks' git modes only see tracked files).
worktree_secrets() {
  local rc=0
  gitleaks git . --pre-commit "${GL[@]}" || rc=1
  gitleaks git . --staged "${GL[@]}" || rc=1
  mkdir -p "$TMP/untracked"
  git ls-files -z --others --exclude-standard | xargs -0 -r cp --parents -t "$TMP/untracked"
  gitleaks dir "$TMP/untracked" "${GL[@]}" || rc=1
  return $rc
}
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
gate "secrets: working tree" worktree_secrets
gate "secrets: built bundle" gitleaks dir frontend/dist "${GL[@]}"
if [[ -n "$APK" ]]; then
  unzip -q "$APK" -d "$TMP/apk"
  gate "secrets: APK" gitleaks dir "$TMP/apk" "${GL[@]}"
fi

gate "dependencies: known vulnerabilities" trivy fs . --scanners vuln --include-dev-deps \
  --skip-dirs '**/node_modules' --ignorefile "$SEC/trivyignore.yaml" --exit-code 1 --quiet

gate "supply chain: npm packages" node hevier/tools/supply-chain.mjs packages
gate "supply chain: built bundle" node hevier/tools/supply-chain.mjs bundle frontend/dist

echo
if [[ ${#FAILED[@]} -eq 0 ]]; then echo "release-check: all gates passed"; exit 0; fi
echo "release-check: ${#FAILED[@]} gate(s) failed:"; printf '  ✗ %s\n' "${FAILED[@]}"
exit 1
