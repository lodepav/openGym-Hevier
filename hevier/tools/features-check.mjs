#!/usr/bin/env node
// Every decision in DECISIONS-INDEX.md is named in FEATURES.md (a row, the No fork code list or
// the list of decisions without a row), and every Offered row carries its issue or PR number.
// verify.sh runs it, so a feature cannot land without its line (hevier/TOOLING-PLAN.md, item 8).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export function check(index, features) {
  const named = new Set([...features.matchAll(/\bD(\d+)\b/g)].map(m => +m[1]))
  const missing = [...index.matchAll(/^- \*\*D(\d+)\*\*/gm)].map(m => +m[1]).filter(d => !named.has(d))
  const offeredNoNumber = features.split('\n')
    .filter(l => l.startsWith('|') && /\|\s*\**Offered\b[^|]*\|\s*$/.test(l) && !/#\d+/.test(l))
  return { missing, offeredNoNumber }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = new URL('..', import.meta.url)
  const { missing, offeredNoNumber } = check(
    readFileSync(new URL('DECISIONS-INDEX.md', dir), 'utf8'),
    readFileSync(new URL('FEATURES.md', dir), 'utf8'))
  for (const d of missing) console.error(`features-check: D${d} is not in hevier/FEATURES.md (add a row, or list it under "Decisions without a row")`)
  for (const l of offeredNoNumber) console.error(`features-check: an Offered row has no issue or PR number: ${l.slice(0, 100)}`)
  if (missing.length || offeredNoNumber.length) process.exit(1)
}
