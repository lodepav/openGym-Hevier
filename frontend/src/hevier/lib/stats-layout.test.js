import { describe, expect, it } from 'vitest'
import { TILES, CARDS, arrange, shown, move, moveAmong, toggle, defaults, moduleOn } from './stats-layout.js'

describe('Statistics layout (D142)', () => {
  it('starts in the first order, the optional tiles hidden', () => {
    expect(arrange(TILES)).toEqual({ order: TILES, hidden: ['month', 'rpe'] })
    expect(shown(TILES)).toEqual(['time', 'weight', 'sets', 'hours'])
    expect(shown(CARDS)).toEqual(CARDS)
  })

  it('keeps a saved order and puts an id it does not know at the end', () => {
    const saved = { order: ['hours', 'time', 'weight'], hidden: ['weight'] }
    expect(arrange(TILES, saved).order).toEqual(['hours', 'time', 'weight', 'sets', 'month', 'rpe'])
    expect(shown(TILES, saved)).toEqual(['hours', 'time', 'sets'])
  })

  it('drops what it does not know or cannot read, from sync or a backup', () => {
    expect(arrange(CARDS, { order: ['old', 'weekly', 'weekly'], hidden: 'x' })).toEqual({ order: ['weekly', 'time', 'weight', 'sets'], hidden: [] })
    expect(arrange(CARDS, { order: ['time'], hidden: ['gone'] }).hidden).toEqual([])
  })

  it('shows an optional tile once it is switched on, and hides it again', () => {
    const on = toggle(arrange(TILES), 'rpe')
    expect(shown(TILES, on)).toEqual(['time', 'weight', 'sets', 'hours', 'rpe'])
    expect(shown(TILES, toggle(arrange(TILES, on), 'rpe'))).not.toContain('rpe')
    expect(shown(TILES, toggle(arrange(TILES), 'time'))).toEqual(['weight', 'sets', 'hours'])
  })

  it('moves an item, and leaves a move out of range alone', () => {
    const l = move(arrange(CARDS), 3, 0)
    expect(l.order).toEqual(['weekly', 'time', 'weight', 'sets'])
    expect(move(l, 0, 9)).toBe(l)
  })

  it('resets to the first layout', () => {
    expect(defaults()).toEqual({ tiles: arrange(TILES), cards: arrange(CARDS) })
    expect(shown(TILES, defaults().tiles)).toEqual(shown(TILES))
  })

  it('moves among the listed items, leaving one not listed in its place', () => {
    const l = arrange(TILES)   // time, weight, sets, hours, month, rpe
    const listed = ['time', 'sets', 'hours']
    expect(moveAmong(l, listed, 0, 1).order).toEqual(['weight', 'sets', 'time', 'hours', 'month', 'rpe'])
    expect(moveAmong(l, listed, 2, 1).order).toEqual(['time', 'weight', 'hours', 'sets', 'month', 'rpe'])
    expect(moveAmong(l, listed, 0, 5)).toBe(l)
  })

  it('an item goes with its module or part; the others always show', () => {
    const S = { modules: { body: true, effort: true } }
    expect(moduleOn({ ...S, modules: { ...S.modules, body: false } }, 'weight')).toBe(false)
    expect(moduleOn({ ...S, hvModuleParts: { 'body.weight': false } }, 'weight')).toBe(false)
    expect(moduleOn({ ...S, hvModuleParts: { 'hvStats.time': false } }, 'time')).toBe(false)
    expect(moduleOn({ ...S, modules: { ...S.modules, effort: false } }, 'rpe')).toBe(false)
    expect(moduleOn({ ...S, modules: { ...S.modules, effort: true } }, 'rpe')).toBe(true)
    expect(['sets', 'hours', 'month', 'weekly'].every(id => moduleOn({ ...S, modules: {} }, id))).toBe(true)
  })
})
