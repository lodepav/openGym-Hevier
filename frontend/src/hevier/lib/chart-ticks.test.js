import { describe, expect, it } from 'vitest'
import { chartTicks } from './chart-ticks.js'

const day = (d, h = 12) => new Date(2026, 9, d, h).getTime()

describe('hevier chart labels without repeats (S30)', () => {
  it('a span of two days names each day once, the end at the end', () => {
    const t0 = day(16, 10), t1 = day(17, 18)
    const ticks = [{ t: t0, txt: '16 Oct', anchor: 'start' }, { t: (t0 + t1) / 2, txt: '17 Oct', anchor: 'middle' }, { t: t1, txt: '17 Oct', anchor: 'end' }]
    expect(chartTicks(ticks, t0, t1).map(k => [k.txt, k.anchor])).toEqual([['16 Oct', 'start'], ['17 Oct', 'end']])
  })
  it('one day is one label, in the middle', () => {
    const t0 = day(16, 9), t1 = day(16, 19)
    const ticks = ['start', 'middle', 'end'].map((anchor, i) => ({ t: t0 + i * (t1 - t0) / 2, txt: '16 Oct', anchor }))
    expect(chartTicks(ticks, t0, t1)).toEqual([{ t: (t0 + t1) / 2, txt: '16 Oct', anchor: 'middle' }])
  })
  it('three different days stay as they are', () => {
    const ticks = [{ t: 1, txt: '1 Oct', anchor: 'start' }, { t: 2, txt: '8 Oct', anchor: 'middle' }, { t: 3, txt: '15 Oct', anchor: 'end' }]
    expect(chartTicks(ticks, 1, 3)).toEqual(ticks)
  })
  it('months say their year only over more than a year', () => {
    const m = (y, mo) => ({ t: new Date(y, mo, 1).getTime(), txt: ['Jan', 'Apr', 'Jul', 'Oct'][mo / 3] })
    const long = [m(2025, 3), m(2025, 9), m(2026, 3)]
    expect(chartTicks(long, new Date(2025, 2, 18).getTime(), new Date(2026, 9, 17).getTime()).map(k => k.txt)).toEqual(["Apr '25", "Oct '25", "Apr '26"])
    const year = [m(2025, 9), m(2026, 0)]
    expect(chartTicks(year, new Date(2025, 9, 1).getTime(), new Date(2026, 8, 30).getTime())).toEqual(year)
  })
})
