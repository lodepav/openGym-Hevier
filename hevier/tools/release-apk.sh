#!/usr/bin/env bash
# Build, sign and check the fork's release APKs, then publish them as a GitHub release.
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
# commits them, and once the APKs have passed the checks tags the commit gohevier-vX.Y.Z (upstream's vX.Y.Z tags
# share the repo) and publishes it.
#
# Each release has two APKs (D115):
#   go-hevier-X.Y.Z.apk        lean, without the exercise pictures: what the app's updater
#                              downloads (it takes the first standard APK by name, and this one
#                              sorts first). The app downloads the pictures once into its storage.
#   go-hevier-full-X.Y.Z.apk   the same build with the pictures inside, for a first install offline.
# The pictures (180 px, from catalogue/media) go into go-hevier-media-<version>.zip
# (hevier/tools/media-zip.mjs), whose version is a hash of its content. It is published once per
# media version, in a GitHub release of its own (gohevier-media-<version>, a prerelease that is
# never "latest", so latest stays the app release the updater reads); a release whose pictures did
# not change reuses it. Its URL, SHA-256 and size are built into the app as VITE_HEVIER_MEDIA.
#
# Publishing: the media release first if it is missing, then the tag push and the app release with
# both APKs and their .sha256 files. The APKs are kept nowhere else: they are built in a temporary
# folder, deleted at the end. A publish that fails takes the tag back, so the same version can be
# run again (keep).
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

# Takes the local tag back (and the pushed one, if it got that far), so the version can run again.
untag() {  # tag
  git push -q origin ":refs/tags/$1" 2>/dev/null || true
  git tag -d "$1" >/dev/null
}

# The pictures' own release (D115), once per media version: the zip and its SHA-256 under
# gohevier-media-<version>, a prerelease and never "latest". Skipped when it already exists.
publish_media() {
  [[ -n "$MEDIA_PUBLISHED" ]] && { echo "pictures $MEDIA_VER already published"; return 0; }
  if gh release create "$MEDIA_TAG" "$MEDIA_ZIP" "$MEDIA_ZIP.sha256" -R "$REPO" --prerelease --latest=false \
      --title "Go Hevier exercise pictures $MEDIA_VER" \
      --notes "The exercise pictures (180 px) that the lean Go Hevier APK downloads once and keeps across updates; not an app release. Licensed from Gym visual for openGym, see NOTICE.md inside."; then
    return 0
  fi
  # This run found no release: a half-made one (created, upload failed) is its own, and would be
  # taken for a whole one next time.
  gh release delete "$MEDIA_TAG" -R "$REPO" --yes --cleanup-tag >/dev/null 2>&1 || true
  return 1
}

