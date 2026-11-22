#!/usr/bin/env node
// Which seams an upstream offer could remove (hevier/TOOLING-PLAN.md, item 6): each seam in
// SEAMS.md with the decisions it names and their status in FEATURES.md. A seam whose decisions
// are all Offered or Ported goes when upstream takes them; one with an Offer is a candidate.
// tools/upstream-status.mjs says what became of each offer.
//
//   node hevier/tools/seam-offers.mjs [--all]   # default: seams with something offered or to offer
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ds = s => [...s.matchAll(/\bD(\d+)\b/g)].map(m => +m[1])
const cells = l => l.split('|').slice(1, -1).map(c => c.trim())

export function statuses(features) {
  const st = new Map()
  for (const l of features.split('\n')) {
    if (!l.startsWith('|')) continue
    const c = cells(l), kind = c.at(-1)?.replace(/\*/g, '').match(/^(Fork|Offered|Offer|Ported|Removed)\b/)?.[1]
    if (kind) for (const d of ds(c[1] ?? '')) st.set(d, kind)
  }
  return st
}

export function seams(seamsMd, st) {
  return seamsMd.split('\n').filter(l => /^\| S\d+ /.test(l)).map(l => {
    const c = cells(l), decisions = [...new Set(ds(c[2] ?? ''))]
    const kinds = decisions.map(d => st.get(d) ?? '?')
    const gone = decisions.length > 0 && kinds.every(k => k === 'Offered' || k === 'Ported')
    return { id: c[0], file: c[1].replace(/`/g, ''), decisions, kinds,
      verdict: gone ? 'goes when taken' : kinds.includes('Offer') ? 'candidate' : 'stays' }
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = new URL('..', import.meta.url), read = f => readFileSync(new URL(f, dir), 'utf8')
  const rows = seams(read('SEAMS.md'), statuses(read('FEATURES.md')))
  for (const r of rows.filter(r => process.argv.includes('--all') || r.verdict !== 'stays'))
    console.log(`${r.id.padEnd(4)} ${r.verdict.padEnd(15)} ${r.decisions.map((d, i) => `D${d} ${r.kinds[i]}`).join(', ').padEnd(40)} ${r.file}`)
  const n = v => rows.filter(r => r.verdict === v).length
  console.log(`${rows.length} seams: ${n('goes when taken')} go when upstream takes the offers, ${n('candidate')} candidates, ${n('stays')} stay`)
}
