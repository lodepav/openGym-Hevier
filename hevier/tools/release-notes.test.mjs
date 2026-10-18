// node --test hevier/tools/*.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { noteOf, addedDecisions, entriesOf, nextVersion, render, prependChangelog } from './release-notes.mjs'

test('noteOf takes the text of a fork merge and keeps an upstream merge apart', () => {
  assert.deepEqual(noteOf('Merge hevier/overpass-mirrors: gyms nearby from Photon first (D47)'), { fork: true, text: 'gyms nearby from Photon first (D47)' })
  assert.deepEqual(noteOf("Merge tag 'v1.4.2' into hevier/main"), { fork: false, text: "tag 'v1.4.2'" })
})

test('addedDecisions reads new decision rows, not changed ones', () => {
  const diff = '+| D54 | **Release notes.** … |\n-| D47 | old |\n+| D47 | changed |\n+text | D55 |'
  assert.deepEqual(addedDecisions(diff), ['D54'])
  assert.deepEqual(addedDecisions('+| D54 | x |'), ['D54'])
})

test('a new decision is New and raises the minor; anything else the patch; major only when asked', () => {
  const merges = [
    { subject: 'Merge hevier/a: release notes (D54)', diff: '+| D54 | x |' },
    { subject: 'Merge hevier/b: a fix (D47)', diff: '' },
    { subject: "Merge tag 'v1.4.2' into hevier/main", diff: '+| D99 | not ours |' },
  ]
  const e = entriesOf(merges)
  assert.deepEqual(e.map(x => x.section), ['new', 'fix', 'upstream'])
  assert.equal(nextVersion('1.1.0', e), '1.2.0')
  assert.equal(nextVersion('1.1.0', e.slice(1)), '1.1.1')
  assert.equal(nextVersion('1.1.3', e, { major: true }), '2.0.0')
  assert.equal(nextVersion('1.1.0', []), null)
  assert.equal(render(e), '### New\n\n- release notes (D54)\n\n### Fixes and changes\n\n- a fix (D47)\n\n### From openGym\n\n- tag \'v1.4.2\'')
})

test('the changelog keeps its title and puts the newest release first', () => {
  const one = prependChangelog('', '1.1.0', '2026-10-18', '1.4.1', '### New\n\n- a')
  const two = prependChangelog(one, '1.2.0', '2026-10-19', '1.4.1', '### Fixes and changes\n\n- b')
  assert.match(two, /^# Go Hevier releases\n/)
  assert.ok(two.indexOf('## 1.2.0') < two.indexOf('## 1.1.0'))
  assert.equal(two.match(/# Go Hevier releases/g).length, 1)
})
