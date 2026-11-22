import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verdict, pages } from './critique-rounds.mjs'

test('stop at 36, on a gain under 1, or on a drop; go otherwise', () => {
  assert.equal(verdict([28]), 'go')
  assert.equal(verdict([30, 36]), 'done')
  assert.equal(verdict([30, 30.5]), 'flat')
  assert.equal(verdict([32, 29]), 'dropped')
  assert.equal(verdict([28, 31]), 'go')
})

test('reports group by page, sort by time and scale a partial maximum to 40', () => {
  const f = (t, s, m = 40) => `---\ntarget: X\ntotal_score: ${s}\nmax_score: ${m}\ntimestamp: ${t}\n---\nbody`
  const r = pages([['b__lifts.md', f('2026-11-21', 30)], ['a__lifts.md', f('2026-11-20', 24, 32)], ['c__today.md', 'no front matter']])
  assert.deepEqual(r, [{ slug: 'lifts', scores: [30, 30], comparable: false, verdict: 'go' }])
})

test('two rounds compare only with fresh critics on both and the same maximum', () => {
  const f = (t, s, m, fresh) => `---\ntotal_score: ${s}\nmax_score: ${m}\ntimestamp: ${t}\n---\n${fresh ? 'Sixth run, fresh critic.' : 'Re-run.'}`
  const one = (...runs) => pages(runs.map((r, i) => [`${i}__p.md`, f(...r)]))[0]
  assert.equal(one(['1', 32, 40, true], ['2', 28, 40, true]).verdict, 'dropped')
  assert.equal(one(['1', 32, 40, false], ['2', 28, 40, true]).verdict, 'go')
  assert.equal(one(['1', 30, 36, true], ['2', 29, 40, true]).verdict, 'go')
  assert.equal(one(['1', 28, 40, true], ['2', 28.2, 40, true]).verdict, 'flat')
})
