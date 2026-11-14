import { describe, expect, it } from 'vitest'
import { sideBalance } from './side-balance.js'
import { exerciseSummary } from './exercise-summary.js'
import { countedS } from './counted.js'
import { EXDB } from '../../lib/exercises.js'

const ROW = EXDB.find(e => /^lever seated row$/i.test(e.n)).id
const side = (w, r, done = true) => ({ w, r, done })
const pair = (l, r) => ({ w: Math.max(l[0], r[0]), r: l[1] + r[1], done: true, sides: { L: side(...l), R: side(...r) } })
// Imported history: a day only, no clock, no routine, no tick times.
const day = (d, sets, extra = {}) => ({ id: d, d, routineId: null, entries: [{ id: ROW, sets, ...extra }] })
const sessions = workouts => exerciseSummary(countedS({ workouts }), ROW).sessions

describe('hevier: left against right (side-balance)', () => {
  it('says nothing without per-side sessions, or with fewer than three', () => {
    expect(sideBalance([], ROW)).toBeNull()
    expect(sideBalance(sessions([day('2026-01-01', [{ w: 30, r: 8, done: true }])]), ROW)).toBeNull()
    expect(sideBalance(sessions([day('2026-01-01', [pair([30, 6], [30, 9])]), day('2026-01-02', [pair([30, 6], [30, 9])])]), ROW)).toBeNull()
  })

  it('says nothing when the two sides were the same every time (an import splits one number in two)', () => {
    const same = d => day(d, [pair([30, 8], [30, 8])])
    expect(sideBalance(sessions([same('2026-01-01'), same('2026-01-02'), same('2026-01-03')]), ROW)).toBeNull()
  })

  it('holds each side’s best estimated 1RM, the last five sessions, by hand', () => {
    // Epley: 30 × 6 = 36, 30 × 9 = 39, so right leads by 39 / 36 = 8.3 %. The oldest session
    // (left far stronger) is the sixth back and left out; the kept-out one (D57) never counts.
    const ws = [
      day('2026-01-01', [pair([60, 10], [20, 5])]),
      ...['2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06'].map(d => day(d, [pair([25, 6], [25, 8]), pair([30, 6], [30, 9])])),
      day('2026-01-07', [pair([80, 10], [20, 5])], { noProg: true }),
    ]
    expect(sideBalance(sessions(ws), ROW)).toEqual({ even: false, side: 'R', pct: 8, n: 5 })
  })

  it('calls a lead of 3 % or less even, and a stronger left left', () => {
    // 30 × 7 = 37 against 36: 2.8 %, even. 36 against 30 × 3 = 33: left leads by 9 %.
    const even = ['2026-02-01', '2026-02-02', '2026-02-03'].map(d => day(d, [pair([30, 6], [30, 7])]))
    expect(sideBalance(sessions(even), ROW)).toMatchObject({ even: true, n: 3 })
    const left = ['2026-02-01', '2026-02-02', '2026-02-03'].map(d => day(d, [pair([30, 6], [30, 3]), pair([30, 1], [30, 2, false])]))
    expect(sideBalance(sessions(left), ROW)).toEqual({ even: false, side: 'L', pct: 9, n: 3 })
  })
})
