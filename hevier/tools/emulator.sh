#!/usr/bin/env bash
# Build the fork's debug APK, boot the Android 16 emulator, install and launch the app.
#
#   hevier/tools/emulator.sh            # build + boot + install + launch
#   hevier/tools/emulator.sh --no-build # reinstall the last APK
#
# Mirrors `npm run build:mobile` in frontend/package.json. If upstream changes that script,
# change this one the same way (hevier/CONFLICTS.md, "silent drift").
#
# One-time setup this expects (user-local, no sudo):
#   Node 22         ~/.local/opt/node        (or on PATH)
#   JDK 21          ~/.local/opt/jdk21       (or JAVA_HOME; a JRE is not enough)
#   Android SDK     ~/Android/Sdk with platform-tools, emulator, platforms;android-35,
#                   build-tools;35.0.0, system-images;android-36;google_apis;x86_64
#   AVD             xperia1vi_api36 (1080x2340, 420 dpi, like the Xperia 1 VI)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export JAVA_HOME="${JAVA_HOME:-$HOME/.local/opt/jdk21}"
export PATH="$HOME/.local/opt/node/bin:$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
AVD="${AVD:-xperia1vi_api36}"
APP_ID="${APP_ID:-ch.duartesantos.opengym.hevier.test}"   # hevier.gradle id + debug .test suffix
APK="$ROOT/frontend/android/app/build/outputs/apk/debug/app-debug.apk"

# Fork build flags (hevier/PLAN.md §1.4). Harmless before the overlay exists.
export VITE_MOBILE=1 VITE_HEVIER="${VITE_HEVIER:-1}" VITE_UPDATE_REPO="${VITE_UPDATE_REPO:-lodepav/openGym-Hevier}"

if [[ "${1:-}" != "--no-build" ]]; then
  cd "$ROOT/frontend"
  [[ -d node_modules ]] || npm ci
  npx vite build
  node ../scripts/catalogue/stage-media.mjs dist
  npx cap sync
  node scripts/check-mobile-bundle.mjs
  (cd android && ./gradlew assembleDebug -q)
fi

if ! adb get-state >/dev/null 2>&1; then
  echo "booting $AVD..."
  nohup "$ANDROID_HOME/emulator/emulator" -avd "$AVD" -no-audio -no-boot-anim \
    ${HEADLESS:+-no-window} -gpu swiftshader_indirect >/tmp/hevier-emulator.log 2>&1 &
  adb wait-for-device
fi
adb shell 'while [ "$(getprop sys.boot_completed)" != 1 ]; do sleep 2; done'

adb install -r "$APK"
adb shell monkey -p "$APP_ID" -c android.intent.category.LAUNCHER 1 >/dev/null
echo "launched $APP_ID — drive it with: node hevier/tools/cdp.mjs text"
