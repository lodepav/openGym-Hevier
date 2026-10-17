// node --test hevier/tools/*.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readList, lockEntries, diffLines, scanText, chunkName } from './supply-chain.mjs'

const R = 'https://registry.npmjs.org/'

test('readList drops comments and blank lines', () => {
  assert.deepEqual(readList('a.com   # why\n\n# only a comment\nb.com\n'), ['a.com', 'b.com'])
})

test('lockEntries lists name@version, flags install scripts, skips root and links', () => {
  const lock = { packages: {
    '': { name: 'app', version: '1.0.0' },
    'node_modules/react': { version: '19.1.0', resolved: R + 'react/-/react-19.1.0.tgz', integrity: 'sha512-x' },
    'node_modules/a/node_modules/@s/b': { version: '2.0.0', resolved: R + '@s/b/-/b-2.0.0.tgz', integrity: 'sha512-y', hasInstallScript: true },
    'node_modules/local': { link: true, resolved: '../local' },
  } }
  const { lines, problems } = lockEntries('frontend', lock)
  assert.deepEqual(lines, ['frontend\treact@19.1.0', 'frontend\t@s/b@2.0.0\tinstall-script'])
  assert.deepEqual(problems, [])
})

test('lockEntries flags packages from outside the registry or without integrity', () => {
  const lock = { packages: {
    'node_modules/git-dep': { version: '1.0.0', resolved: 'git+ssh://git@github.com/x/y.git#abc' },
    'node_modules/no-hash': { version: '1.0.0', resolved: R + 'no-hash/-/no-hash-1.0.0.tgz' },
  } }
  const { problems } = lockEntries('api', lock)
  assert.equal(problems.length, 2)
  assert.match(problems[0], /git-dep@1.0.0 is not from the npm registry/)
  assert.match(problems[1], /no-hash@1.0.0 has no integrity hash/)
})

test('diffLines: a version bump or a new install script counts as new', () => {
  const base = ['f\ta@1.0.0', 'f\tb@1.0.0']
  const now = ['f\ta@1.0.1', 'f\tb@1.0.0\tinstall-script', 'f\tc@1.0.0']
  assert.deepEqual(diffLines(base, now), {
    added: ['f\ta@1.0.1', 'f\tb@1.0.0\tinstall-script', 'f\tc@1.0.0'],
    removed: ['f\ta@1.0.0', 'f\tb@1.0.0'],
  })
})

test('scanText finds hosts, ignoring data: URIs and fragments that are not hosts', () => {
  const { hosts } = scanText('fetch("https://API.hevyapp.com/v1");x="http://www.w3.org/2000/svg";' +
    'y="https://-t";z="data:image/png;base64,aHR0cHM6Ly9ldmlsLmNvbQ==";w="wss://localhost:3000"')
  assert.deepEqual([...hosts].sort(), ['api.hevyapp.com', 'localhost', 'www.w3.org'])
})

test('scanText counts code that runs or hides strings, not lookalikes', () => {
  const { hits } = scanText('eval("1");eval(x);a.eval(y);retrieval(z);new Function("a","b");' +
    `s="${'QUJD'.repeat(60)}";t="${'\\x41'.repeat(25)}";navigator.sendBeacon(u)`)
  assert.deepEqual(hits, { 'eval': 2, 'new-function': 1, 'base64-blob': 1, 'escaped-blob': 1, 'beacon': 1 })
})

test('scanText leaves a long base64 image alone', () => {
  assert.deepEqual(scanText(`i="data:image/png;base64,${'A'.repeat(400)}"`).hits, {})
})

test('chunkName strips the content hash', () => {
  assert.equal(chunkName('assets/index-BRj_SH8v.js'), 'assets/index.js')
  assert.equal(chunkName('sw.js'), 'sw.js')
  assert.equal(chunkName('assets/exercises-Bkws6egf.js'), 'assets/exercises.js')
})
