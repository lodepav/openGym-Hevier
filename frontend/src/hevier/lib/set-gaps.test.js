import { describe, expect, it } from 'vitest'
import { EXDB } from '../../lib/exercises.js'
import { setGaps } from './set-gaps.js'

const BENCH = EXDB.find(e => /^barbell bench press$/i.test(e.n)).id
const SQUAT = EXDB.find(e => /^barbell full squat$/i.test(e.n)).id
const MIN = 60000
const T0 = Date.parse('2026-11-01T08:00:00Z')
const set = (min, extra = {}) => ({ w: 60, r: 8, done: true, at: T0 + min * MIN, ...extra })
const workout = (d, entries, end = 60) => ({ id: 'w' + d, d, start: T0, end: T0 + end * MIN, entries })
const S = { restSec: 120 }

describe('setGaps', () => {
  it('has nothing without workouts or tick times (an import)', () => {
    expect(setGaps([], '', S).size).toBe(0)
    const imported = workout('2026-11-01', [{ id: BENCH, sets: Array.from({ length: 8 }, () => ({ w: 60, r: 8, done: true })) }])
    expect(setGaps([imported], '', S).size).toBe(0)
  })

  it('takes the median gap between work sets, leaving out warm-ups and a forgotten gap, against the rest set', () => {
    const r = setGaps([
      // gaps 2:00, 2:30, 2:30; the warm-up at 0:30 is left out
      workout('2026-11-01', [{ id: BENCH, sets: [set(0.5, { phase: 'warmup' }), set(1), set(3), set(5.5), set(8)] }]),
      // gaps 3:00, (35:00, a break), 3:00, with the exercise's own rest of 3:00
      workout('2026-11-02', [{ id: BENCH, target: { restSec: 180 }, sets: [set(2), set(5), set(40), set(43)] }]),
    ], '', S)
    // gaps 120, 150, 150, 180, 180 s: the middle is 150; rests 120, 120, 120, 180, 180: 120
    expect(r.get(BENCH)).toEqual({ gap: 150 * 1000, rest: 120, n: 5 })
  })

  it('needs five gaps', () => {
    const w = workout('2026-11-01', [{ id: BENCH, sets: [set(1), set(3), set(5), set(7), set(9)] }])
    expect(setGaps([w], '', S).has(BENCH)).toBe(false)
    w.entries[0].sets.push(set(11))
    expect(setGaps([w], '', S).get(BENCH)).toEqual({ gap: 2 * MIN, rest: 120, n: 5 })
  })

  it('leaves out ticks before the start or past the end (the log caught up later)', () => {
    const w = workout('2026-11-01', [{ id: BENCH, sets: [set(-1), set(1), set(3), set(5), set(7), set(9), set(11), set(13)] }], 12)
    expect(setGaps([w], '', S).get(BENCH)).toEqual({ gap: 2 * MIN, rest: 120, n: 5 })
  })

  it('leaves out an entry in a superset, its gaps holding the partner’s sets', () => {
    const sets = () => Array.from({ length: 6 }, (_, i) => set(1 + 3 * i))
    const r = setGaps([workout('2026-11-01', [{ id: BENCH, sg: 'a', sets: sets() }, { id: SQUAT, sg: 'a', sets: sets() }])], '', S)
    expect(r.size).toBe(0)
    // an `sg` with no partner beside it is no superset
    expect(setGaps([workout('2026-11-01', [{ id: BENCH, sg: 'a', sets: sets() }])], '', S).get(BENCH).gap).toBe(3 * MIN)
  })

  it('counts a per-side row once, by its own tick', () => {
    const side = min => ({ at: T0 + min * MIN, done: true, sides: { L: { w: 20, r: 10, done: true, at: T0 + (min - 1) * MIN }, R: { w: 20, r: 10, done: true, at: T0 + min * MIN } } })
    const w = workout('2026-11-01', [{ id: BENCH, sets: [2, 5, 8, 11, 14, 17].map(side) }])
    expect(setGaps([w], '', S).get(BENCH)).toEqual({ gap: 3 * MIN, rest: 120, n: 5 })
  })

  it('does not take the left to right step of a timed per-side hold for a gap', () => {
    // three holds, each an L row and an R row 30 s apart, 3 min from one hold to the next
    const hold = min => [{ sec: 30, side: 'L', done: true, at: T0 + min * MIN }, { sec: 30, side: 'R', done: true, at: T0 + (min + 0.5) * MIN }]
    const w = workout('2026-11-01', [{ id: BENCH, sets: [1, 4, 7, 10, 13, 16].flatMap(hold) }])
    expect(setGaps([w], '', S).get(BENCH)).toMatchObject({ gap: 3 * MIN, n: 5 })
  })

  it('reads only the period, and leaves out an entry kept out of progression', () => {
    const w = d => workout(d, [{ id: BENCH, sets: [1, 3, 5, 7, 9, 11].map(m => set(m)) }])
    expect(setGaps([w('2026-10-01')], '2026-10-15', S).size).toBe(0)
    expect(setGaps([w('2026-10-20')], '2026-10-15', S).size).toBe(1)
    const kept = w('2026-10-20'); kept.entries[0].noProg = true
    expect(setGaps([kept], '', S).size).toBe(0)
  })
})
