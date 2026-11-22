#!/usr/bin/env bash
# Every routine of the test profile opens as it did the last time this was accepted: the emulator
# half of the regression harness (the other half, routine-open.test.js, runs with the tests).
#
#   ANDROID_SERIAL=emulator-5556 hevier/tools/routine-check.sh   # the debug app as installed there
#   hevier/tools/routine-check.sh --build    # build this checkout, boot an emulator, install, then check
#   hevier/tools/routine-check.sh --build --accept   # the differences are meant: keep this run as the baseline
#   hevier/tools/routine-check.sh --build --once   # nothing when it passed for this app already
#
# It restores the test profile (hevier/ux/JOURNEYS.md, ~/.cache/hevier/ux-profile.tar), runs
# routine-snapshot.mjs and compares with ~/.cache/hevier/routines-baseline.json. No baseline yet:
# this run becomes it. Exit 1 on a difference, 2 when it could not run. The release script runs it
# with --build --once (ROUTINE_CHECK=0 leaves it out); without the profile it cannot run and says so.
# A --build pass on a clean tree is remembered by commit; --once skips the check while nothing in
# frontend/, catalogue/, scripts/ or the tools it runs changed (a new upgrade fixture aside).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
export PATH="$HOME/.local/opt/node/bin:$PATH"
ADB="${ADB:-$HOME/Android/Sdk/platform-tools/adb}"
APP="${APP_ID:-ch.duartesantos.opengym.hevier.test}"
PROFILE="${PROFILE:-$HOME/.cache/hevier/ux-profile.tar}"
BASE="${BASE:-$HOME/.cache/hevier/routines-baseline.json}"
STAMP="$(git rev-parse --path-format=absolute --git-common-dir)/hevier-routines-checked"
BUILD= ACCEPT= ONCE=
for a in "$@"; do
  case "$a" in
    --build) BUILD=1 ;;
    --accept) ACCEPT=1 ;;
    --once) ONCE=1 ;;
    *) echo "usage: routine-check.sh [--build] [--accept] [--once]" >&2; exit 2 ;;
  esac
done

[[ -s "$PROFILE" ]] || { echo "routine check: no test profile at $PROFILE (hevier/ux/JOURNEYS.md says how to make it)" >&2; exit 2; }
tar -tf "$PROFILE" >/dev/null || { echo "routine check: $PROFILE is not a readable archive" >&2; exit 2; }

clean() { [[ -z "$(git status --porcelain)" ]]; }
# Only a build of this commit is a pass of it: without --build the app installed may be older.
passed() { [[ -n "$BUILD" ]] && clean && git rev-parse HEAD > "$STAMP" || true; }
already_checked() {
  clean && [[ -f "$STAMP" && -s "$BASE" && ! "$BASE" -nt "$STAMP" && ! "$PROFILE" -nt "$STAMP" ]] || return 1
  local last names
  last="$(cat "$STAMP")"
  git merge-base --is-ancestor "$last" HEAD 2>/dev/null || return 1
  # Read whole first, as in verify.sh: grep -q in a pipe under pipefail can fail a long list.
  names="$(git diff --name-only "$last" HEAD | grep -vE '^frontend/src/hevier/upgrade/fixtures/[^/]+\.json$' || true)"
  ! grep -qE '^(frontend|catalogue|scripts)/|^hevier/tools/(routine-check\.sh|routine-snapshot\.mjs|emulator\.sh|cdp\.mjs)$' <<<"$names" || return 1
  # A fixture only when added: a changed one is what the app reads.
  [[ -z "$(git diff --name-only --diff-filter=a "$last" HEAD -- frontend/src/hevier/upgrade/fixtures)" ]]
}
if [[ -n "$ONCE" ]] && already_checked; then
  echo "routine check: passed at $(git rev-parse --short "$(cat "$STAMP")"), and nothing it reads changed since"
  exit 0
fi

# The shared emulators (~/.claude/bin/emu), only now that it checks: --build boots a free one unless
# ANDROID_SERIAL names one, and stops the one it booted on every exit. The profile restore wipes app
# storage, so it runs only on an emulator this repo booted, never one adb happens to pick.
BOOTED= OUT=
cleanup() {
  [[ -z "$OUT" ]] || rm -f "$OUT"
  [[ -z "$BOOTED" ]] || "$HOME/.claude/bin/emu" down "$ANDROID_SERIAL" >/dev/null 2>&1 || true
}
trap cleanup EXIT
if [[ -z ${ANDROID_SERIAL:-} ]]; then
  [[ -n "$BUILD" ]] || { echo "routine check: set ANDROID_SERIAL to an emulator this repo booted (~/.claude/bin/emu list), or use --build" >&2; exit 2; }
  ANDROID_SERIAL="$("$HOME/.claude/bin/emu" up)" || { echo "routine check: no emulator could be booted (~/.claude/bin/emu list)" >&2; exit 2; }
  BOOTED=1
elif ! "$HOME/.claude/bin/emu" mine "$ANDROID_SERIAL"; then
  echo "routine check: $ANDROID_SERIAL was not booted from this repo (~/.claude/bin/emu list)" >&2; exit 2
fi
export ANDROID_SERIAL
if [[ -n "$BUILD" ]]; then
  hevier/tools/emulator.sh >/tmp/hevier-routine-check-build.log 2>&1 \
    || { echo "routine check: the debug build failed, see /tmp/hevier-routine-check-build.log" >&2; exit 2; }
  # cap sync rewrites these in place; the tree stays as committed.
  git checkout -- frontend/android/app/capacitor.build.gradle frontend/android/capacitor.settings.gradle frontend/ios/App/Podfile 2>/dev/null || true
fi
"$ADB" get-state >/dev/null 2>&1 || { echo "routine check: $ANDROID_SERIAL is not reachable (hevier/tools/emulator.sh, or --build)" >&2; exit 2; }

# The profile as saved, so every run reads the same data. Extracted with the app stopped.
"$ADB" shell am force-stop "$APP"
# Extracting only adds and replaces: what the last run left in the WebView's storage would come
# back as the newer copy of the state, so that storage goes first (the pictures stay).
{ "$ADB" shell "run-as $APP sh -c 'rm -rf app_webview shared_prefs files/opengym-state*.json'" \
  && "$ADB" exec-in run-as "$APP" tar -xf - < "$PROFILE"; } \
  || { echo "routine check: could not restore the profile into $APP (is the debug app installed?)" >&2; exit 2; }
"$ADB" shell monkey -p "$APP" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
sleep 5

OUT="$(mktemp -t routines-XXXXXX.json)"
if [[ -n "$ACCEPT" || ! -s "$BASE" ]]; then
  node hevier/tools/routine-snapshot.mjs "$OUT"
  grep -q '"probe": {' "$OUT" || { echo "routine check: no warm-up probe ran, the profile has lost its warm-up routines: not kept" >&2; exit 2; }
  mkdir -p "$(dirname "$BASE")"
  cp "$OUT" "$BASE"
  echo "routine check: baseline kept at $BASE"
  passed
  exit 0
fi
node hevier/tools/routine-snapshot.mjs "$OUT" --diff "$BASE" || {
  code=$?
  [[ $code -eq 1 ]] && echo "routine check: routines open differently from the baseline. Meant? hevier/tools/routine-check.sh --build --accept" >&2
  exit $code
}
passed
