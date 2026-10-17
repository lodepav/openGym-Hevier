#!/usr/bin/env bash
# Security gates for a release build (D26): secrets, vulnerable dependencies, supply chain.
#
#   hevier/tools/release-check.sh                 # build the mobile bundle, run every gate
#   hevier/tools/release-check.sh --no-build      # scan the existing frontend/dist
#   hevier/tools/release-check.sh --apk <file>    # also check a signed release APK (D38): its
#                                                 # secrets, signing certificate, debuggable flag
#                                                 # and permissions
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
if [[ -n "$APK" ]]; then
  # aapt2 and apksigner from the SDK the emulator uses (newest build-tools), apksigner on its JDK.
  BT="$(ls -d "${ANDROID_HOME:-$HOME/Android/Sdk}"/build-tools/*/ 2>/dev/null | sort -V | tail -1)"
  export JAVA_HOME="${JAVA_HOME:-$HOME/.local/opt/jdk21}" PATH="$JAVA_HOME/bin:$PATH"
  [[ -x "${BT}aapt2" && -x "${BT}apksigner" ]] || { echo "no Android build-tools with aapt2/apksigner under \$ANDROID_HOME" >&2; exit 2; }
  command -v java >/dev/null || { echo "java not found: apksigner needs JDK 21 (\$JAVA_HOME)" >&2; exit 2; }
fi
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

# The APK itself (D38). The lists' lines are "value  # reason"; blank lines and comments skip.
listed() { sed -e 's/#.*//' -e 's/[[:space:]]*$//' -e '/^[[:space:]]*$/d' "$1"; }
APP_ID=ch.duartesantos.opengym.hevier
# Signed by the fork's own key: a valid signature, not the debug key, the pinned certificate.
apk_signature() {
  local out digest
  out="$("${BT}apksigner" verify --print-certs "$APK" 2>&1)" || { echo "$out" | grep -v '^WARNING' | head -5; echo "not signed, or the signature does not verify"; return 1; }
  if echo "$out" | grep -q 'CN=Android Debug'; then echo "signed with the debug key"; return 1; fi
  if [[ "$(echo "$out" | grep -c '^Signer #[0-9]* certificate DN:')" -ne 1 ]]; then echo "not exactly one signer"; return 1; fi
  digest="$(echo "$out" | sed -n 's/^Signer #1 certificate SHA-256 digest: //p')"
  if listed "$SEC/apk-cert.txt" | grep -qx "$digest"; then echo "certificate $digest"; return 0; fi
  echo "certificate $digest is not pinned in hevier/security/apk-cert.txt"
  listed "$SEC/apk-cert.txt" | grep -q . || echo "(the list is empty: if this is the fork's release key, add the digest there with its reason)"
  return 1
}
# A release build: the fork's app id (not the .test one) and not debuggable.
apk_release() {
  local badging pkg; badging="$("${BT}aapt2" dump badging "$APK")" || return 1
  pkg="$(echo "$badging" | sed -n "s/^package: name='\([^']*\)'.*/\1/p")"
  local rc=0
  [[ "$pkg" == "$APP_ID" ]] || { echo "app id $pkg, not $APP_ID"; rc=1; }
  if echo "$badging" | grep -q '^application-debuggable'; then echo "android:debuggable is set"; rc=1; fi
  [[ $rc == 0 ]] && echo "$pkg, not debuggable"
  return $rc
}
# Every permission the merged manifest asks for is in the reviewed list.
apk_permissions() {
  local asked allowed new
  asked="$("${BT}aapt2" dump permissions "$APK" | sed -n "s/^uses-permission: name='\([^']*\)'.*/\1/p" | sed "s/^$APP_ID\(\.test\)\{0,1\}\./\$PKG./" | sort -u)"
  allowed="$(listed "$SEC/apk-permissions.txt" | awk '{print $1}' | sort -u)"
  new="$(comm -23 <(echo "$asked") <(echo "$allowed"))"
  gone="$(comm -13 <(echo "$asked") <(echo "$allowed"))"
  [[ -n "$gone" ]] && { echo "listed but no longer asked for (remove from the list):"; echo "$gone" | sed 's/^/  /'; }
  [[ -z "$new" ]] && { echo "$(echo "$asked" | wc -l) permissions, all listed"; return 0; }
  echo "not in hevier/security/apk-permissions.txt:"; echo "$new" | sed 's/^/  /'
  return 1
}
if [[ -n "$APK" ]]; then
  gate "APK: signing certificate" apk_signature
  gate "APK: release build" apk_release
  gate "APK: permissions" apk_permissions
fi

gate "dependencies: known vulnerabilities" trivy fs . --scanners vuln --include-dev-deps \
  --skip-dirs '**/node_modules' --ignorefile "$SEC/trivyignore.yaml" --exit-code 1 --quiet

gate "supply chain: npm packages" node hevier/tools/supply-chain.mjs packages
gate "supply chain: built bundle" node hevier/tools/supply-chain.mjs bundle frontend/dist

echo
if [[ ${#FAILED[@]} -eq 0 ]]; then echo "release-check: all gates passed"; exit 0; fi
echo "release-check: ${#FAILED[@]} gate(s) failed:"; printf '  ✗ %s\n' "${FAILED[@]}"
exit 1
