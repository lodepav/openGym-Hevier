import { describe, it, expect } from 'vitest'
import { untimedApart } from './untimed-rows.js'

describe('untimedApart', () => {
  it('keeps the timed rows in their sections and gathers the rest in one list', () => {
    const sections = [
      { key: 'chest', total: 60, rows: [{ id: 'a', avg: 30 }, { id: 'b', avg: null, quick: true }] },
      { key: 'legs', total: 0, rows: [{ id: 'c', avg: null }] },
    ]
    const { timed, untimed } = untimedApart(sections)
    expect(timed).toEqual([{ key: 'chest', total: 60, rows: [{ id: 'a', avg: 30 }] }])
    expect(untimed.map(r => r.id)).toEqual(['b', 'c'])
    expect(sections[0].rows).toHaveLength(2)   // not changed in place
  })
  it('lists an exercise without a time at two gyms once, its sessions added', () => {
    const sections = [
      { key: 'g1', total: 0, rows: [{ id: 'a', avg: null, sessions: 2, quick: false }] },
      { key: 'g2', total: 0, rows: [{ id: 'a', avg: null, sessions: 1, quick: true }] },
    ]
    expect(untimedApart(sections).untimed).toEqual([{ id: 'a', avg: null, sessions: 3, quick: true }])
  })
  it('with nothing untimed, the sections as they were', () => {
    const sections = [{ key: '', total: 0, rows: [{ id: 'a', avg: 30 }] }]
    expect(untimedApart(sections)).toEqual({ timed: sections, untimed: [] })
    expect(untimedApart([])).toEqual({ timed: [], untimed: [] })
  })
})
