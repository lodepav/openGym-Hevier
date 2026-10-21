#!/usr/bin/env bash
# Builds the pretend heart-rate strap (D79's test rig) with the SDK's own tools, no Gradle, and
# with DEVICE set installs it, grants its Bluetooth permissions and starts it there:
#   DEVICE=emulator-5556 hevier/tools/fake-strap/build.sh [am start extras…]
# The APK goes to $OUT (default: a temporary folder) and is never part of the app.
set -euo pipefail
cd "$(dirname "$0")"
SDK=${ANDROID_HOME:-$HOME/Android/Sdk}
BT=$SDK/build-tools/$(ls "$SDK/build-tools" | sort -V | tail -1)
JAR=$SDK/platforms/android-35/android.jar
export JAVA_HOME=${JAVA_HOME:-$HOME/.local/opt/jdk21}
export PATH=$JAVA_HOME/bin:$PATH
OUT=${OUT:-$(mktemp -d)}
rm -rf "$OUT/classes" && mkdir -p "$OUT/classes"
javac -nowarn --release 17 -classpath "$JAR" -d "$OUT/classes" src/ch/hevier/fakestrap/*.java 2>&1 | grep -v '^Note:' || true
"$BT/d8" --min-api 31 --lib "$JAR" --output "$OUT" $(find "$OUT/classes" -name '*.class')
"$BT/aapt2" link -I "$JAR" --manifest AndroidManifest.xml -o "$OUT/base.apk"
(cd "$OUT" && zip -q -j base.apk classes.dex)
"$BT/zipalign" -f 4 "$OUT/base.apk" "$OUT/aligned.apk"
KS=$HOME/.android/debug.keystore
"$BT/apksigner" sign --ks "$KS" --ks-pass pass:android --key-pass pass:android --out "$OUT/fake-strap.apk" "$OUT/aligned.apk"
echo "$OUT/fake-strap.apk"
if [ -n "${DEVICE:-}" ]; then
  ADB=$SDK/platform-tools/adb
  "$ADB" -s "$DEVICE" install -r -g "$OUT/fake-strap.apk" >/dev/null
  "$ADB" -s "$DEVICE" shell svc bluetooth enable || true
  "$ADB" -s "$DEVICE" shell am force-stop ch.hevier.fakestrap
  "$ADB" -s "$DEVICE" shell am start -n ch.hevier.fakestrap/.Main "$@" >/dev/null
  echo "started on $DEVICE"
fi
