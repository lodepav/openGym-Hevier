#!/usr/bin/env node
// Go Hevier's next version and its release notes, from the merges since the last release (D52).
//
//   node hevier/tools/release-notes.mjs next [--major]   # JSON: { from, version, notes } of what is unreleased
//   node hevier/tools/release-notes.mjs notes <tag>      # the notes of a release already tagged
//
// Every feature reaches hevier/main as one `--no-ff` merge, "Merge hevier/<branch>: what it does",
// so those merges, read along hevier/main's first parents, are the release's notes. A merge that
// adds a decision (a new `| D<n> |` row in hevier/DECISIONS.md) is listed under New and raises the
// minor version; any other is under Fixes and changes and raises the patch. A merge of upstream's
// (any other subject) is listed under From openGym. A major release is only ever asked for.
// No dependencies: git through execFileSync. release-apk.sh writes the notes into
// hevier/CHANGELOG.md with the version commit and into the GitHub release.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const TAG = 'gohevier-v'

/** The fork's merge subject as a note: "Merge hevier/x: text" → { fork: true, text }; anything else is upstream's. */
export function noteOf(subject) {
  const m = String(subject).match(/^Merge (?:branch '?)?hevier\/[^:\s']+'?(?: into [^:]+)?:\s*(.+)$/)
  if (m) return { fork: true, text: m[1].trim() }
  return { fork: false, text: String(subject).replace(/^Merge\s+/, '').replace(/\s+into\s+'?hevier\/main'?$/, '').trim() }
}

/** The D-numbers a diff of hevier/DECISIONS.md adds as new rows (a changed row is removed and added). */
export function addedDecisions(diff) {
  const rows = sign => [...String(diff).matchAll(new RegExp('^\\' + sign + '\\| (D\\d+) \\|', 'gm'))].map(m => m[1])
  const had = new Set(rows('-'))
  return rows('+').filter(d => !had.has(d))
}

/** Each merge as { section: 'new' | 'fix' | 'upstream', text, decisions }. */
export function entriesOf(merges) {
  return merges.map(({ subject, diff }) => {
    const { fork, text } = noteOf(subject)
    const decisions = fork ? addedDecisions(diff) : []
    return { section: !fork ? 'upstream' : decisions.length ? 'new' : 'fix', text, decisions }
  })
}

/** The version after `ver`: major when asked, minor with anything new, else patch; null with nothing to release. */
export function nextVersion(ver, entries, { major = false } = {}) {
  if (!entries.length && !major) return null
  const [ma, mi, pa] = String(ver).split('.').map(Number)
  if (major) return `${ma + 1}.0.0`
  if (entries.some(e => e.section === 'new')) return `${ma}.${mi + 1}.0`
  return `${ma}.${mi}.${pa + 1}`
}

const SECTIONS = [['new', 'New'], ['fix', 'Fixes and changes'], ['upstream', 'From openGym']]

/** The notes as Markdown: a heading per section that has entries, newest merge first. */
export function render(entries) {
  const out = []
  for (const [key, title] of SECTIONS) {
    const xs = entries.filter(e => e.section === key)
    if (xs.length) out.push(`### ${title}\n\n` + xs.map(e => `- ${e.text}`).join('\n'))
  }
  return out.join('\n\n') || 'No changes of its own.'
}

/** hevier/CHANGELOG.md with this release's section put first, under the title. */
export function prependChangelog(text, ver, date, upstream, notes) {
  const head = '# Go Hevier releases\n\nWritten by hevier/tools/release-notes.mjs at each release (D52).\n'
  const body = String(text || '').startsWith('# Go Hevier releases') ? String(text).slice(head.length).replace(/^\n+/, '') : ''
  const section = `## ${ver} · ${date}\n\nBased on openGym ${upstream}.\n\n${notes}\n`
  return head + '\n' + section + (body ? '\n' + body : '')
}

// ── git ────────────────────────────────────────────────────────────────────────────────────────

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 }).trim()

/** The newest Go Hevier tag reachable from `ref`, or null. */
export function lastTag(ref = 'HEAD') {
  const tags = git('tag', '-l', TAG + '*', '--sort=-v:refname', '--merged', ref).split('\n').filter(Boolean)
  return tags.find(t => t !== ref) || null
}

/** The first-parent merges in from..to, newest first, each with its DECISIONS.md diff. */
function mergesBetween(from, to) {
  const range = from ? `${from}..${to}` : to
  const lines = git('log', '--first-parent', '--merges', '--format=%H%x09%s', range).split('\n').filter(Boolean)
  return lines.map(l => {
    const [hash, subject] = l.split('\t')
    return { subject, diff: git('diff', '--unified=0', `${hash}^1`, hash, '--', 'hevier/DECISIONS.md') }
  })
}

function main(argv) {
  const [cmd, arg] = argv
  if (cmd === 'next') {
    const from = lastTag('HEAD')
    const ver = readFileSync(join(ROOT, 'hevier/VERSION'), 'utf8').trim()
    const entries = entriesOf(mergesBetween(from, 'HEAD'))
    const version = nextVersion(ver, entries, { major: argv.includes('--major') })
    process.stdout.write(JSON.stringify({ from, version, notes: version ? render(entries) : '' }) + '\n')
    return
  }
  if (cmd === 'notes' && arg) {
    const prev = lastTag(arg + '^')
    process.stdout.write(render(entriesOf(mergesBetween(prev, arg))) + '\n')
    return
  }
  process.stderr.write('usage: release-notes.mjs next [--major] | notes <tag>\n')
  process.exit(2)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main(process.argv.slice(2))
