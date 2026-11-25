#!/usr/bin/env bash
# The UX journeys' "Check" mode (hevier/ux/JOURNEYS.md): each scripted journey tapped through on
# the emulator, its end state checked and compared with the baseline kept on this machine. Run it
# after an upstream merge, beside routine-check.sh.
#
#   ANDROID_SERIAL=emulator-5556 hevier/tools/journey-check.sh        # every scripted journey (J1 to J7, J8, J8b)
#   hevier/tools/journey-check.sh J8 J8b                               # these only
#   hevier/tools/journey-check.sh --build                              # build this checkout, boot an emulator, install, then check
#   hevier/tools/journey-check.sh --accept J8                          # the differences are meant: keep this run as J8's baseline
#   hevier/tools/journey-check.sh --hr J8                              # also the heart rate per set (a strap paired by hand)
#   hevier/tools/journey-check.sh --make-owner-profile [backup.json]   # (re)make ~/.cache/hevier/owner-profile.tar
#
# Before anything it saves the app's own data, and puts it back on every exit, a failure included.
# Each journey starts from its profile: J1 to J7 from ux-profile.tar, J8 and J8b from owner-profile.tar
# (the owner's backup, imported through Settings → Data). Baselines: ~/.cache/hevier/journeys/<J>.json;
# a journey without one keeps its first clean run. Exit 1 on a failed check or a difference, 2 when
# it could not run. It refuses a profile with Send to Hevy on: nothing goes to Hevy. J7 runs at
# font_scale 2.0 and puts it back at 1.0 on every exit.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
export PATH="$HOME/.local/opt/node/bin:$PATH"
ADB="${ADB:-$HOME/Android/Sdk/platform-tools/adb}"
APP="${APP_ID:-ch.duartesantos.opengym.hevier.test}"
CACHE="$HOME/.cache/hevier"
UX_PROFILE="${UX_PROFILE:-$CACHE/ux-profile.tar}"
OWNER_PROFILE="${OWNER_PROFILE:-$CACHE/owner-profile.tar}"
BASES="${BASES:-$CACHE/journeys}"
BACKUP_DEFAULT="$HOME/Downloads/opengym-backup-2026-11-18.json"
BUILD= ACCEPT= MAKE= BACKUP= JOURNEYS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --build) BUILD=1 ;;
    --accept) ACCEPT=1 ;;
    --hr) export JOURNEY_HR=1 ;;
    --make-owner-profile) MAKE=1; if [[ ${2:-} == *.json ]]; then BACKUP="$2"; shift; fi ;;
    J[1-7]|J8|J8b) JOURNEYS+=("$1") ;;
    *) echo "usage: journey-check.sh [--build] [--accept] [--hr] [J1 … J7 J8 J8b] | --make-owner-profile [backup.json]" >&2; exit 2 ;;
  esac
  shift
