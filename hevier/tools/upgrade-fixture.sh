#!/usr/bin/env bash
# Writes frontend/src/hevier/upgrade/fixtures/<version>.json: what a release's own code saves,
# which frontend/src/hevier/upgrade/upgrade.test.jsx opens with the current code.
#
#   hevier/tools/upgrade-fixture.sh <version> [<commit>]   # the commit defaults to HEAD
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export PATH="$HOME/.local/opt/node/bin:$PATH"
VER="$1"
COMMIT="${2:-HEAD}"
OUT="$ROOT/frontend/src/hevier/upgrade/fixtures/$VER.json"
TMP="$(mktemp -d)"
cleanup() {
  git -C "$ROOT" worktree remove --force "$TMP/src" 2>/dev/null || true
  rm -rf "$TMP"
}
trap cleanup EXIT

git -C "$ROOT" worktree add -q --detach "$TMP/src" "$COMMIT"
mkdir -p "$TMP/src/frontend/src/hevier/upgrade" "$(dirname "$OUT")"
cp "$ROOT/frontend/src/hevier/upgrade/write-fixture.js" "$TMP/src/frontend/src/hevier/upgrade/write-fixture.test.js"
cd "$TMP/src/frontend"
# The release's own locked packages only if they differ: installing takes minutes.
if cmp -s package-lock.json "$ROOT/frontend/package-lock.json"; then
  ln -s "$ROOT/frontend/node_modules" node_modules
else
  npm ci --ignore-scripts --no-audit --no-fund >/dev/null
fi
FIXTURE_OUT="$OUT" "$ROOT/hevier/tools/heavy.sh" npx vitest run src/hevier/upgrade/write-fixture.test.js --reporter=dot >"$TMP/log" 2>&1 || {
  tail -30 "$TMP/log" >&2
  echo "upgrade-fixture: $VER failed" >&2
  exit 1
}
echo "wrote $OUT: $(node -p "JSON.stringify(JSON.parse(require('fs').readFileSync('$OUT')).facts)")"
