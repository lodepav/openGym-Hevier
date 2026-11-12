// @vitest-environment happy-dom
// D77: a newer Go Hevier asks once when the app opens, Install going About's way.
import { describe, expect, it, vi } from 'vitest'

const info = { hasUpdate: true, latestVersion: '1.3.0', apkUrl: 'https://x/app.apk', hashUrl: 'https://x/app.apk.sha256',
  apkApiUrl: 'https://api/assets/1', hashApiUrl: 'https://api/assets/2' }
const install = vi.fn(async () => {})
const checksum = vi.fn(async () => 'a'.repeat(64))
vi.mock('../../lib/mobile.js', async orig => ({ ...(await orig()), MOBILE: true, isAndroid: async () => true }))
const check = vi.fn(async () => info)
const reset = vi.fn()
vi.mock('../../lib/update.js', () => ({
  checkForUpdate: (...a) => check(...a),
  resetUpdateCheck: (...a) => reset(...a),
  fetchChecksum: (...a) => checksum(...a),
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
    // Another sheet open (the pictures' question, D115): not on top of it, but once it is closed,
    // also when GitHub cannot be asked again by then.
    const { useUI } = await import('../../store/useUI.js')
    useUI.getState().openSheet(() => null)
    await vi.advanceTimersByTimeAsync(4000)
    expect(menu).not.toHaveBeenCalled()
    expect(localStorage.getItem(SEEN_KEY)).toBe(null)
    check.mockImplementationOnce(async () => { throw new Error('offline') })
    useUI.getState().closeAll()
    await vi.advanceTimersByTimeAsync(1000)
    expect(menu).toHaveBeenCalledTimes(1)
    // The session's answer is asked again only after an hour.
    expect(reset).toHaveBeenCalledTimes(1)
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(1000)
    expect(reset).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(61 * 60000)
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(1000)
    expect(reset).toHaveBeenCalledTimes(2)
    expect(menu).toHaveBeenCalledTimes(1)
    const o = menu.mock.calls[0][0]
    expect(o.title).toContain('1.3.0')
    expect(localStorage.getItem(SEEN_KEY)).toBe('1.3.0')
    await o.items[0].onClick()
    await vi.advanceTimersByTimeAsync(0)
    expect(checksum).toHaveBeenCalledWith(info.hashUrl, info.hashApiUrl)
    expect(install).toHaveBeenCalledWith(info.apkUrl, 'a'.repeat(64), expect.any(Function), info.apkApiUrl)
    // back to the app: already answered
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(1000)
    expect(menu).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
