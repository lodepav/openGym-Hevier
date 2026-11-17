// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { initMeaningColours, ACCENT_KEY } from './meaning-colours-run.js'
import { storeAdapter } from './store-watch.js'

vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

const css = k => document.documentElement.style.getPropertyValue(k)

beforeEach(() => useStore.setState({ S: { ...JSON.parse(JSON.stringify(DEF)), accent: 'custom', accentCustom: '#34d08a' }, user: null }))

describe('the meaning colours on the page (D123)', () => {
  it('sets them at launch and again when the accent changes, and keeps the accent for the boot screen', () => {
    initMeaningColours(storeAdapter(useStore, () => {}))
    expect(css('--hv-cardio')).toBe('#40c8e0')
    expect(css('--hv-drop')).toBe('#008cff')
    expect(localStorage.getItem(ACCENT_KEY)).toBe('#34d08a')
    expect(css('--hv-acc-ink')).toBe('#34d08a')
    useStore.getState().update(s => { s.accentCustom = '#008cff' })
    expect(css('--hv-cardio')).toBe('#2fbf5b')
    expect(css('--hv-drop')).toBe('#40c8e0')
    expect(css('--hv-note')).toBe('#efab03')
    expect(localStorage.getItem(ACCENT_KEY)).toBe('#008cff')
    useStore.getState().update(s => { s.accentCustom = '#007aff' })
    expect(css('--hv-acc-ink')).toBe('#1485ff')
  })
})
