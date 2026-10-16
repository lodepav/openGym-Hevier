import { describe, expect, it } from 'vitest'
import { weeklySeries } from './weekly-series.js'

const H = 3600000
const w = (d, extra = {}) => ({ d, start: 1000, end: 1000 + H, vol: 1000, entries: [], ...extra })

describe('weeklySeries', () => {
  it('has one bar per week, oldest first, ending with the current week', () => {
    const out = weeklySeries([], 'volume', { today: '2026-10-16', weeks: 3, weekStart: 1 })
    expect(out.map(p => p.week)).toEqual(['2026-09-28', '2026-10-05', '2026-10-12'])
    expect(out.every(p => p.value === 0)).toBe(true)
  })

  it('sums each week’s workouts and drops ones outside the range', () => {
    const ws = [w('2026-10-12'), w('2026-10-16', { vol: 500 }), w('2026-10-06'), w('2025-01-01')]
    const vol = weeklySeries(ws, 'volume', { today: '2026-10-16', weeks: 2, weekStart: 1 })
    expect(vol.map(p => p.value)).toEqual([1000, 1500])
    const dur = weeklySeries(ws, 'duration', { today: '2026-10-16', weeks: 2, weekStart: 1 })
    expect(dur.map(p => p.value)).toEqual([H, 2 * H])
  })

  it('follows the profile’s first weekday', () => {
    // Sunday 2026-10-11: last week from Monday, this week from Sunday.
    const ws = [w('2026-10-11')]
    expect(weeklySeries(ws, 'volume', { today: '2026-10-16', weeks: 1, weekStart: 1 })[0].value).toBe(0)
    expect(weeklySeries(ws, 'volume', { today: '2026-10-16', weeks: 1, weekStart: 0 })[0].value).toBe(1000)
  })

  it('counts completed work reps, not warm-ups or open sets', () => {
    const entries = [{ id: 'x', sets: [
      { w: 20, r: 10, done: true, warmup: true }, { w: 60, r: 8, done: true }, { w: 60, r: 8, done: false },
    ] }]
    const out = weeklySeries([w('2026-10-14', { entries })], 'reps', { today: '2026-10-16', weeks: 1, weekStart: 1 })
    expect(out[0].value).toBe(8)
  })
})
