import { describe, expect, it } from 'vitest'
import { daysAgo } from './days-ago.js'

const back = (today, n) => { const d = new Date(today + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10) }
const T = '2026-11-22'

describe('daysAgo: one scale', () => {
  it('weeks up to 8 weeks, months from 63 days', () => {
    expect(daysAgo(back(T, 33), T)).toBe('4 weeks ago')
    expect(daysAgo(back(T, 36), T)).toBe('5 weeks ago')
    expect(daysAgo(back(T, 62), T)).toBe('8 weeks ago')
    expect(daysAgo(back(T, 63), T)).toBe('2 months ago')
  })
  it('days and the first weeks as upstream says them', () => {
    expect(daysAgo(back(T, 1), T)).toBe('yesterday')
    expect(daysAgo(back(T, 8), T)).toBe('last week')
  })
})
