#!/usr/bin/env bash
# Every routine of the test profile opens as it did the last time this was accepted: the emulator
# half of the regression harness (the other half, routine-open.test.js, runs with the tests).
#
#   hevier/tools/routine-check.sh            # the debug app as installed on the running emulator
#   hevier/tools/routine-check.sh --build    # build this checkout, boot the emulator, install, then check
#   hevier/tools/routine-check.sh --accept   # the differences are meant: keep this run as the baseline
#
# It restores the test profile (hevier/ux/JOURNEYS.md, ~/.cache/hevier/ux-profile.tar), runs
# routine-snapshot.mjs and compares with ~/.cache/hevier/routines-baseline.json. No baseline yet:
# this run becomes it. Exit 1 on a difference, 2 when it could not run. The release script runs it
# with --build (ROUTINE_CHECK=0 leaves it out); without the profile it cannot run and says so.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
export PATH="$HOME/.local/opt/node/bin:$PATH"
ADB="${ADB:-$HOME/Android/Sdk/platform-tools/adb}"
APP="${APP_ID:-ch.duartesantos.opengym.hevier.test}"
PROFILE="${PROFILE:-$HOME/.cache/hevier/ux-profile.tar}"
BASE="${BASE:-$HOME/.cache/hevier/routines-baseline.json}"
BUILD= ACCEPT=
for a in "$@"; do
  case "$a" in
    --build) BUILD=1 ;;
    --accept) ACCEPT=1 ;;
    *) echo "usage: routine-check.sh [--build] [--accept]" >&2; exit 2 ;;
  esac
done

[[ -s "$PROFILE" ]] || { echo "routine check: no test profile at $PROFILE (hevier/ux/JOURNEYS.md says how to make it)" >&2; exit 2; }
tar -tf "$PROFILE" >/dev/null || { echo "routine check: $PROFILE is not a readable archive" >&2; exit 2; }

if [[ -n "$BUILD" ]]; then
  HEADLESS=1 hevier/tools/emulator.sh >/tmp/hevier-routine-check-build.log 2>&1 \
    || { echo "routine check: the debug build failed, see /tmp/hevier-routine-check-build.log" >&2; exit 2; }
  # cap sync rewrites these in place; the tree stays as committed.
  git checkout -- frontend/android/app/capacitor.build.gradle frontend/android/capacitor.settings.gradle frontend/ios/App/Podfile 2>/dev/null || true
fi
"$ADB" get-state >/dev/null 2>&1 || { echo "routine check: no emulator is running (hevier/tools/emulator.sh, or --build)" >&2; exit 2; }

# The profile as saved, so every run reads the same data. Extracted with the app stopped.
"$ADB" shell am force-stop "$APP"
# Extracting only adds and replaces: what the last run left in the WebView's storage would come
# back as the newer copy of the state, so that storage goes first (the pictures stay).
"$ADB" shell "run-as $APP sh -c 'rm -rf app_webview shared_prefs files/opengym-state*.json'"
"$ADB" exec-in run-as "$APP" tar -xf - < "$PROFILE"
"$ADB" shell monkey -p "$APP" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
sleep 5

OUT="$(mktemp -t routines-XXXXXX.json)"
trap 'rm -f "$OUT"' EXIT
if [[ -n "$ACCEPT" || ! -s "$BASE" ]]; then
  node hevier/tools/routine-snapshot.mjs "$OUT"
  grep -q '"probe": {' "$OUT" || { echo "routine check: no warm-up probe ran, the profile has lost its warm-up routines: not kept" >&2; exit 2; }
  mkdir -p "$(dirname "$BASE")"
  cp "$OUT" "$BASE"
  echo "routine check: baseline kept at $BASE"
  exit 0
fi
node hevier/tools/routine-snapshot.mjs "$OUT" --diff "$BASE" || {
  code=$?
  [[ $code -eq 1 ]] && echo "routine check: routines open differently from the baseline. Meant? hevier/tools/routine-check.sh --accept" >&2
  exit $code
}
