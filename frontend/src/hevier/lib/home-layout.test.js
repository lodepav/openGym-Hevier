import { afterEach, describe, expect, it, vi } from 'vitest'
import { readHome, moveHomeIntoS, HOME_KEY } from './home-layout.js'

// A Storage stand-in, so the old device-local copy can be read once and forgotten.
const fakeStorage = init => {
  const m = new Map(Object.entries(init))
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), has: k => m.has(k) }
}

describe('the stored Home layout', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reads S first, else the copy this device kept before', () => {
    const old = { order: ['feed', 'today'], hidden: [] }
    vi.stubGlobal('localStorage', fakeStorage({ [HOME_KEY]: JSON.stringify(old) }))
    expect(readHome({})).toEqual(old)
    expect(readHome({ hvHome: { order: ['today'], hidden: [] } })).toEqual({ order: ['today'], hidden: [] })
  })

  it('moves the device’s layout into S once, and only once', () => {
    const ls = fakeStorage({ [HOME_KEY]: JSON.stringify({ order: ['feed'], hidden: ['streak'] }) })
    vi.stubGlobal('localStorage', ls)
    const s = {}
    expect(moveHomeIntoS(s)).toBe(true)
    expect(s.hvHome).toEqual({ order: ['feed'], hidden: ['streak'] })
    expect(ls.has(HOME_KEY)).toBe(false)
    expect(moveHomeIntoS(s)).toBe(false)
  })
})
