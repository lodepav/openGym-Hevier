#!/usr/bin/env node
// Each page's critique scores from impeccable's saved reports (.impeccable/critique), oldest
// first, and whether another round is worth it (hevier/TOOLING-PLAN.md, item 4): stop at 36/40,
// when the last round gained under 1 point, or when it dropped. Two rounds compare only when both
// had a fresh critic and the same maximum: a critic that saw the page before scores it higher, and
// heuristic 9 scored or n/a moves the maximum (2026-11-22). Otherwise the last is a new baseline.
//
//   node hevier/tools/critique-rounds.mjs [dir] [--go]   # --go: only the pages worth a round
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export function verdict(scores, comparable = true) {
  const last = scores.at(-1), prev = scores.at(-2)
  if (last >= 36) return 'done'
  if (prev === undefined || !comparable) return 'go'
  if (last < prev) return 'dropped'
  if (last - prev < 1) return 'flat'
  return 'go'
}

export function pages(files) {
  const by = new Map()
  for (const [name, text] of files) {
    const front = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? ''
    const get = k => front.match(new RegExp(`^${k}: (.*)$`, 'm'))?.[1]
    const total = +get('total_score'), max = +get('max_score') || 40
    if (!Number.isFinite(total)) continue
    const slug = name.split('__')[1]?.replace(/\.md$/, '') ?? name
    if (!by.has(slug)) by.set(slug, [])
    const fresh = /fresh critic/i.test(text.slice(0, 1500))
    by.get(slug).push({ at: get('timestamp') ?? name, score: Math.round(total / max * 400) / 10, max, fresh })
  }
  return [...by].map(([slug, runs]) => {
    runs.sort((a, b) => a.at < b.at ? -1 : 1)
    const [a, b] = runs.slice(-2), scores = runs.map(r => r.score)
    const comparable = !b || (a.fresh && b.fresh && a.max === b.max)
    return { slug, scores, comparable, verdict: verdict(scores, comparable) }
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), dir = args.find(a => !a.startsWith('--')) ?? '.impeccable/critique'
  const files = readdirSync(dir).filter(f => f.endsWith('.md')).map(f => [f, readFileSync(`${dir}/${f}`, 'utf8')])
  const rows = pages(files).filter(p => !args.includes('--go') || p.verdict === 'go')
  for (const p of rows.sort((a, b) => a.slug < b.slug ? -1 : 1))
    console.log(`${(p.verdict + (p.comparable ? '' : '*')).padEnd(8)} ${p.scores.join(' → ').padEnd(34)} ${p.slug.replace(/^frontend-src-hevier-(views-)?/, '')}`)
  if (rows.some(p => !p.comparable)) console.log('* the last two rounds differ in critic or maximum, so the last is a new baseline')
}
