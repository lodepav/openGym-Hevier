#!/usr/bin/env node
// The exercise pictures as one zip of their own, for the lean APK to download (D115):
//
//   node hevier/tools/media-zip.mjs <stagedDir> <outDir> <owner/repo>
//
// stagedDir holds exercise-media/ as scripts/catalogue/stage-media.mjs writes it (180 px only:
// never point it at APP_MEDIA_DIR or anything larger). The zip holds still/..., clip/... and
// NOTICE.md at its root, stored without compression (the files are compressed already), and its
// name carries the media version: the first 12 hex of a SHA-256 over every file's path and
// content hash, so the same pictures always give the same version, whatever their mtimes.
// It writes <outDir>/go-hevier-media-<version>.zip and its .sha256 (sha256sum format), and prints
// one JSON line: { version, url, sha256, bytes, file }. Everything but file is VITE_HEVIER_MEDIA,
// the contract in frontend/src/hevier/lib/media-pack.js.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync, rmSync, utimesSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const FIXED = new Date(Date.UTC(2000, 0, 1))
const sha256 = buf => createHash('sha256').update(buf).digest('hex')

/** The media version from [{ path, sha256 }]: order-independent, a content hash. */
export function mediaVersion(files) {
  const lines = files.map(f => `${f.path}\0${f.sha256}\n`).sort()
  return sha256(lines.join('')).slice(0, 12)
}

/** Where the zip of this version is published: a GitHub release of its own per media version. */
export function mediaUrl(repo, version) {
  return `https://github.com/${repo}/releases/download/gohevier-media-${version}/go-hevier-media-${version}.zip`
}

/** Every file under dir, as paths relative to it with forward slashes, sorted. */
export function listFiles(dir, prefix = '') {
  const out = []
  for (const e of readdirSync(join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name
    if (e.isDirectory()) out.push(...listFiles(dir, rel))
    else if (e.isFile()) out.push(rel)
  }
  return out.sort()
}

/** Builds the zip and its .sha256; returns { version, url, sha256, bytes, file }. */
export function makeMediaZip(stagedDir, outDir, repo) {
  const media = resolve(stagedDir, 'exercise-media')
  const paths = listFiles(media)
  if (!paths.length) throw new Error(`no files under ${media}`)
  const version = mediaVersion(paths.map(path => ({ path, sha256: sha256(readFileSync(join(media, path))) })))
  mkdirSync(outDir, { recursive: true })
  const file = resolve(outDir, `go-hevier-media-${version}.zip`)
  rmSync(file, { force: true })  // zip adds to an existing archive
  // The same pictures must give the same zip, byte for byte: a later release whose media release
  // already exists builds in this SHA-256, and the phone checks the published zip against it. zip
  // writes each file's mtime (as local time), so every staged file gets one fixed time, read in UTC.
  for (const p of paths) utimesSync(join(media, p), FIXED, FIXED)
  // -0 stores, -X leaves out extra attributes (uid, times), -@ reads the sorted list from stdin.
  execFileSync('zip', ['-q', '-0', '-X', file, '-@'], { cwd: media, env: { ...process.env, TZ: 'UTC' }, input: paths.join('\n') + '\n', stdio: ['pipe', 'ignore', 'inherit'] })
  const digest = sha256(readFileSync(file))
  writeFileSync(file + '.sha256', `${digest}  ${basename(file)}\n`)
  return { version, url: mediaUrl(repo, version), sha256: digest, bytes: statSync(file).size, file }
}

function main([staged, out, repo]) {
  if (!staged || !out || !/^[^/\s]+\/[^/\s]+$/.test(repo || '')) {
    process.stderr.write('usage: media-zip.mjs <stagedDir> <outDir> <owner/repo>\n')
    process.exit(2)
  }
  process.stdout.write(JSON.stringify(makeMediaZip(staged, out, repo)) + '\n')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main(process.argv.slice(2))
