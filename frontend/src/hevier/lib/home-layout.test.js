import { afterEach, describe, expect, it, vi } from 'vitest'
import { homeWidgets, storedLayout, readHome, writeHome, HOME_KEY, WIDGETS } from './home-layout.js'

const S = { showWeightCard: true, checkIn: true }
const ids = ws => ws.map(w => w.id)
const on = ws => ws.filter(w => w.on).map(w => w.id)

describe('homeWidgets', () => {
  it('starts from the default order with the extras off', () => {
    const ws = homeWidgets(null, S)
    expect(ids(ws)).toEqual(WIDGETS)
    expect(on(ws)).toEqual(['today', 'weight', 'feed'])
  })

  it('reads the weight card from upstream’s switch; the gym check-in is no widget, on or off', () => {
    const ws = homeWidgets({ order: WIDGETS, hidden: [] }, { showWeightCard: false, checkIn: false })
    expect(on(ws)).toEqual(['today', 'streak', 'recovery', 'weekly', 'feed'])
  })

  it('never hides the feed', () => {
    expect(on(homeWidgets({ order: [], hidden: ['feed'] }, S))).toContain('feed')
  })

  it('keeps a stored order, drops unknown ids and slots in new ones after their default neighbour', () => {
    const ws = homeWidgets({ order: ['feed', 'gone', 'today', 'feed', 'weight'], hidden: [] }, S)
    expect(ids(ws)).toEqual(['feed', 'today', 'streak', 'weight', 'recovery', 'weekly'])
  })

  it('drops the gym check-in from a layout stored before it went', () => {
    expect(ids(homeWidgets({ order: ['checkin', 'today', 'feed'], hidden: [] }, S))).not.toContain('checkin')
  })

  it('round-trips through its stored form', () => {
    const ws = homeWidgets(null, S).reverse().map(w => (w.id === 'streak' ? { ...w, on: true } : w))
    const stored = storedLayout(ws)
    expect(stored.hidden).toEqual(['weekly', 'recovery'])
    expect(homeWidgets(stored, S)).toEqual(ws)
  })
})

// A Storage stand-in, so the old device-local copy can be read once and forgotten.
const fakeStorage = init => {
  const m = new Map(Object.entries(init))
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), has: k => m.has(k) }
}

describe('the stored Home layout', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reads S first, else the copy this device kept before, and writing moves it into S', () => {
    const old = { order: ['feed', 'today'], hidden: [] }
    const ls = fakeStorage({ [HOME_KEY]: JSON.stringify(old) })
    vi.stubGlobal('localStorage', ls)
    const s = {}
    expect(readHome(s)).toEqual(old)
    writeHome(s, homeWidgets(readHome(s), S))
    expect(s.hvHome.order.slice(0, 2)).toEqual(['feed', 'today'])
    expect(ls.has(HOME_KEY)).toBe(false)
    expect(readHome({ hvHome: { order: ['today'], hidden: [] } })).toEqual({ order: ['today'], hidden: [] })
  })
})
