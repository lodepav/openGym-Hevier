import { describe, expect, it } from 'vitest'
import { wantedMedia, mediaPlan, mbText } from './media-pack.js'
import { pickApk } from '../../lib/update.js'

const want = { version: 'a1b2c3d4e5f6', url: 'https://github.com/o/r/releases/download/gohevier-media-a1b2c3d4e5f6/go-hevier-media-a1b2c3d4e5f6.zip', sha256: 'f'.repeat(64), bytes: 227_000_000 }

describe('hevier: the exercise pictures as a download (D115)', () => {
  it('reads the build’s media, and nothing from a build that carries its own', () => {
    expect(wantedMedia(JSON.stringify(want))).toEqual(want)
    expect(wantedMedia(undefined)).toBe(null)
    expect(wantedMedia('{')).toBe(null)
    expect(wantedMedia({ ...want, url: 'http://x' })).toBe(null)
    expect(wantedMedia({ ...want, url: 'http://localhost:8765/m.zip' }).url).toBe('http://localhost:8765/m.zip')
    expect(wantedMedia({ ...want, version: 'nope' })).toBe(null)
  })
  it('asks when the media are missing or another version, never when the APK or storage has them', () => {
    expect(mediaPlan(want, { bundled: false, version: null }, '')).toBe('ask')
    expect(mediaPlan(want, { bundled: false, version: '000000000000' }, '')).toBe('ask')
    expect(mediaPlan(want, { bundled: false, version: want.version }, '')).toBe('none')
    expect(mediaPlan(want, { bundled: true, version: null }, '')).toBe('none')
    expect(mediaPlan(null, { bundled: false, version: null }, '')).toBe('none')
    expect(mediaPlan(want, null, '')).toBe('none')
  })
  it('Not now holds for that version only', () => {
    expect(mediaPlan(want, { bundled: false, version: null }, want.version)).toBe('later')
    expect(mediaPlan(want, { bundled: false, version: null }, '111111111111')).toBe('ask')
  })
  it('the updater takes the lean APK, not the full one, in a release that has both', () => {
    const a = n => ({ name: n, browser_download_url: 'https://x/' + n })
    const assets = [a('go-hevier-2.6.0.apk'), a('go-hevier-2.6.0.apk.sha256'), a('go-hevier-full-2.6.0.apk'), a('go-hevier-full-2.6.0.apk.sha256')]
    expect(pickApk(assets, 'standard').apk.name).toBe('go-hevier-2.6.0.apk')
    expect(pickApk([...assets].sort((x, y) => x.name.localeCompare(y.name)), 'standard').apk.name).toBe('go-hevier-2.6.0.apk')
    expect(pickApk(assets, 'standard').hash.name).toBe('go-hevier-2.6.0.apk.sha256')
  })
  it('sizes in MB', () => expect(mbText(227_000_000)).toBe('216 MB'))
})
