import { describe, it, expect } from 'vitest'
import { monthHeads } from './history-months.js'

describe('History: a header where each month starts (the critique, 2026-11-20)', () => {
  it('marks the first workout of each month, newest first, with the month’s count', () => {
    const ws = [{ d: '2026-11-17' }, { d: '2026-10-20' }, { d: '2026-10-17' }, { d: '2025-10-03' }]
    expect([...monthHeads(ws)]).toEqual([[0, { ym: '2026-11', n: 1 }], [1, { ym: '2026-10', n: 2 }], [3, { ym: '2025-10', n: 1 }]])
  })
  it('skips a workout without a date', () => {
    expect([...monthHeads([{ d: '' }, { d: '2026-11-01' }])]).toEqual([[1, { ym: '2026-11', n: 1 }]])
  })
})
