// node --test hevier/tools/screens-lib.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compareMarkdown, diffFindings, diffLedgers, fixtureActive, FIXTURE_IDS, isMoving, ledgerJs, selectorPath } from './screens-lib.mjs'
import { isDropSet, isFailureSet, isSideSet, isWarmupRow } from '../../frontend/src/lib/workout-model.js'

// A tiny element tree: { tag, id, kids }.
const tree = (spec, parent = null) => {
  const n = { nodeType: 1, tagName: spec.tag.toUpperCase(), id: spec.id || '', parentElement: parent, children: [] }
  n.children = (spec.kids || []).map(k => tree(k, n))
  return n
}

test('the fixture has every row kind the restyle must be checked on', () => {
  const A = fixtureActive({ start: 1000, d: '2026-11-15' })
  assert.equal(A.id, 'hv-screens-1000')
  const sets = A.entries.flatMap(e => e.sets)
  assert.ok(sets.some(isWarmupRow), 'a warm-up')
  assert.ok(sets.some(isFailureSet), 'a set to failure')
  assert.ok(sets.some(isDropSet), 'a drop set')
  assert.ok(sets.some(s => s.w === 110.23), 'a weight with two decimals')
  assert.deepEqual(A.entries.filter(e => e.sg).map(e => e.id), [FIXTURE_IDS.CURL, FIXTURE_IDS.ROW], 'a superset pair, side by side')
  const calf = A.entries.find(e => e.id === FIXTURE_IDS.CALF)
  assert.ok(calf.target.side && calf.sets.every(isSideSet), 'per side')
  assert.equal(calf.sets[0].r, 24, 'the per-side row carries its total')
  assert.ok(A.entries.some(e => e.id === FIXTURE_IDS.LONG))
})

test('a selector path is tags from the nearest plain id, numbered only where siblings share a tag', () => {
  const root = tree({ tag: 'div', id: 'root', kids: [{ tag: 'main', kids: [{ tag: 'div' }, { tag: 'div', kids: [{ tag: 'button' }, { tag: 'span' }] }] }] })
  const button = root.children[0].children[1].children[0]
  assert.equal(selectorPath(button), 'div#root>main>div:nth-of-type(2)>button')
  const generated = tree({ tag: 'body', kids: [{ tag: 'div', id: ':r1:', kids: [{ tag: 'p' }] }] })
  assert.equal(selectorPath(generated.children[0].children[0]), 'body>div>p')
})

test('moving text: clocks, elapsed words and relative times, not plain numbers', () => {
  for (const s of ['0:42', '1:15:02', '18min 19s', '45s', '2h 3min', '3 days ago', 'just now']) assert.ok(isMoving(s), s)
  for (const s of ['110.23', 'Bench Press', '12', 'Rest Timer: 2min 0s', '']) assert.ok(!isMoving(s), s)
})

test('the ledger expressions parse', () => {
  for (const kind of ['sizes', 'colours']) assert.doesNotThrow(() => new Function('return ' + ledgerJs(kind)), kind)
})

test('the ledger diff lists gone, added and changed elements by screen, within the tolerance', () => {
  const before = { 'narrow /home': { a: { n: 'A', x: 0, y: 0, w: 44, h: 44 }, b: { n: 'B', x: 0, y: 50, w: 10, h: 10 } }, 'narrow /old': {} }
  const after = { 'narrow /home': { a: { n: 'A', x: 0.3, y: 0, w: 44, h: 48 }, c: { n: 'C', x: 1, y: 1, w: 1, h: 1 } }, 'narrow /new': {} }
  assert.deepEqual(diffLedgers(before, after, { tolerance: 0.5 }), [
    { screen: 'narrow /home', kind: 'gone', key: 'b', n: 'B' },
    { screen: 'narrow /home', kind: 'changed', key: 'a', n: 'A', changes: [{ field: 'h', from: 44, to: 48 }] },
    { screen: 'narrow /home', kind: 'added', key: 'c', n: 'C' },
    { screen: 'narrow /new', kind: 'screen added' },
    { screen: 'narrow /old', kind: 'screen gone' },
  ])
  const col = { s: { k: { n: 'x', color: 'rgb(0, 0, 0)', fill: 'none' } } }
  assert.deepEqual(diffLedgers(col, col), [])
  assert.deepEqual(diffLedgers(col, { s: { k: { n: 'renamed', color: 'rgb(1, 0, 0)', fill: 'none' } } })[0].changes, [{ field: 'color', from: 'rgb(0, 0, 0)', to: 'rgb(1, 0, 0)' }])
})

test('the findings diff compares report lines, ellipsis notes included', () => {
  const before = [{ screen: 'narrow /home', out: [{ note: true, check: 'text cut with an ellipsis', el: 'Bench' }] }]
  const after = [{ screen: 'narrow /home', out: [{ check: 'controls overlap', el: 'a × b' }] }]
  assert.deepEqual(diffFindings(before, after), [
    { screen: 'narrow /home', kind: 'gone', line: 'note: text cut with an ellipsis: Bench' },
    { screen: 'narrow /home', kind: 'added', line: 'controls overlap: a × b' },
  ])
  const md = compareMarkdown({ sizes: [{ screen: 's', kind: 'changed', key: 'k', n: 'K', changes: [{ field: 'h', from: 44, to: 48 }] }], findings: diffFindings(before, after) })
  assert.match(md, /### s\n\n- changed `k` \(K\): h 44 → 48/)
  assert.match(md, /## Colours\n\nNo change\./)
  assert.match(md, /- added: controls overlap: a × b/)
})
