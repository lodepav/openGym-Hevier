#!/usr/bin/env bash
# Security gates for a release build (D26): secrets, vulnerable dependencies, supply chain.
#
#   hevier/tools/release-check.sh                 # build the mobile bundle, run every gate
#   hevier/tools/release-check.sh --no-build      # scan the existing frontend/dist
#   hevier/tools/release-check.sh --apk <file>    # also check a signed release APK (D38): its
#                                                 # secrets, signing certificate and scheme,
#                                                 # debuggable flag, permissions, native
#                                                 # libraries and exported components
#
# Every gate runs even when an earlier one fails; exit 1 if any failed. The gates run at the same
# time, each into its own log, and the ones that read only the sources start before the bundle is
# built; the logs are printed in order. A finding is fixed, or accepted with its reason in
# hevier/security/ (a reviewed diff). Scanners: install-scanners.sh. Needs the network (Trivy's
# vulnerability database).
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SEC="$ROOT/hevier/security"
# The release key's pinned certificate lives beside the keystore, never in the repo (D38).
CERT="${HEVIER_CERT:-$HOME/.config/hevier/apk-cert.txt}"
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
[[ $BUILD == 1 || -d frontend/dist ]] || { echo "no frontend/dist: run without --no-build" >&2; exit 2; }

TMP="$(mktemp -d)"
# A failed build exits early: the gates still running are stopped first, with the scanner each
# one runs (Trivy does not stop on SIGTERM).
stop_gates() { local p; for p in $(jobs -p); do pkill -KILL -P "$p"; kill "$p"; done 2>/dev/null; wait; }
trap 'stop_gates; rm -rf "$TMP"' EXIT
NAMES=() PIDS=()
gate() {   # name, command... : started in the background, its output kept for report
  local n=${#NAMES[@]}
  NAMES+=("$1"); shift
  "$@" > "$TMP/gate-$n.log" 2>&1 &
  PIDS+=($!)
}
report() {   # every gate's log in the order they were started, as each one ends
  local i
  FAILED=()
  for i in "${!NAMES[@]}"; do
    echo; echo "── ${NAMES[$i]}"
    if wait "${PIDS[$i]}"; then cat "$TMP/gate-$i.log"; echo "ok"
    else cat "$TMP/gate-$i.log"; FAILED+=("${NAMES[$i]}"); fi
  done
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
# The release script numbers the release and writes its notes with release-notes.mjs, and this
# check's supply-chain gates are supply-chain.mjs: their own tests are a gate too.
gate "release tools: tests" node --test hevier/tools/*.test.mjs

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
gate "secrets: working tree" worktree_secrets
if [[ -n "$APK" ]]; then
  unzip -q "$APK" -d "$TMP/apk"
  gate "secrets: APK" gitleaks dir "$TMP/apk" "${GL[@]}"
fi

# The APK itself (D38). The lists' lines are "value  # reason"; blank lines and comments skip.
listed() { [[ -f "$1" ]] || return 0; sed -e 's/#.*//' -e 's/[[:space:]]*$//' -e '/^[[:space:]]*$/d' "$1"; }
APP_ID=ch.duartesantos.opengym.hevier
# Signed by the fork's own key: a valid signature, not the debug key, the pinned certificate.
apk_signature() {
  local out digest
  out="$("${BT}apksigner" verify --print-certs "$APK" 2>&1)" || { echo "$out" | grep -v '^WARNING' | head -5; echo "not signed, or the signature does not verify"; return 1; }
  if echo "$out" | grep -q 'CN=Android Debug'; then echo "signed with the debug key"; return 1; fi
  if [[ "$(echo "$out" | grep -c '^Signer #[0-9]* certificate DN:')" -ne 1 ]]; then echo "not exactly one signer"; return 1; fi
  digest="$(echo "$out" | sed -n 's/^Signer #1 certificate SHA-256 digest: //p')"
  if listed "$CERT" | grep -qx "$digest"; then echo "certificate $digest"; return 0; fi
  echo "certificate $digest is not pinned in $CERT"
  listed "$CERT" | grep -q . || echo "(nothing pinned yet: if this is the fork's release key, add the digest there with its reason)"
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
# Signed with APK Signature Scheme v2 or later, not only the v1 JAR signature (which leaves the
# zip's other bytes unsigned and is what Android before 7 reads).
apk_scheme() {
  local out; out="$("${BT}apksigner" verify -v "$APK" 2>/dev/null)" || { echo "the signature does not verify"; return 1; }
  local schemes; schemes="$(echo "$out" | sed -n 's/^Verified using \(v[0-9.]*\) scheme.*: true$/\1/p' | tr '\n' ' ')"
  if echo "$out" | grep -Eq '^Verified using v(2|3|3\.1) scheme.*: true$'; then echo "schemes: $schemes"; return 0; fi
  echo "only ${schemes:-no scheme}: v2 or later is required"; return 1
}
# A list's entries against what the APK has: new ones fail, listed ones no longer there are reported.
against() {   # list file, what (for the messages), entries on stdin
  local have allowed new gone
  have="$(sort -u)"
  allowed="$(listed "$1" | sed 's/[[:space:]]\{2,\}.*//' | sort -u)"
  new="$(comm -23 <(echo "$have") <(echo "$allowed") | sed '/^$/d')"
  gone="$(comm -13 <(echo "$have") <(echo "$allowed") | sed '/^$/d')"
  [[ -n "$gone" ]] && { echo "listed but no longer in the APK (remove from the list):"; echo "$gone" | sed 's/^/  /'; }
  [[ -z "$new" ]] && { echo "$(echo "$have" | sed '/^$/d' | wc -l) $2, all listed"; return 0; }
  echo "not in ${1#"$ROOT/"}:"; echo "$new" | sed 's/^/  /'
  return 1
}
# Native code: every .so the APK ships (by name, any ABI) is in the reviewed list.
apk_native() {
  unzip -Z1 "$APK" | sed -n 's|^lib/[^/]*/\([^/]*\.so\)$|\1|p' | against "$SEC/apk-native-libs.txt" "native libraries"
}
# What other apps can reach: every exported activity, alias, service, receiver and provider is in
# the reviewed list, written "type name" (with the permission that guards it, if any).
apk_exported() {
  "${BT}aapt2" dump xmltree --file AndroidManifest.xml "$APK" | awk '
    function out() { if (t != "" && ex == "true") print t " " n (perm != "" ? " [" perm "]" : "") ; t = "" }
    /E: (activity|activity-alias|receiver|service|provider) / { out(); t = $2; n = ""; ex = ""; perm = ""; depth = index($0, "E:"); next }
    /E: / { if (t != "" && index($0, "E:") <= depth) out(); next }
    t != "" && /android:name\(/ && n == "" { match($0, /="[^"]*"/); n = substr($0, RSTART + 2, RLENGTH - 3) }
    t != "" && /android:exported\(/ { ex = ($0 ~ /=true/) ? "true" : "false" }
    t != "" && /android:permission\(/ { match($0, /="[^"]*"/); perm = substr($0, RSTART + 2, RLENGTH - 3) }
    END { out() }' | against "$SEC/apk-exported.txt" "exported components"
}
if [[ -n "$APK" ]]; then
  gate "APK: signing certificate" apk_signature
  gate "APK: signature scheme" apk_scheme
  gate "APK: release build" apk_release
  gate "APK: permissions" apk_permissions
  gate "APK: native libraries" apk_native
  gate "APK: exported components" apk_exported
fi

# Trivy refreshes its database when it is due, but a stale one would pass in silence: say how old
# it is, and fail past a week.
vulns() {
  trivy fs . --scanners vuln --include-dev-deps --skip-dirs '**/node_modules' \
    --ignorefile "$SEC/trivyignore.yaml" --exit-code 1 --quiet || return 1
  local meta="${TRIVY_CACHE_DIR:-$HOME/.cache/trivy}/db/metadata.json" at age
  at="$(node -p "JSON.parse(require('fs').readFileSync('$meta', 'utf8')).UpdatedAt" 2>/dev/null)" || { echo "no database metadata at $meta"; return 1; }
  age=$(( ( $(date +%s) - $(date -d "$at" +%s) ) / 86400 ))
  echo "vulnerability database updated $at ($age days ago)"
  (( age <= 7 )) || { echo "older than a week"; return 1; }
}
gate "dependencies: known vulnerabilities" vulns

gate "supply chain: npm packages" node hevier/tools/supply-chain.mjs packages

# The gates that read the bundle, once it is built.
if [[ $BUILD == 1 ]]; then
  # The bundle the APK ships, flags as in emulator.sh (and upstream's build:mobile).
  echo "── building the mobile bundle"
  (cd frontend && { [[ -d node_modules ]] || npm ci --no-audit --no-fund; } &&
    VITE_MOBILE=1 VITE_HEVIER=1 VITE_UPDATE_REPO="${VITE_UPDATE_REPO:-lodepav/openGym-Hevier}" \
      npx vite build --logLevel error) || { echo "build failed" >&2; exit 2; }
fi
[[ -d frontend/dist ]] || { echo "no frontend/dist: run without --no-build" >&2; exit 2; }
gate "secrets: built bundle" gitleaks dir frontend/dist "${GL[@]}"
gate "supply chain: built bundle" node hevier/tools/supply-chain.mjs bundle frontend/dist

report
echo
if [[ ${#FAILED[@]} -eq 0 ]]; then echo "release-check: all gates passed"; exit 0; fi
echo "release-check: ${#FAILED[@]} gate(s) failed:"; printf '  ✗ %s\n' "${FAILED[@]}"
exit 1
