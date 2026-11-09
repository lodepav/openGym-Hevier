// OpenBite's part in Modules (hevier/DECISIONS.md D114): while it is off, OpenBite reads no row.
import { describe, expect, it, vi } from 'vitest'

const put = vi.fn(async () => {})
vi.mock('../../lib/mobile.js', async orig => ({ ...(await orig()), MOBILE: true, isAndroid: async () => true }))
vi.mock('@capacitor/core', async orig => ({ ...(await orig()), registerPlugin: () => ({ put }) }))
vi.mock('@capacitor/app', () => ({ App: { addListener: () => {} } }))
vi.mock('./strength-signal.js', () => ({ strengthSignal: () => ({ trend: 'up' }) }))
const { initStrengthSignal } = await import('./strength-signal-run.js')

describe('the strength row for OpenBite (D95, D114)', () => {
  it('is cleared while OpenBite’s part is off, and written once it is on', async () => {
    vi.useFakeTimers()
    let S = { hvModuleParts: { 'integrations.openbite': false } }, onChange = null
    initStrengthSignal({ get: () => S, watch: () => fn => { onChange = fn } }, () => '2026-11-09')
    await vi.advanceTimersByTimeAsync(2600)
    await vi.waitFor(() => expect(put).toHaveBeenCalled())
    expect(put).toHaveBeenLastCalledWith({ row: null })
    S = { hvModuleParts: {} }
    onChange()
    await vi.advanceTimersByTimeAsync(2100)
    await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(2))
    expect(put).toHaveBeenLastCalledWith({ row: JSON.stringify({ trend: 'up' }) })
    vi.useRealTimers()
  })
})
