// node --test hevier/tools/*.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, utimesSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mediaVersion, mediaUrl, makeMediaZip } from './media-zip.mjs'
import { wantedMedia } from '../../frontend/src/hevier/lib/media-pack.js'

const H = c => c.repeat(64)

test('the version is 12 hex over paths and contents, whatever the order', () => {
  const a = [{ path: 'still/a.webp', sha256: H('a') }, { path: 'clip/a.mp4', sha256: H('b') }]
  const v = mediaVersion(a)
  assert.match(v, /^[0-9a-f]{12}$/)
  assert.equal(mediaVersion([...a].reverse()), v)
  const lines = ['clip/a.mp4\0' + H('b') + '\n', 'still/a.webp\0' + H('a') + '\n'].join('')
  assert.equal(v, createHash('sha256').update(lines).digest('hex').slice(0, 12))
  assert.notEqual(mediaVersion([a[0], { ...a[1], sha256: H('c') }]), v, 'a changed file')
  assert.notEqual(mediaVersion([a[0], { ...a[1], path: 'clip/b.mp4' }]), v, 'a renamed file')
  assert.notEqual(mediaVersion(a.slice(1)), v, 'a removed file')
})

test('the url is the media release of that version', () => {
  assert.equal(mediaUrl('lodepav/openGym-Hevier', '0123456789ab'),
    'https://github.com/lodepav/openGym-Hevier/releases/download/gohevier-media-0123456789ab/go-hevier-media-0123456789ab.zip')
})

test('the zip holds the files at its root, and only mtimes changing keeps the version', () => {
  const dir = mkdtempSync(join(tmpdir(), 'media-zip-'))
  try {
    const m = join(dir, 'stage', 'exercise-media')
    mkdirSync(join(m, 'still'), { recursive: true })
    writeFileSync(join(m, 'still', 'x.webp'), 'still')
    writeFileSync(join(m, 'NOTICE.md'), 'notice')
    const r = makeMediaZip(join(dir, 'stage'), join(dir, 'out'), 'o/r')
    assert.equal(r.file, join(dir, 'out', `go-hevier-media-${r.version}.zip`))
    assert.equal(r.url, mediaUrl('o/r', r.version))
    const listed = execFileSync('unzip', ['-Z1', r.file], { encoding: 'utf8' }).trim().split('\n').sort()
    assert.deepEqual(listed, ['NOTICE.md', 'still/x.webp'])
    const zip = readFileSync(r.file)
    assert.equal(r.bytes, zip.length)
    assert.equal(r.sha256, createHash('sha256').update(zip).digest('hex'))
    assert.equal(readFileSync(r.file + '.sha256', 'utf8'), `${r.sha256}  go-hevier-media-${r.version}.zip\n`)
    const { file, ...env } = r
    assert.deepEqual(wantedMedia(JSON.stringify(env)), env, 'the app takes it as VITE_HEVIER_MEDIA')

    utimesSync(join(m, 'NOTICE.md'), new Date(2001, 0, 1), new Date(2001, 0, 1))
    const again = makeMediaZip(join(dir, 'stage'), join(dir, 'out'), 'o/r')
    assert.equal(again.version, r.version)
    assert.equal(again.sha256, r.sha256, 'the same pictures give the same zip, byte for byte')
    writeFileSync(join(m, 'NOTICE.md'), 'notice 2')
    assert.notEqual(makeMediaZip(join(dir, 'stage'), join(dir, 'out'), 'o/r').version, r.version)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
