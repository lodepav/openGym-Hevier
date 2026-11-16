import { describe, it, expect } from 'vitest'
import { detailRows, sideSet, recordsOnRow, effortShown } from './side-rows.js'

const sd = (w, r, extra = {}) => ({ w, r, done: true, ...extra })

describe('detailRows (D133)', () => {
  it('lists a per-side set as an L row and an R row, effort and heart rate on the first', () => {
    const sets = [{ w: 20, r: 19, done: true, rpe: 8, hr: { avg: 110 }, sides: { L: sd(20, 10, { rpe: 8 }), R: sd(20, 9, { rpe: 7 }) } }]
    const rows = detailRows(sets)
    expect(rows.map(r => [r.side, r.s.w, r.s.r, r.head, r.last])).toEqual([['L', 20, 10, true, false], ['R', 20, 9, false, true]])
    expect(rows.map(r => r.effort)).toEqual([{ rpe: 8 }, null])
    expect(rows.map(r => r.hr)).toEqual([{ avg: 110 }, null])
    expect(rows[0].s.sides).toBeUndefined()
  })

  it('keeps the warm-up, failure and drop marks, each side with its own drops', () => {
    expect(sideSet({ phase: 'warmup', sides: { L: sd(10, 12), R: sd(10, 11) } }, 'R')).toEqual({ phase: 'warmup', w: 10, r: 11, done: true })
    expect(sideSet({ failure: true, w: 20, r: 15, sides: { L: sd(20, 8), R: sd(20, 7) } }, 'L')).toEqual({ failure: true, w: 20, r: 8, done: true })
    const drop = { type: 'dropset', w: 20, r: 16, done: true, sides: {
      L: sd(20, 8, { type: 'dropset', drops: [{ w: 15, r: 6 }] }), R: sd(20, 8, { type: 'dropset', drops: [{ w: 15, r: 5 }] }) } }
    expect(detailRows([drop]).map(r => r.s.drops)).toEqual([[{ w: 15, r: 6 }], [{ w: 15, r: 5 }]])
  })

  it('marks a side left unticked, and leaves out sets not done', () => {
    const rows = detailRows([{ w: 20, r: 10, done: false }, { sides: { L: sd(20, 10), R: { w: 20, r: 10, done: false } } }])
    expect(rows.map(r => [r.i, r.side, r.undone])).toEqual([[1, 'L', false], [1, 'R', true]])
  })

  it('reads a per-side hold pair as one set, its effort the harder half', () => {
    const rows = detailRows([{ side: 'L', mode: 'time', sec: 45, done: true, rpe: 7 }, { side: 'R', mode: 'time', sec: 40, done: true, rpe: 8, hr: { avg: 90 } }])
    expect(rows.map(r => [r.i, r.side, r.head, r.last])).toEqual([[0, 'L', true, false], [1, 'R', false, true]])
    expect(rows[0].effort).toEqual({ rpe: 8 })
    expect(rows[0].hr).toEqual({ avg: 90 })
  })

  it('a plain set is one row', () => {
    expect(detailRows([{ w: 30, r: 5, done: true, rir: 2 }]).map(r => [r.side, r.head, r.last, r.effort])).toEqual([[null, true, true, { rir: 2 }]])
  })
})

describe('effortShown', () => {
  it('writes the effort on the page’s scale', () => {
    expect(effortShown({ rpe: 8 }, 'rpe')).toBe(8)
    expect(effortShown({ rpe: 8 }, 'rir')).toBe(2)
    expect(effortShown({ rir: 1 }, 'rpe')).toBe(9)
    expect(effortShown(null, 'rpe')).toBeNull()
  })
})

describe('recordsOnRow', () => {
  const sets = [{ w: 20, r: 19, done: true, sides: { L: sd(20, 9), R: sd(20, 10) } }, { w: 30, r: 5, done: true }]
  const rows = detailRows(sets)
  const recs = [{ kind: 'weight', set: 0, v: 20, r: 10 }, { kind: 'e1rm', set: 0, w: 20, r: 10, v: 26 }, { kind: 'sessionVol', set: -1, v: 530 }, { kind: 'setVol', set: 1, w: 30, r: 5, v: 150 }]
  it('puts a per-side set’s record on its side, a session’s on the last work set', () => {
    expect(rows.map(r => recordsOnRow(r, recs, sets, 1).map(x => x.kind))).toEqual([[], ['weight', 'e1rm'], ['sessionVol', 'setVol']])
  })
})
