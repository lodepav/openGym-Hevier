// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { EXDB } from '../../lib/exercises.js'
import { lastSessions, repBests, curveIn } from './exercise-page.js'

const BENCH = EXDB.find(e => e.n === 'barbell bench press').id
const set = (w, r, extra = {}) => ({ w, r, done: true, ...extra })
// exerciseSummary's sessions, newest first.
const sess = (d, sets, mode = 'reps') => ({ id: d, d, mode, sets })

describe('lastSessions (D131)', () => {
  const sum = { metric: 'weight', sessions: [
    sess('2026-11-12', [set(62.5, 9, { rpe: 8 }), set(47.5, 12, { rpe: 7 })]),
    sess('2026-10-26', [set(62.5, 6), set(47.5, 10)]),
    sess('2026-10-09', [set(62.5, 6), set(47.5, 10)]),
    sess('2026-08-18', [set(72.5, 8), set(47.5, 16)]),
    sess('2026-08-04', [set(70, 8)]),
    sess('2026-07-01', [set(60, 8)]),
  ] }

  it('takes the last five, each against the session before by its top set', () => {
    const lines = lastSessions(sum, BENCH)
    expect(lines.map(l => l.d)).toEqual(['2026-11-12', '2026-10-26', '2026-10-09', '2026-08-18', '2026-08-04'])
    expect(lines.map(l => l.trend)).toEqual([1, 0, -1, 1, 1])
    expect(lastSessions(sum, BENCH, { n: 6 }).at(-1).trend).toBeNull()   // nothing before the first
    expect(lines[0].effort).toEqual([{ rpe: 8 }, { rpe: 7 }])
  })

  it('stars the sets that hold the bests: heaviest, best 1RM and best set, the first to reach them', () => {
    const lines = lastSessions(sum, BENCH)
    // 72.5 × 8 is the heaviest and the best 1RM; 47.5 × 16 the best set volume (760 against 580).
    expect(lines.map(l => l.sets.map(x => x.star))).toEqual([[false, false], [false, false], [false, false], [true, true], [false]])
    expect(lines.map(l => l.best)).toEqual([false, false, false, true, false])
  })

  it('names the best a line holds, the heaviest before the 1RM before the best set', () => {
    const lines = lastSessions(sum, BENCH)
    expect(lines[3].bestKind).toBe('weight')
    expect(lines[0].bestKind).toBeNull()
    const only = lastSessions({ metric: 'weight', sessions: [sess('2026-11-02', [set(30, 20)]), sess('2026-11-01', [set(60, 5)])] }, BENCH)
    expect(only.map(l => l.bestKind)).toEqual(['setVol', 'weight'])
  })

  it('reads a per-side set by its sides, and the most reps without load', () => {
    const side = (L, R) => ({ w: 0, r: L + R, done: true, sides: { L: set(0, L), R: set(0, R) } })
    const lines = lastSessions({ metric: 'reps', sessions: [sess('2026-11-02', [side(12, 10)]), sess('2026-11-01', [side(11, 11)])] }, BENCH)
    expect(lines.map(l => [l.trend, l.best])).toEqual([[1, true], [null, false]])
  })
})

describe('repBests', () => {
  it('marks the ones set in the last month new', () => {
    const got = repBests([{ r: 6, w: 72.5, d: '2026-08-04' }, { r: 9, w: 62.5, d: '2026-11-12' }, { r: 10, w: 55, d: '2026-10-17' }], '2026-11-16')
    expect(got.map(x => x.isNew)).toEqual([false, true, true])
  })
})

describe('the chart in the exercise’s own unit (D41)', () => {
  const pts = [{ t: 1, y: 50 }]
  const lb = w => w * 2
  it('a weight curve, the 1RM and the set volume are converted; reps, seconds and minutes are not', () => {
    expect(curveIn(pts, 'main', 'weight', lb)).toEqual([{ t: 1, y: 100 }])
    expect(curveIn(pts, 'e1rm', 'reps', lb)).toEqual([{ t: 1, y: 100 }])
    expect(curveIn(pts, 'setVol', 'weight', lb)).toEqual([{ t: 1, y: 100 }])
    expect(curveIn(pts, 'main', 'reps', lb)).toBe(pts)
    expect(curveIn(pts, 'main', 'sec', lb)).toBe(pts)
  })
})
