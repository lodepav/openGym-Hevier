#!/usr/bin/env bash
# Build, sign and check the fork's release APK, then publish it as a GitHub release.
#
#   hevier/tools/release-apk.sh
#
# Needs the release keystore made once
# with keytool (~/.config/hevier/release.keystore, alias hevier) and asks for its password when
# signing. The first run pins the key's certificate in ~/.config/hevier/apk-cert.txt, beside the
# keystore (D38): nothing about the key is committed or pushed.
#
# It numbers the release from what was merged since the last one (hevier/tools/release-notes.mjs,
# D52): a merge that adds a decision raises the minor, anything else the patch; it shows the notes
# and asks only to go ahead or make it a major. It writes hevier/VERSION and hevier/CHANGELOG.md and
# commits them, and once the APK has passed the checks tags the commit gohevier-vX.Y.Z (upstream's vX.Y.Z tags
# share the repo) and publishes it: pushes the tag and creates the GitHub release with the APK and
# its .sha256, which is what the app's updater downloads and verifies. The APK is kept nowhere
# else: it is built in a temporary folder, deleted at the end. A publish that fails takes the tag
# back, so the same version can be run again (keep).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
KS="${KS:-$HOME/.config/hevier/release.keystore}"
ALIAS="${ALIAS:-hevier}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export JAVA_HOME="${JAVA_HOME:-$HOME/.local/opt/jdk21}"
export PATH="$HOME/.local/opt/node/bin:$JAVA_HOME/bin:$PATH"
BT="$(ls -d "$ANDROID_HOME"/build-tools/*/ | sort -V | tail -1)"

REPO="${VITE_UPDATE_REPO:-lodepav/openGym-Hevier}"
cd "$ROOT"

# The GitHub release the updater reads (S6, D52): the APK and its SHA-256, under gohevier-vX.Y.Z.
publish() {  # version, apk
  local ver="$1" apk="$2" tag="gohevier-v$1" name="go-hevier-$1.apk" dir prev up notes digest
  digest="$("${BT}apksigner" verify --print-certs "$apk" | sed -n 's/^Signer #1 certificate SHA-256 digest: //p')"
  grep -v '^#' "${HEVIER_CERT:-$(dirname "$KS")/apk-cert.txt}" 2>/dev/null | grep -q "^$digest" \
    || { echo "$apk is not signed with the pinned release key" >&2; return 1; }
  dir="$(mktemp -d)"
  cp "$apk" "$dir/$name"
  (cd "$dir" && sha256sum "$name" > "$name.sha256")
  up="$(git show "$tag:frontend/package.json" | node -p 'JSON.parse(require("fs").readFileSync(0)).version')"
  notes="Go Hevier $ver, based on openGym $up."$'\n\n'"$(node hevier/tools/release-notes.mjs notes "$tag")"
  notes+=$'\n\nInstall the APK, or update from Settings → About & updates. The download is checked against go-hevier-'"$ver"'.apk.sha256.'
  echo; echo "$notes"; echo
  [[ "$(git branch --show-current)" == hevier/main ]] && git push -q origin hevier/main
  if git push -q origin "$tag" && gh release create "$tag" "$dir/$name" "$dir/$name.sha256" -R "$REPO" \
      --verify-tag --latest --title "Go Hevier $ver" --notes "$notes"; then
    rm -rf "$dir"
    return 0
  fi
  rm -rf "$dir"
  echo "publishing failed: the tag is taken back; run again and keep $ver" >&2
  git push -q origin ":refs/tags/$tag" 2>/dev/null || true
  git tag -d "$tag" >/dev/null
  return 1
}

