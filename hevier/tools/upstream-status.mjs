#!/usr/bin/env node
// What became of the fork's pull requests and issues on upstream, live, in place of hand-written
// status notes in hevier/PIPELINE.md.
//
//   node hevier/tools/upstream-status.mjs           # every PR and issue lodepav opened upstream
//   node hevier/tools/upstream-status.mjs --open    # only the open ones
//   node hevier/tools/upstream-status.mjs --json    # the same as JSON
//
// Each row: number, kind, state (open, merged, closed), milestone, a PR's base branch, and which
// upstream branch already carries it: the number in a commit subject on upstream/main or an
// upstream/release-* branch (upstream applies the fork's PRs with edits and closes them by hand,
// so the subject is the trace). It reads the refs of the last `git fetch upstream`; fetch first.
// Then, under its own heading, what is ready to delete locally. It prints only: it writes no
// file, posts nothing and deletes nothing. No dependencies: gh and git through execFileSync.
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const UPSTREAM = 'DuarteSantos8/openGym'
const FORK = 'lodepav/openGym-Hevier'
const OWNER = 'lodepav'

/** The branches whose commit subjects name #n, main first, then the release branches by version. */
export function carriedIn(n, logs) {
  const re = new RegExp(`#${n}(?!\\d)`)
  return orderBranches(Object.keys(logs)).filter(b => logs[b].some(s => re.test(s)))
}

/** upstream/main first, then upstream/release-X.Y.Z oldest first, without the remote's name. */
export function orderBranches(names) {
  const short = b => b.replace(/^upstream\//, '')
  const rank = b => (short(b) === 'main' ? 0 : 1)
  return [...names].sort((a, b) => rank(a) - rank(b) || short(a).localeCompare(short(b), 'en', { numeric: true }))
}

const stateOf = s => String(s || '').toLowerCase()

/** gh's PRs and issues plus each branch's commit subjects as rows, newest number first. */
export function rowsOf(prs, issues, logs, { open = false } = {}) {
  const row = (kind, x) => ({
    number: x.number,
    kind,
    title: x.title,
    state: stateOf(x.state),
    milestone: x.milestone?.title || null,
    base: kind === 'pr' ? x.baseRefName || null : null,
    carried: carriedIn(x.number, logs).map(b => b.replace(/^upstream\//, '')),
  })
  return [...prs.map(x => row('pr', x)), ...issues.map(x => row('issue', x))]
    .filter(r => !open || r.state === 'open')
    .sort((a, b) => b.number - a.number)
}

/** `git worktree list --porcelain` as [{ path, branch }], the main checkout (the first) left out. */
export function parseWorktrees(porcelain) {
  return String(porcelain).split(/\n\n+/).map(block => ({
    path: block.match(/^worktree (.+)$/m)?.[1],
    branch: block.match(/^branch refs\/heads\/(.+)$/m)?.[1] || null,
  })).filter(w => w.path).slice(1)
}

/**
 * What can go: hevier/* branches merged into hevier/main, and worktrees whose branch's newest PR
 * (upstream's or the fork's, `prs` as { repo, number, headRefName, state }) is merged or closed.
 */
export function cleanupOf({ merged, worktrees, prs }) {
  const branches = merged.map(b => b.trim()).filter(b => b.startsWith('hevier/') && b !== 'hevier/main')
  const ready = []
  for (const w of worktrees) {
    if (!w.branch) continue
    const pr = prs.filter(p => p.headRefName === w.branch).sort((a, b) => b.number - a.number)[0]
    if (pr && ['merged', 'closed'].includes(stateOf(pr.state))) ready.push({ ...w, pr: { repo: pr.repo, number: pr.number, state: stateOf(pr.state) } })
  }
  return { branches, worktrees: ready }
}

/** The rows as aligned text columns. */
export function render(rows) {
  const cells = rows.map(r => [`#${r.number}`, r.kind, r.state, r.milestone || '-', r.base || '-', r.carried[0] || '-', r.title])
  const head = ['#', 'kind', 'state', 'milestone', 'base', 'upstream has it', 'title']
  const all = [head, ...cells]
  const width = head.map((_, i) => Math.max(...all.map(c => String(c[i]).length)))
  return all.map(c => c.map((v, i) => (i === c.length - 1 ? v : String(v).padEnd(width[i]))).join('  ')).join('\n')
}

/** The cleanup section as text. */
export function renderCleanup({ branches, worktrees }) {
  const out = ['## Ready to delete locally (printed only, nothing deleted)', '', 'Branches merged into hevier/main:']
  out.push(...(branches.length ? branches.map(b => `  ${b}`) : ['  none']))
  out.push('', 'Worktrees whose PR is merged or closed:')
  out.push(...(worktrees.length ? worktrees.map(w => `  ${w.path}  ${w.branch}  (${w.pr.repo === FORK ? 'fork' : 'upstream'} #${w.pr.number}, ${w.pr.state})`) : ['  none']))
  return out.join('\n')
}

// ── gh and git ─────────────────────────────────────────────────────────────────────────────────

const run = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 }).trim()
const git = (...args) => run('git', args)
// gh pr list stops at 30 and the API at 100 a page, and upstream has over 200 open PRs: a low
// limit drops the oldest rows without a word, so ask for far more than there are.
const ghList = (what, repo, fields, author) =>
  JSON.parse(run('gh', [what, 'list', '-R', repo, ...(author ? ['--author', author] : []), '--state', 'all', '--limit', '1000', '--json', fields]) || '[]')

function main(argv) {
  const open = argv.includes('--open'), json = argv.includes('--json')
  const bad = argv.filter(a => !['--open', '--json'].includes(a))
  if (bad.length) { process.stderr.write('usage: upstream-status.mjs [--open] [--json]\n'); process.exit(2) }
  const prs = ghList('pr', UPSTREAM, 'number,title,state,milestone,baseRefName,headRefName', OWNER)
  const issues = ghList('issue', UPSTREAM, 'number,title,state,milestone', OWNER)
  const branches = git('for-each-ref', '--format=%(refname:short)', 'refs/remotes/upstream/main', 'refs/remotes/upstream/release-*').split('\n').filter(Boolean)
  // One log per branch, matched in rowsOf, rather than a `git log --grep` per number and branch.
  const logs = Object.fromEntries(branches.map(b => [b, git('log', '--format=%s', '-E', '--grep=#[0-9]', b).split('\n')]))
  const rows = rowsOf(prs, issues, logs, { open })
  const forkPrs = ghList('pr', FORK, 'number,state,headRefName')
  const cleanup = cleanupOf({
    merged: git('branch', '--merged', 'hevier/main', '--list', 'hevier/*', '--format=%(refname:short)').split('\n').filter(Boolean),
    worktrees: parseWorktrees(git('worktree', 'list', '--porcelain')),
    prs: [...prs.map(p => ({ ...p, repo: UPSTREAM })), ...forkPrs.map(p => ({ ...p, repo: FORK }))],
  })
  if (json) { process.stdout.write(JSON.stringify({ rows, cleanup }, null, 2) + '\n'); return }
  process.stdout.write(render(rows) + '\n\n' + renderCleanup(cleanup) + '\n')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main(process.argv.slice(2))
