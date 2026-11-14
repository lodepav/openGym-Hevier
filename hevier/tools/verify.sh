#!/usr/bin/env bash
# The check that guards hevier/main: no conflict marker, the seams, the decision index,
# the release tools' tests, the whole test suite and the fork's build, and for what changed
# the api and mcp suites, the locale check and the fork's Java tests. The pre-push hook
# and the release run this; see the verify skill.
#
#   hevier/tools/verify.sh    # about 3.5 minutes
#
# A pass on a clean tree is remembered by commit, so pushing what was just checked doesn't
# check it again, nor does a later commit that only touches docs or hevier/VERSION.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export PATH="$HOME/.local/opt/node/bin:$PATH"
cd "$ROOT"
STAMP="$(git rev-parse --path-format=absolute --git-common-dir)/hevier-verified"
clean() { [[ -z "$(git status --porcelain)" ]]; }

# git doesn't carry core.hooksPath over a clone: without it nothing guards hevier/main.
if [[ -z "${CI:-}" && "$(git config core.hooksPath)" != hevier/hooks ]]; then
  echo "verify: warning: the hooks are off in this clone; run hevier/tools/install-hooks.sh" >&2
fi

already_checked() {
  clean && [[ -f "$STAMP" ]] || return 1
  local last
  last="$(cat "$STAMP")"
  git merge-base --is-ancestor "$last" HEAD 2>/dev/null || return 1
  ! git diff --name-only "$last" HEAD | grep -qvE '\.md$|^hevier/VERSION$'
}
if already_checked; then
  echo "verify: passed at $(git rev-parse --short "$(cat "$STAMP")"), and only docs changed since"
  exit 0
fi

# One shipped in DECISIONS.md once (658d4cab).
if git grep -nE '^(<{7}|>{7}|\|{7})( |$)' -- . ':!hevier/CONFLICTS.md'; then
  echo "verify: a conflict marker was left behind" >&2
  exit 1
fi
python3 hevier/tools/seam_check.py
hevier/tools/sibling_check.sh
diff <(hevier/tools/decision-index.sh) hevier/DECISIONS-INDEX.md || {
  echo "verify: run hevier/tools/decision-index.sh > hevier/DECISIONS-INDEX.md" >&2
  exit 1
}
node --test hevier/tools/*.test.mjs >/dev/null

# What changed since the last pass, working tree included; without one, the last commit (a
# merge into hevier/main brings its whole branch). The steps below run only for their files.
base="$(cat "$STAMP" 2>/dev/null || true)"
# A stamp from another branch (worktrees share it): from where the two parted, not the last commit.
base="$(git merge-base "$base" HEAD 2>/dev/null || echo 'HEAD^')"
changed="$(git diff --name-only --no-renames "$base"; git ls-files --others --exclude-standard)"
touched() { grep -qE "$1" <<<"$changed"; }
# CI has no stamp and sees only a push's last commit, so there the two small suites always run.
if [[ -n "${CI:-}" ]] || touched '^api/'; then (cd api && "$ROOT/hevier/tools/heavy.sh" npm test); fi
if [[ -n "${CI:-}" ]] || touched '^mcp/'; then (cd mcp && "$ROOT/hevier/tools/heavy.sh" npm test); fi
if touched '^frontend/src/locales/'; then (cd frontend && node scripts/check-locales.mjs); fi
if touched '^frontend/android/'; then
  if [[ -n "${CI:-}" ]]; then
    echo "verify: the Android project changed; the fork's Java tests are skipped in CI, which has no Android SDK"
  # A worktree that never ran `cap sync` has no generated Gradle files; the push from the main
  # checkout runs them.
  elif [[ ! -e frontend/android/capacitor-cordova-android-plugins/cordova.variables.gradle ]]; then
    echo "verify: the Android project changed; the fork's Java tests are skipped here, the Android project is not synced (cap sync)"
  else
    (cd frontend/android && JAVA_HOME="$HOME/.local/opt/jdk21" ANDROID_HOME="$HOME/Android/Sdk" \
      "$ROOT/hevier/tools/heavy.sh" ./gradlew -q :app:testSideloadDebugUnitTest :app:compileSideloadReleaseJavaWithJavac)
  fi
fi

cd frontend
# Fewer workers beside the emulator (the verify skill).
workers=4
pgrep -x qemu-system-x86 >/dev/null && workers=2
"$ROOT/hevier/tools/heavy.sh" npx vitest run --config src/hevier/build/vitest-fast.config.js --maxWorkers="$workers"
VITE_HEVIER=1 "$ROOT/hevier/tools/heavy.sh" npx vite build --logLevel error
cd "$ROOT"
# The build's output is ignored, so this says whether the tree was clean all along.
if clean; then git rev-parse HEAD > "$STAMP"; fi
echo "verify: passed"