[[ -f "$KS" ]] || { echo "no keystore at $KS: make it with keytool first" >&2; exit 2; }
[[ -z "$(git status --porcelain)" ]] || { echo "uncommitted changes: a release is built from a commit" >&2; exit 2; }
# release-notes.mjs numbers the release and writes its notes: its tests (and supply-chain.mjs's)
# before it is trusted with either. release-check.sh runs them again with the other gates.
node --test hevier/tools/*.test.mjs >/dev/null || { echo "the release tools' tests fail: node --test hevier/tools/*.test.mjs" >&2; exit 2; }
hevier/tools/verify.sh || { echo "the checks fail: nothing released" >&2; exit 2; }
# Gradle's daemon takes about 40 s to start: start it now, while the notes are read, so the build
# below finds it running (the build waits for this first: a busy daemon would make it start another).
(cd frontend/android && nice -n 19 ./gradlew help -q --max-workers=2) >/dev/null 2>&1 & WARM=$!

# The version: from the merges since the last release, or the one an earlier run committed and
# did not get published (TAKEN empty), which is released as it is.
VER="$(tr -d '[:space:]' < hevier/VERSION)"
UP="$(node -p "require('./frontend/package.json').version")"
git rev-parse -q --verify "refs/tags/gohevier-v$VER" >/dev/null && TAKEN=1 || TAKEN=
if [[ -z "$TAKEN" ]]; then
  echo "Go Hevier $VER is committed but not released: releasing it as it is"
  node hevier/tools/release-notes.mjs notes HEAD
else
  NEXT="$(node hevier/tools/release-notes.mjs next)"
  NEW="$(node -p 'JSON.parse(process.argv[1]).version || ""' "$NEXT")"
  [[ -n "$NEW" ]] || { echo "nothing merged since gohevier-v$VER: nothing to release" >&2; exit 2; }
  echo; echo "Go Hevier $NEW (was $VER), based on openGym $UP"; echo
  node -p 'JSON.parse(process.argv[1]).notes' "$NEXT"; echo
  IFS=. read -r MA _ _ <<< "$VER"
  read -rp "Release $NEW? [Enter] yes · [M] make it $((MA+1)).0.0 · [q] quit: " go
  case "$go" in
    '') ;;
    M) NEXT="$(node hevier/tools/release-notes.mjs next --major)"; NEW="$((MA+1)).0.0" ;;
    *) echo "nothing released" >&2; exit 2 ;;
  esac
  git rev-parse -q --verify "refs/tags/gohevier-v$NEW" >/dev/null && { echo "gohevier-v$NEW is already tagged" >&2; exit 2; }
  echo "$NEW" > hevier/VERSION
  node --input-type=module -e '
    import { prependChangelog } from "./hevier/tools/release-notes.mjs"
    import { readFileSync, writeFileSync, existsSync } from "node:fs"
    const [ver, date, up, json] = process.argv.slice(1), f = "hevier/CHANGELOG.md"
    writeFileSync(f, prependChangelog(existsSync(f) ? readFileSync(f, "utf8") : "", ver, date, up, JSON.parse(json).notes))
  ' "$NEW" "$(date +%F)" "$UP" "$NEXT"
  hevier/tools/upgrade-fixture.sh "$NEW"
  git add hevier/VERSION hevier/CHANGELOG.md "frontend/src/hevier/upgrade/fixtures/$NEW.json"
  git commit -q -m "hevier: Go Hevier $NEW" -- hevier/VERSION hevier/CHANGELOG.md "frontend/src/hevier/upgrade/fixtures/$NEW.json"
  VER="$NEW"
fi
TMP="$(mktemp -d)"
# The gates that read only the committed sources (git history, Trivy, npm packages) run while the
# APK builds; the rest run once it is signed (D26). Stopped too if the build fails.
nice -n 19 hevier/tools/release-check.sh --sources-only > "$TMP/sources.log" 2>&1 & SRC=$!
trap '[[ -n "$SRC" ]] && kill "$SRC" 2>/dev/null; wait; rm -rf "$TMP"' EXIT
OUT="$TMP/go-hevier-$VER.apk"

# The bundle as emulator.sh builds it (upstream's build:mobile), then the release build.
# nice and few workers: a full-speed build has hung this machine.
export VITE_MOBILE=1 VITE_HEVIER=1 VITE_UPDATE_REPO="$REPO"
cd frontend
nice -n 19 ../hevier/tools/heavy.sh npx vite build
node ../scripts/catalogue/stage-media.mjs dist
npx cap sync
node scripts/check-mobile-bundle.mjs
# The sideload flavour (upstream 1.4.2): the APK with the updater; "play" is Google Play's.
TASK=assembleSideloadRelease; UNSIGNED=android/app/build/outputs/apk/sideload/release/app-sideload-release-unsigned.apk
wait "$WARM" || true
(cd android && nice -n 19 ../../hevier/tools/heavy.sh ./gradlew "$TASK" -q --max-workers=2)
# Free the daemon's memory now: a second app's release may run right after this one.
(cd android && ./gradlew --stop -q) >/dev/null 2>&1 || true
# cap sync rewrites these in place; a release check needs the tree as committed.
git -C "$ROOT" checkout -q -- frontend/android/capacitor.settings.gradle frontend/android/app/capacitor.build.gradle frontend/ios 2>/dev/null || true

"${BT}zipalign" -f -p 4 "$UNSIGNED" "$TMP/aligned.apk"
echo "signing with $KS ($ALIAS)"
# RELEASE_KS_PASS (set by ~/.local/bin/release-apks) signs without a prompt; unset, apksigner asks.
PASS=(); [[ -n "${RELEASE_KS_PASS:-}" ]] && PASS=(--ks-pass env:RELEASE_KS_PASS)
"${BT}apksigner" sign --ks "$KS" --ks-key-alias "$ALIAS" "${PASS[@]}" --out "$OUT" "$TMP/aligned.apk"
rm -f "$OUT.idsig"
echo "signed"

# First release: pin this key's certificate (D38), on this machine only.
cd "$ROOT"
CERT="${HEVIER_CERT:-$(dirname "$KS")/apk-cert.txt}"
export HEVIER_CERT="$CERT"
DIGEST="$("${BT}apksigner" verify --print-certs "$OUT" | sed -n 's/^Signer #1 certificate SHA-256 digest: //p')"
if ! { [[ -f "$CERT" ]] && grep -v '^#' "$CERT" | grep -q .; }; then
  echo; echo "no certificate pinned yet. This APK's: $DIGEST"
  read -rp "Pin it as the fork's release key in $CERT? [y/N] " yn
  if [[ $yn == [yY]* ]]; then
    echo "$DIGEST  # Go Hevier release key ($ALIAS, $(date +%F))" >> "$CERT"
    chmod 600 "$CERT"
    echo "pinned in $CERT (not in the repo)"
  fi
fi

SRC_OK=1; wait "$SRC" || SRC_OK=
SRC=
cat "$TMP/sources.log"
REST_OK=1; hevier/tools/release-check.sh --no-sources --no-build --apk "$OUT" || REST_OK=
[[ -n "$SRC_OK" && -n "$REST_OK" ]] || {
  echo; echo "release check failed: nothing tagged or published" >&2; exit 1; }

git tag -a "gohevier-v$VER" -m "Go Hevier $VER" && echo "tagged gohevier-v$VER"
publish "$VER" "$OUT"
echo "published: https://github.com/$REPO/releases/tag/gohevier-v$VER"