done
[[ ${#JOURNEYS[@]} -gt 0 ]] || JOURNEYS=(J1 J2 J3 J4 J5 J6 J7 J8 J8b)
profile_of() { [[ $1 == J[1-7] ]] && echo "$UX_PROFILE" || echo "$OWNER_PROFILE"; }

if [[ -z "$MAKE" ]]; then
  for j in "${JOURNEYS[@]}"; do
    p="$(profile_of "$j")"
    [[ -s "$p" ]] || { echo "journey check: no profile for $j at $p (hevier/ux/JOURNEYS.md says how to make it)" >&2; exit 2; }
    tar -tf "$p" >/dev/null || { echo "journey check: $p is not a readable archive" >&2; exit 2; }
  done
else
  BACKUP="${BACKUP:-$BACKUP_DEFAULT}"
  [[ -s "$BACKUP" ]] || { echo "journey check: no backup at $BACKUP" >&2; exit 2; }
fi

# The shared emulators (~/.claude/bin/emu), as routine-check.sh uses them: --build boots a free one
# unless ANDROID_SERIAL names one, and stops the one it booted on every exit. Profiles are restored
# only on an emulator this repo booted.
BOOTED= RUN="" SNAP=""
restore() {
  [[ -n "$SNAP" && -s "$SNAP/app.tar" ]] || return 0
  "$ADB" shell am force-stop "$APP" || true
  { "$ADB" shell "run-as $APP sh -c 'rm -rf app_webview shared_prefs files/opengym-state*.json'" \
    && "$ADB" exec-in run-as "$APP" tar -xf - < "$SNAP/app.tar"; } \
    && { echo "journey check: the app's own data is back" >&2; rm -rf "${SNAP:?}"; } \
    || echo "journey check: COULD NOT put the app's data back; it is saved at $SNAP/app.tar (hevier/ux/JOURNEYS.md, restore)" >&2
  "$ADB" shell monkey -p "$APP" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
}
cleanup() {
  # J7 sets the system's font scale; a run stopped in the middle of it leaves 1.0 all the same
  # (only on the emulator checked above: SNAP is set once it is).
  [[ -z "$SNAP" || " ${JOURNEYS[*]} " != *" J7 "* ]] || "$ADB" shell settings put system font_scale 1.0 >/dev/null 2>&1 || true
  restore
  # The snapshot stays only when it could not go back (said above); a run's own files go.
  [[ -z "$RUN" ]] || rm -rf "${RUN:?}"
  [[ -z "$BOOTED" ]] || "$HOME/.claude/bin/emu" down "$ANDROID_SERIAL" >/dev/null 2>&1 || true
}
trap cleanup EXIT
if [[ -z ${ANDROID_SERIAL:-} ]]; then
  [[ -n "$BUILD" ]] || { echo "journey check: set ANDROID_SERIAL to an emulator this repo booted (~/.claude/bin/emu list), or use --build" >&2; exit 2; }
  ANDROID_SERIAL="$("$HOME/.claude/bin/emu" up)" || { echo "journey check: no emulator could be booted (~/.claude/bin/emu list)" >&2; exit 2; }
  BOOTED=1
elif ! "$HOME/.claude/bin/emu" mine "$ANDROID_SERIAL"; then
  echo "journey check: $ANDROID_SERIAL was not booted from this repo (~/.claude/bin/emu list)" >&2; exit 2
fi
export ANDROID_SERIAL
if [[ -n "$BUILD" ]]; then
  hevier/tools/emulator.sh >/tmp/hevier-journey-check-build.log 2>&1 \
    || { echo "journey check: the debug build failed, see /tmp/hevier-journey-check-build.log" >&2; exit 2; }
  # cap sync rewrites these in place; the tree stays as committed.
  git checkout -- frontend/android/app/capacitor.build.gradle frontend/android/capacitor.settings.gradle frontend/ios/App/Podfile 2>/dev/null || true
  (cd frontend/android && ./gradlew --stop >/dev/null 2>&1) || true
fi
"$ADB" get-state >/dev/null 2>&1 || { echo "journey check: $ANDROID_SERIAL is not reachable (hevier/tools/emulator.sh, or --build)" >&2; exit 2; }
# The bundle the APK holds, which the driver finds on the device or refuses to run.
APK="$ROOT/frontend/android/app/build/outputs/apk/sideload/debug/app-sideload-debug.apk"
[[ -s "$APK" ]] && JOURNEY_BUNDLE="$(unzip -p "$APK" assets/public/index.html 2>/dev/null | grep -o 'index-[A-Za-z0-9_-]*\.js' | head -1)" && export JOURNEY_BUNDLE

# The app's own data first (JOURNEYS.md, "Snapshot the app first"); a fresh folder per run. The
# snapshot is kept outside RUN so a failed restore leaves it to put back by hand.
RUN="$(mktemp -d -t journeys-XXXXXX)"
SNAP="$(mktemp -d -t journeys-snap-XXXXXX)"
"$ADB" shell am force-stop "$APP"
"$ADB" exec-out "run-as $APP tar -cf - files shared_prefs app_webview 2>/dev/null" > "$SNAP/app.tar"
tar -tf "$SNAP/app.tar" >/dev/null 2>&1 || { echo "journey check: the snapshot of the app is not a readable archive (is the debug app installed?)" >&2; SNAP=""; exit 2; }

load_profile() {   # $1: the archive
  "$ADB" shell am force-stop "$APP"
  # Extracting only adds and replaces: the WebView's storage and the state file go first (routine-check.sh).
  { "$ADB" shell "run-as $APP sh -c 'rm -rf app_webview shared_prefs files/opengym-state*.json'" \
    && "$ADB" exec-in run-as "$APP" tar -xf - < "$1"; } \
    || { echo "journey check: could not restore $1 into $APP" >&2; exit 2; }
  # Send to Hevy (D34) posts to the owner's real account: a profile with it on is never run.
  if "$ADB" exec-out run-as "$APP" cat files/hevier-hevy-export.json 2>/dev/null | grep -qE '"on" *: *true'; then
    echo "journey check: Send to Hevy is on in $1: not run (turn it off in that profile first)" >&2; exit 2
  fi
}
launch() { "$ADB" shell monkey -p "$APP" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1; sleep 6; }

if [[ -n "$MAKE" ]]; then
  # The app as it is, then the owner's backup over it (Replace), saved as the owner profile.
  launch
  node hevier/tools/journey-check.mjs import "$BACKUP"
  load_check() { "$ADB" exec-out run-as "$APP" cat files/hevier-hevy-export.json 2>/dev/null | grep -qE '"on" *: *true'; }
  if load_check; then echo "journey check: Send to Hevy is on in this app: no owner profile made" >&2; exit 2; fi
  sleep 4   # the debounced save and the phone file
  "$ADB" shell am force-stop "$APP"
  mkdir -p "$CACHE"
  "$ADB" exec-out "run-as $APP tar -cf - files shared_prefs app_webview 2>/dev/null" > "$RUN/owner.tar"
  tar -tf "$RUN/owner.tar" >/dev/null || { echo "journey check: the owner profile is not a readable archive: not kept" >&2; exit 2; }
  cp "$RUN/owner.tar" "$OWNER_PROFILE"
  echo "journey check: owner profile kept at $OWNER_PROFILE"
  exit 0
fi

mkdir -p "$BASES"
status=0
for j in "${JOURNEYS[@]}"; do
  load_profile "$(profile_of "$j")"
  launch
  base="$BASES/$j.json" out="$RUN/$j.json"
  args=(run "$j" "$out")
  [[ -n "$ACCEPT" || ! -s "$base" ]] || args+=(--base "$base")
  code=0
  node hevier/tools/journey-check.mjs "${args[@]}" || code=$?
  [[ $code -ne 2 ]] || { echo "journey check: $j could not run" >&2; status=2; continue; }
  if [[ -n "$ACCEPT" || ! -s "$base" ]]; then
    # A first run keeps its facts only when every check passed; --accept keeps them anyway.
    if [[ -n "$ACCEPT" || $code -eq 0 ]]; then
      node -e 'const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); require("fs").writeFileSync(process.argv[2], JSON.stringify(r.facts, null, 2) + "\n")' "$out" "$base"
      echo "journey check: $j's baseline kept at $base"
    fi
  fi
  [[ $code -eq 0 || $status -eq 2 ]] || status=1
done
[[ $status -ne 1 ]] || echo "journey check: a journey failed or differs. Meant? hevier/tools/journey-check.sh --accept <J>" >&2
exit $status
