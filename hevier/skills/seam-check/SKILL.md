---
name: seam-check
description: Check that the fork edits upstream files only at marked [hevier] seams listed in hevier/SEAMS.md. Use before committing any change outside frontend/src/hevier/ and hevier/, and after an upstream merge.
---

# Seam check

Fork rule 1: an upstream file is edited only at a seam: a short hook between `[hevier]`
markers, with a row in `hevier/SEAMS.md`.

1. List the upstream files the change touches (anything outside `hevier/` and
   `frontend/src/hevier/`):
   ```bash
   git diff --name-only HEAD -- . ':!hevier' ':!frontend/src/hevier'          # uncommitted
   git diff --name-only main...HEAD -- . ':!hevier' ':!frontend/src/hevier'   # whole fork
   ```
2. For each file, read its diff (`git diff main...HEAD -- <file>`, plus the working tree)
   and check that:
   - every added or changed line sits on, or right next to, a `[hevier] <id>` marker comment;
   - the seam id has a row in `hevier/SEAMS.md` naming this file;
   - nothing is in `frontend/src/lib/`, `frontend/src/store/`, `api/` or `mcp/` (except
     `lib/update.js`, seam S6, `lib/back.js`, seam S16, and seam S18's unmarked lines in
     `lib/health-connect.js` and `lib/sync-merge.js`, upstream's own v1.4.3 lines backported word for word). Logic changes there break rule 2:
     move them to a wrapper in `frontend/src/hevier/lib/` with a test beside it.
3. Also flag rows in SEAMS.md whose marker no longer exists:
   ```bash
   git grep -n '\[hevier\]' -- . ':!hevier' ':!frontend/src/hevier'
   ```
   Compare the ids found with the table's ids, both ways.
4. Allowed without a seam: `.gitignore` lines for fork-only paths.

Report a table: file · seam id · OK / undeclared lines (with line numbers) / missing row.
Fix an undeclared edit by moving it behind a marker, or into a fork file, and adding the row
in the same commit.