# The GitHub release the updater reads (S6, D52): the lean APK first, then the full one, each with
# its SHA-256, under gohevier-vX.Y.Z.
publish() {  # version, lean apk, full apk
  local ver="$1" lean="$2" full="$3" tag="gohevier-v$1" name="go-hevier-$1.apk" fname="go-hevier-full-$1.apk" dir up notes digest apk mb
  for apk in "$lean" "$full"; do
    digest="$("${BT}apksigner" verify --print-certs "$apk" | sed -n 's/^Signer #1 certificate SHA-256 digest: //p')"
    grep -v '^#' "${HEVIER_CERT:-$(dirname "$KS")/apk-cert.txt}" 2>/dev/null | grep -q "^$digest" \
      || { echo "$apk is not signed with the pinned release key" >&2; untag "$tag"; return 1; }
  done
  dir="$(mktemp -d)"
  cp "$lean" "$dir/$name"
  cp "$full" "$dir/$fname"
  (cd "$dir" && sha256sum "$name" > "$name.sha256" && sha256sum "$fname" > "$fname.sha256")
  mb=$(( (MEDIA_BYTES + 524288) / 1048576 ))
  up="$(git show "$tag:frontend/package.json" | node -p 'JSON.parse(require("fs").readFileSync(0)).version')"
  notes="Go Hevier $ver, based on openGym $up."$'\n\n'"$(node hevier/tools/release-notes.mjs notes "$tag")"
  notes+=$'\n\nInstall go-hevier-'"$ver"'.apk, or update from Settings → About & updates. It downloads the exercise pictures once (about '"$mb"' MB) and keeps them across updates.'
  notes+=$'\n\ngo-hevier-full-'"$ver"'.apk carries the pictures inside, for a first install without a connection. Each download is checked against its .sha256 file.'
  echo; echo "$notes"; echo
  # The pre-push hook may run the whole suite: without this build's flags, which upstream's tests
  # do not expect (the release commit's fixture is not a doc, so the earlier pass does not cover it).
  [[ "$(git branch --show-current)" == hevier/main ]] && env -u VITE_MOBILE -u VITE_HEVIER -u VITE_HEVIER_MEDIA -u VITE_UPDATE_REPO git push -q origin hevier/main
  # The pictures before the app's tag: an app release must never point at a zip that is not there.
  publish_media || {
    rm -rf "$dir"
    echo "publishing the pictures failed: nothing published, the tag is taken back; run again and keep $ver" >&2
    untag "$tag"
    return 1
  }
  if git push -q origin "$tag" && gh release create "$tag" "$dir/$name" "$dir/$name.sha256" "$dir/$fname" "$dir/$fname.sha256" -R "$REPO" \
      --verify-tag --latest --title "Go Hevier $ver" --notes "$notes"; then
    rm -rf "$dir"
    return 0
  fi
  rm -rf "$dir"
  echo "publishing failed: the tag is taken back; run again and keep $ver" >&2
  untag "$tag"
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
OUT="$TMP/go-hevier-$VER.apk" FULL="$TMP/go-hevier-full-$VER.apk"

# The pictures' zip and its version (D115), from the 180 px media alone: APP_MEDIA_DIR and
# VITE_CLIP_EXT are cleared so nothing larger can ever go into a file that is published as it is.
env -u APP_MEDIA_DIR -u VITE_CLIP_EXT node scripts/catalogue/stage-media.mjs "$TMP/stage"
MEDIA="$(node hevier/tools/media-zip.mjs "$TMP/stage" "$TMP/media" "$REPO")"
rm -rf "$TMP/stage"
MEDIA_ZIP="$(node -p 'JSON.parse(process.argv[1]).file' "$MEDIA")"
MEDIA_VER="$(node -p 'JSON.parse(process.argv[1]).version' "$MEDIA")"
MEDIA_BYTES="$(node -p 'JSON.parse(process.argv[1]).bytes' "$MEDIA")"
# Already published (the pictures did not change): the build takes that zip's SHA-256 and size, as
# the phone downloads that zip, not the one just made. The version is a hash of the content, so
# both hold the same pictures; their bytes can still differ (another zip tool on this machine).
MEDIA_TAG="gohevier-media-$MEDIA_VER"
if ! out="$(gh release view "$MEDIA_TAG" -R "$REPO" 2>&1 >/dev/null)"; then
  grep -qi 'not found' <<<"$out" || { echo "cannot read $MEDIA_TAG: $out" >&2; exit 1; }
  MEDIA_PUBLISHED=
else
  MEDIA_PUBLISHED=1
  pub_bytes="$(gh release view "$MEDIA_TAG" -R "$REPO" --json assets -q ".assets[] | select(.name == \"$(basename "$MEDIA_ZIP")\") | .size")"
  pub_sha="$(gh release download "$MEDIA_TAG" -R "$REPO" -p "$(basename "$MEDIA_ZIP").sha256" -O - | cut -d' ' -f1)"
  [[ "$pub_bytes" =~ ^[0-9]+$ && "$pub_sha" =~ ^[0-9a-f]{64}$ ]] \
    || { echo "$MEDIA_TAG lacks its zip or .sha256: fix or delete it on GitHub" >&2; exit 1; }
  MEDIA="$(node -p 'JSON.stringify({ ...JSON.parse(process.argv[1]), sha256: process.argv[2], bytes: +process.argv[3] })' "$MEDIA" "$pub_sha" "$pub_bytes")"
  MEDIA_BYTES="$pub_bytes"
fi
echo "pictures $MEDIA_VER: $(basename "$MEDIA_ZIP"), $MEDIA_BYTES bytes${MEDIA_PUBLISHED:+, already published}"

# The bundle as emulator.sh builds it (upstream's build:mobile), then the release builds.
# nice and few workers: a full-speed build has hung this machine.
# VITE_HEVIER_MEDIA is the media-zip.mjs line without its local file path (media-pack.js).
VITE_HEVIER_MEDIA="$(node -p 'const { file, ...m } = JSON.parse(process.argv[1]); JSON.stringify(m)' "$MEDIA")"
export VITE_MOBILE=1 VITE_HEVIER=1 VITE_UPDATE_REPO="$REPO" VITE_HEVIER_MEDIA
# RELEASE_KS_PASS (set by ~/.local/bin/release-apks) signs without a prompt; unset, it is asked
# once here, for both APKs.
if [[ -z "${RELEASE_KS_PASS:-}" ]]; then read -rsp "Keystore password for $KS: " RELEASE_KS_PASS; echo; export RELEASE_KS_PASS; fi
PASS=(--ks-pass env:RELEASE_KS_PASS)
# The sideload flavour (upstream 1.4.2): the APK with the updater; "play" is Google Play's.
TASK=assembleSideloadRelease; UNSIGNED=android/app/build/outputs/apk/sideload/release/app-sideload-release-unsigned.apk
assemble() {  # signed apk to write; run in frontend/
  # A fresh package each time: an incremental one keeps the full build's space inside the file.
  rm -f "$UNSIGNED"
  (cd android && nice -n 19 ../../hevier/tools/heavy.sh ./gradlew "$TASK" -q --max-workers=2)
  "${BT}zipalign" -f -p 4 "$UNSIGNED" "$TMP/aligned.apk"
  echo "signing $(basename "$1") with $KS ($ALIAS)"
  "${BT}apksigner" sign --ks "$KS" --ks-key-alias "$ALIAS" "${PASS[@]}" --out "$1" "$TMP/aligned.apk"
  rm -f "$1.idsig" "$TMP/aligned.apk"
  echo "signed"
}
cd frontend
nice -n 19 ../hevier/tools/heavy.sh npx vite build

# The full APK: the pictures inside, as before.
node ../scripts/catalogue/stage-media.mjs dist
npx cap sync
node scripts/check-mobile-bundle.mjs
wait "$WARM" || true
assemble "$FULL"
unzip -Z1 "$FULL" | grep -x 'assets/public/exercise-media/NOTICE.md' >/dev/null \
  || { echo "$(basename "$FULL") has no exercise pictures" >&2; exit 1; }

# The lean APK: the same bundle without them. cap sync copies dist/ into the Android assets, so
# they must be gone from there too.
rm -rf dist/exercise-media
npx cap sync
[[ ! -e android/app/src/main/assets/public/exercise-media ]] \
  || { echo "cap sync left exercise-media in the Android assets" >&2; exit 1; }
node scripts/check-mobile-bundle.mjs
assemble "$OUT"
if unzip -Z1 "$OUT" | grep '^assets/public/exercise-media/' >/dev/null; then
  echo "$(basename "$OUT") still carries exercise pictures" >&2; exit 1
fi

# Free the daemon's memory now: a second app's release may run right after this one.
(cd android && ./gradlew --stop -q) >/dev/null 2>&1 || true
# cap sync rewrites these in place; a release check needs the tree as committed.
git -C "$ROOT" checkout -q -- frontend/android/capacitor.settings.gradle frontend/android/app/capacitor.build.gradle frontend/ios 2>/dev/null || true

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
# Both APKs pass the APK gates, or nothing is tagged.
REST_OK=1
hevier/tools/release-check.sh --no-sources --no-build --apk "$OUT" || REST_OK=
hevier/tools/release-check.sh --no-sources --no-build --apk "$FULL" || REST_OK=
[[ -n "$SRC_OK" && -n "$REST_OK" ]] || {
  echo; echo "release check failed: nothing tagged or published" >&2; exit 1; }

git tag -a "gohevier-v$VER" -m "Go Hevier $VER" && echo "tagged gohevier-v$VER"
publish "$VER" "$OUT" "$FULL"
echo "published: https://github.com/$REPO/releases/tag/gohevier-v$VER"
