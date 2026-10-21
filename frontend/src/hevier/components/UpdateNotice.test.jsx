// @vitest-environment happy-dom
// D77: a newer Go Hevier asks once when the app opens, Install going About's way.
import { describe, expect, it, vi } from 'vitest'

const info = { hasUpdate: true, latestVersion: '1.3.0', apkUrl: 'https://x/app.apk', hashUrl: 'https://x/app.apk.sha256' }
const install = vi.fn(async () => {})
vi.mock('../../lib/mobile.js', async orig => ({ ...(await orig()), MOBILE: true, isAndroid: async () => true }))
vi.mock('../../lib/update.js', () => ({
  checkForUpdate: async () => info,
  fetchChecksum: async () => 'a'.repeat(64),
  downloadAndInstall: (...a) => install(...a),
}))
const menu = vi.fn()
vi.mock('../../sheets.jsx', () => ({ menuSheet: o => menu(o) }))
const { initUpdateNotice } = await import('./UpdateNotice.jsx')
const { SEEN_KEY } = await import('../lib/update-notice.js')

describe('initUpdateNotice', () => {
  it('asks once per version, and Install downloads and installs with the checksum', async () => {
    vi.useFakeTimers()
    let S = { active: null }
    initUpdateNotice({ get: () => S })
    await vi.advanceTimersByTimeAsync(4000)
    expect(menu).toHaveBeenCalledTimes(1)
    const o = menu.mock.calls[0][0]
    expect(o.title).toContain('1.3.0')
    expect(localStorage.getItem(SEEN_KEY)).toBe('1.3.0')
    await o.items[0].onClick()
    await vi.advanceTimersByTimeAsync(0)
    expect(install).toHaveBeenCalledWith(info.apkUrl, 'a'.repeat(64), expect.any(Function))
    // back to the app: already answered
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(1000)
    expect(menu).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
