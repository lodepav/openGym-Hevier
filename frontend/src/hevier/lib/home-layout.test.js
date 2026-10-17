import { describe, expect, it } from 'vitest'
import { homeWidgets, storedLayout, WIDGETS } from './home-layout.js'

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
