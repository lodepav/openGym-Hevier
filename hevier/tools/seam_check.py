#!/usr/bin/env python3
"""Checks hevier/SEAMS.md against the code (hevier/RULES.md).

    hevier/tools/seam_check.py            # exit 1 on a finding

  - a seam id on two rows, which merge=union lets through when two branches take the
    same next number: renumber the later one, in its row and its markers;
  - a [hevier] S<n> marker with no row, or a row no marker or path backs;
  - an upstream file the fork changed that neither has a marker nor is named on a row.
    Formatting-only churn counts: restore the file to upstream's.
"""
import fnmatch
import re
import subprocess
import sys

SEAMS = 'hevier/SEAMS.md'
FORK_OWNED = (':!hevier', ':!frontend/src/hevier', ':!frontend/android/app/src/hevier*', ':!frontend/public/hevier')
# Changed on purpose, nothing to mark: fork-only ignore lines.
ALLOWED = {'.gitignore'}


def git(*args):
    done = subprocess.run(['git', *args], capture_output=True, text=True)
    return done.stdout if done.returncode == 0 else ''


rows = [line for line in open(SEAMS, encoding='utf-8') if re.match(r'\| (S\d+) \|', line)]
row_ids = [re.match(r'\| (S\d+) \|', r).group(1) for r in rows]
findings = []

for seam in sorted({s for s in row_ids if row_ids.count(s) > 1}, key=lambda s: int(s[1:])):
    findings.append(f'{seam}: on {row_ids.count(seam)} rows')

markers = {}
for line in git('grep', '-nE', r'\[hevier\] *S[0-9]+', '--', '.', ':!hevier').splitlines():
    path = line.split(':', 1)[0]
    markers.setdefault(path, set()).update(re.findall(r'\[hevier\] *(S\d+)', line))
marked = set().union(*markers.values()) if markers else set()
for seam in sorted(marked - set(row_ids), key=lambda s: int(s[1:])):
    where = sorted(p for p, ids in markers.items() if seam in ids)[0]
    findings.append(f'{seam}: marker in {where} has no row')

# Every backticked path on a row, and the "Carried upstream changes" ones.
paths = set(re.findall(r'`([\w./*-]+)`', open(SEAMS, encoding='utf-8').read()))


def named(path):
    return any(fnmatch.fnmatch(path, p) for p in paths)


# A row without a marker stands on its paths: one of them must still be a file here (a bare file
# name, as rows often give it, matches by name).
tracked = git('ls-files').splitlines()
for row, seam in zip(rows, row_ids):
    if seam in marked:
        continue
    row_paths = re.findall(r'`([\w./*-]+)`', row)
    if not any(fnmatch.fnmatch(f, p) or f.rsplit('/', 1)[-1] == p for p in row_paths for f in tracked):
        findings.append(f'{seam}: row has no marker and names no file that exists')


upstream = next((r for r in ('upstream/main',)
                 if git('rev-parse', '-q', '--verify', r)), None)
if upstream is None:
    print('seam_check: no upstream remote here, only the rows and markers are checked')
else:
    base = git('merge-base', 'HEAD', upstream).strip()
    changed = git('diff', '--name-only', '--diff-filter=M', base, 'HEAD', '--', '.', *FORK_OWNED)
    for path in changed.splitlines():
        if path in ALLOWED or path in markers or named(path):
            continue
        findings.append(f'{path}: changed from upstream, with no marker and no row')

for finding in findings:
    print(f'seam_check: {finding}', file=sys.stderr)
if findings:
    sys.exit(1)
print(f'seam_check: {len(set(row_ids))} seams, {len(markers)} files with markers: fine')
