#!/usr/bin/env node
// Supply-chain gate (D26): the npm packages the lockfiles pin, and what the built bundle reaches.
//
//   node hevier/tools/supply-chain.mjs packages           # lockfiles against hevier/security/packages.txt
//   node hevier/tools/supply-chain.mjs packages --accept  # rewrite the baseline after reviewing the diff
//   node hevier/tools/supply-chain.mjs bundle <dist>      # endpoints and code patterns in a build
//
// Exit 1 on any finding not in an allow-list under hevier/security/. No dependencies: plain Node.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const SEC = join(ROOT, 'hevier/security')
export const LOCKFILES = ['package-lock.json', 'frontend/package-lock.json', 'api/package-lock.json', 'mcp/package-lock.json']
const REGISTRY = 'https://registry.npmjs.org/'

// ---------- allow-list files: one entry per line, "# reason" after it, blank lines ignored

export function readList(text) {
  return text.split('\n').map(l => l.replace(/#.*/, '').trim()).filter(Boolean)
}

// ---------- packages

/**
 * One lockfile (v2/v3) → baseline lines `<dir>\t<name>@<version>[\tinstall-script]`, plus the
 * problems that fail on their own: a package fetched from anywhere but the npm registry, or with
 * no integrity hash. Workspace links (`link: true`) and the root entry are skipped.
 */
export function lockEntries(dir, lock) {
  const lines = [], problems = []
  for (const [key, p] of Object.entries(lock.packages || {})) {
    if (!key || p.link) continue
    const name = p.name || key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length)
    const id = `${name}@${p.version}`
    lines.push(`${dir}\t${id}${p.hasInstallScript ? '\tinstall-script' : ''}`)
    if (!p.resolved?.startsWith(REGISTRY)) problems.push(`${dir}: ${id} is not from the npm registry (${p.resolved || 'no resolved URL'})`)
    else if (!p.integrity) problems.push(`${dir}: ${id} has no integrity hash`)
  }
  return { lines, problems }
}

/** Baseline vs current: what is new (fails) and what has gone (only reported). */
export function diffLines(baseline, current) {
  const was = new Set(baseline), now = new Set(current)
  return { added: current.filter(l => !was.has(l)), removed: baseline.filter(l => !now.has(l)) }
}

function packages(accept) {
  const lines = [], problems = []
  for (const f of LOCKFILES) {
    const r = lockEntries(dirname(f), JSON.parse(readFileSync(join(ROOT, f), 'utf8')))
    lines.push(...r.lines); problems.push(...r.problems)
  }
  const current = [...new Set(lines)].sort()
  const file = join(SEC, 'packages.txt')
  if (accept) {
    const head = '# Reviewed npm packages, all four lockfiles (D26). Rewritten by\n' +
      '# `node hevier/tools/supply-chain.mjs packages --accept` after the diff was read.\n'
    writeFileSync(file, head + current.join('\n') + '\n')
    console.log(`packages: baseline rewritten, ${current.length} entries`)
    return problems.length ? fail('packages', problems) : 0
  }
  const { added, removed } = diffLines(existsSync(file) ? readList(readFileSync(file, 'utf8')).map(l => l.replace(/ +/g, '\t')) : [], current)
  for (const l of removed) console.log(`  gone: ${l}`)
  const findings = [...problems, ...added.map(l => `new or changed: ${l.replace(/\t/g, ' ')}`)]
  if (!findings.length) { console.log(`packages: ok, ${current.length} reviewed`); return 0 }
  console.log('  Review each new package (npm page, repo, maintainers, install script, publish date),\n' +
    '  then run: node hevier/tools/supply-chain.mjs packages --accept')
  return fail('packages', findings)
}

// ---------- bundle

const HOST = /\b(?:https?|wss?):\/\/((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}|localhost)\b/gi
// Code that runs strings, or hides them. Each hit must be allow-listed by pattern and chunk.
export const PATTERNS = {
  'eval': /(?<![\w$.])eval\(/g,
  'new-function': /\bnew Function\(|(?<![\w$.])Function\(\s*["'`]/g,
  'base64-blob': /[A-Za-z0-9+/]{200,}={0,2}/g,
  'escaped-blob': /(?:\\x[0-9a-fA-F]{2}|\\u[0-9a-fA-F]{4}){20,}/g,
  'websocket': /\bnew WebSocket\(/g,
  'beacon': /\bsendBeacon\(/g,
  'import-scripts': /\bimportScripts\(/g,
}

/** A built file's name without Vite's content hash: assets/index-BRj_SH8v.js → assets/index.js */
export const chunkName = f => f.replace(/-[A-Za-z0-9_-]{8}(\.\w+)$/, '$1')

/** Hosts and pattern hits in one file's text. data: URIs are stripped first (images, fonts). */
export function scanText(text) {
  const t = text.replace(/data:[\w/+.-]+;base64,[A-Za-z0-9+/=]+/g, '')
  const hosts = new Set([...t.matchAll(HOST)].map(m => m[1].toLowerCase()))
  const hits = {}
  for (const [id, re] of Object.entries(PATTERNS)) {
    const n = (t.match(re) || []).length
    if (n) hits[id] = n
  }
  return { hosts, hits }
}

function walk(dir) {
  return readdirSync(dir).flatMap(n => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

function bundle(dist) {
  if (!dist || !existsSync(dist)) { console.error('bundle: give the build folder, e.g. frontend/dist'); return 2 }
  const hostOK = new Set(readList(readFileSync(join(SEC, 'endpoints.txt'), 'utf8')).map(h => h.toLowerCase()))
  const patOK = new Set(readList(readFileSync(join(SEC, 'bundle-allow.txt'), 'utf8')).map(l => l.split(/\s+/).join(' ')))
  const findings = [], seen = new Map()
  const files = walk(dist).filter(f => /\.(m?js|html|json|webmanifest)$/.test(f))
  for (const f of files) {
    const rel = relative(dist, f)
    const { hosts, hits } = scanText(readFileSync(f, 'utf8'))
    for (const h of hosts) if (!seen.has(h)) seen.set(h, rel)
    for (const [id, n] of Object.entries(hits))
      if (!patOK.has(`${id} ${chunkName(rel)}`)) findings.push(`${id} ×${n} in ${rel} (allow as "${id} ${chunkName(rel)}")`)
  }
  for (const [h, rel] of seen) if (!hostOK.has(h)) findings.push(`endpoint ${h} (first in ${rel})`)
  if (!findings.length) { console.log(`bundle: ok, ${files.length} files, ${seen.size} hosts all allow-listed`); return 0 }
  console.log('  Find where it comes from (upstream change, a new package?). If it belongs, add it to\n' +
    '  hevier/security/endpoints.txt or bundle-allow.txt with the reason.')
  return fail('bundle', findings)
}

function fail(gate, findings) {
  console.log(`${gate}: ${findings.length} finding(s)`)
  for (const f of findings) console.log(`  ✗ ${f}`)
  return 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, arg] = process.argv.slice(2)
  const code = cmd === 'packages' ? packages(arg === '--accept')
    : cmd === 'bundle' ? bundle(arg)
    : (console.error('usage: supply-chain.mjs packages [--accept] | bundle <dist>'), 2)
  process.exit(code)
}
