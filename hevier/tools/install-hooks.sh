#!/usr/bin/env bash
# Once a clone: git runs hevier/hooks (pre-push: verify.sh; commit-msg: merge subjects).
# A branch without hevier/hooks (an upstream PR's) simply has no hooks.
set -euo pipefail
git config core.hooksPath hevier/hooks
echo "hooks on: $(git config core.hooksPath)"
