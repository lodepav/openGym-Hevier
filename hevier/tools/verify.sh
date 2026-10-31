#!/usr/bin/env bash
# The check that guards hevier/main: no conflict marker, the seams, the decision index,
# the release tools' tests, the whole test suite and the fork's build. The pre-push hook
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
diff <(hevier/tools/decision-index.sh) hevier/DECISIONS-INDEX.md || {
  echo "verify: run hevier/tools/decision-index.sh > hevier/DECISIONS-INDEX.md" >&2
  exit 1
}
node --test hevier/tools/*.test.mjs >/dev/null
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
