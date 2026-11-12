import { describe, it, expect } from 'vitest'
import { shouldOffer, offerNow } from './update-notice.js'

const info = { hasUpdate: true, latestVersion: '1.3.0', apkUrl: 'https://x/app.apk', hashUrl: 'https://x/app.apk.sha256' }

describe('shouldOffer', () => {
  it('offers a newer version with an APK', () => {
    expect(shouldOffer(info, '', false)).toBe(true)
  })
  it('does not offer a version already answered, but does the next one', () => {
    expect(shouldOffer(info, '1.3.0', false)).toBe(false)
    expect(shouldOffer({ ...info, latestVersion: '1.3.1' }, '1.3.0', false)).toBe(true)
  })
  it('waits while a workout is open', () => {
    expect(shouldOffer(info, '', true)).toBe(false)
  })
  it('offers nothing without an update or an APK to install', () => {
    expect(shouldOffer({ ...info, hasUpdate: false }, '', false)).toBe(false)
    expect(shouldOffer({ ...info, apkUrl: null }, '', false)).toBe(false)
    expect(shouldOffer(null, '', false)).toBe(false)
  })
})

describe('offerNow', () => {
  it('holds a due offer back while busy, and has nothing to hold otherwise', () => {
    expect(offerNow(info, '', false)).toBe('offer')
    expect(offerNow(info, '', true)).toBe('wait')
    expect(offerNow(info, '1.3.0', true)).toBe('no')
    expect(offerNow(null, '', false)).toBe('no')
  })
})
