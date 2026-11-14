// node --test hevier/tools/*.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carriedIn, orderBranches, rowsOf, parseWorktrees, cleanupOf, render, renderCleanup } from './upstream-status.mjs'

const logs = {
  'upstream/release-1.4.10': ['Workout: keep the sheet (#1213)'],
  'upstream/release-1.4.5': ['Merge pull request #1084 from lodepav/updater', 'Imports: notes (#815, idea by @lodepav)'],
  'upstream/main': ['Merge pull request #1084 from lodepav/updater', 'Unrelated #10840'],
}

test('a number counts only whole, and main comes before the release branches, by version', () => {
  assert.deepEqual(orderBranches(Object.keys(logs)), ['upstream/main', 'upstream/release-1.4.5', 'upstream/release-1.4.10'])
  assert.deepEqual(carriedIn(1084, logs), ['upstream/main', 'upstream/release-1.4.5'])
  assert.deepEqual(carriedIn(108, logs), [])
  assert.deepEqual(carriedIn(815, logs), ['upstream/release-1.4.5'])
  assert.deepEqual(carriedIn(1213, logs), ['upstream/release-1.4.10'])
})

test('rows: PRs and issues, states in lower case, milestone and base, newest first; --open filters', () => {
  const prs = [
    { number: 1084, title: 'Updater', state: 'MERGED', milestone: null, baseRefName: 'release-1.4.5' },
    { number: 815, title: 'Hevy API', state: 'OPEN', milestone: { title: 'v1.4.5' }, baseRefName: 'release-1.4.4' },
    { number: 672, title: 'Titles', state: 'CLOSED', milestone: null, baseRefName: 'release-1.4.3' },
  ]
  const issues = [{ number: 903, title: 'Shown as', state: 'OPEN', milestone: null }]
  const rows = rowsOf(prs, issues, logs)
  assert.deepEqual(rows.map(r => [r.number, r.kind, r.state]), [[1084, 'pr', 'merged'], [903, 'issue', 'open'], [815, 'pr', 'open'], [672, 'pr', 'closed']])
  assert.deepEqual(rows[0].carried, ['main', 'release-1.4.5'])
  assert.equal(rows[1].base, null)
  assert.equal(rows[2].milestone, 'v1.4.5')
  assert.deepEqual(rowsOf(prs, issues, logs, { open: true }).map(r => r.number), [903, 815])
  const text = render(rows).split('\n')
  assert.match(text[0], /^#\s+kind\s+state\s+milestone\s+base\s+upstream has it\s+title$/)
  assert.match(text[1], /^#1084\s+pr\s+merged\s+-\s+release-1\.4\.5\s+main\s+Updater$/)
  assert.match(text[2], /^#903\s+issue\s+open\s+-\s+-\s+-\s+Shown as$/)
})

test('cleanup: merged hevier branches but hevier/main, worktrees whose newest PR is merged or closed', () => {
  const porcelain = [
    'worktree /src/main\nHEAD aaa\nbranch refs/heads/hevier/main',
    'worktree /src/a\nHEAD bbb\nbranch refs/heads/upstream-pr/a',
    'worktree /src/b\nHEAD ccc\nbranch refs/heads/hevier/b',
    'worktree /src/c\nHEAD ddd\ndetached',
    'worktree /src/d\nHEAD eee\nbranch refs/heads/upstream-pr/d',
  ].join('\n\n') + '\n'
  const worktrees = parseWorktrees(porcelain)
  assert.deepEqual(worktrees.map(w => w.path), ['/src/a', '/src/b', '/src/c', '/src/d'])
  const prs = [
    { repo: 'DuarteSantos8/openGym', number: 10, headRefName: 'upstream-pr/a', state: 'MERGED' },
    { repo: 'lodepav/openGym-Hevier', number: 3, headRefName: 'hevier/b', state: 'CLOSED' },
    { repo: 'DuarteSantos8/openGym', number: 20, headRefName: 'upstream-pr/d', state: 'CLOSED' },
    { repo: 'DuarteSantos8/openGym', number: 21, headRefName: 'upstream-pr/d', state: 'OPEN' },
  ]
  const c = cleanupOf({ merged: ['  hevier/main', '  hevier/b', '  upstream-pr/a', '  hevier/old'], worktrees, prs })
  assert.deepEqual(c.branches, ['hevier/b', 'hevier/old'])
  assert.deepEqual(c.worktrees.map(w => [w.path, w.pr.number, w.pr.state]), [['/src/a', 10, 'merged'], ['/src/b', 3, 'closed']])
  const text = renderCleanup(c)
  assert.match(text, /^## Ready to delete locally/)
  assert.match(text, /\/src\/b {2}hevier\/b {2}\(fork #3, closed\)/)
  assert.match(renderCleanup({ branches: [], worktrees: [] }), /hevier\/main:\n {2}none\n/)
})
