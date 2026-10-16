import { describe, it, expect } from 'vitest'
import { exerciseSummary, inRange } from './exercise-summary.js'
import { EXDB, isAssisted } from '../../lib/exercises.js'
import { modeOf } from '../../lib/history.js'

const BENCH = EXDB.find(e => /barbell bench press/i.test(e.n) && modeOf({ id: e.id }) === 'reps').id
const ASSIST = EXDB.find(e => isAssisted(e.id))?.id
const day = d => new Date(d + 'T18:00:00').getTime()
const W = (id, d, sets, ex = BENCH) => ({ id, d, start: day(d), end: day(d) + 3600000, entries: [{ id: ex, sets }] })
const S = workouts => ({ unit: 'kg', workouts, exWeights: {}, dbLoad: {} })
const set = (w, r, extra = {}) => ({ w, r, done: true, ...extra })

describe('hevier exercise summary', () => {
  const log = [
    W('a', '2026-06-01', [set(40, 10, { warmup: true }), set(60, 8), set(60, 8)]),
    W('b', '2026-09-01', [set(70, 5), set(62.5, 10)]),
    W('c', '2026-10-10', [set(70, 3), set(65, 8)]),
  ]

  it('takes upstream’s heaviest and 1RM, and adds set and session volume', () => {
    const s = exerciseSummary(S(log), BENCH)
    expect(s.metric).toBe('weight')
    expect(s.total).toBe(3)
    expect(s.sessions.map(x => x.id)).toEqual(['c', 'b', 'a'])
    expect(s.records.best).toEqual({ v: 70, d: '2026-09-01' })
    expect(s.records.e1rm.d).toBe('2026-09-01')
    expect(s.records.setVol).toEqual({ v: 625, w: 62.5, r: 10, d: '2026-09-01' })
    expect(s.records.sessionVol).toMatchObject({ v: 975, d: '2026-09-01' })
    expect(s.series.main.map(p => p.y)).toEqual([60, 70, 70])
    expect(s.series.setVol.map(p => p.y)).toEqual([480, 625, 520])
  })

  it('lists the heaviest weight for each rep count, warm-ups left out', () => {
    expect(exerciseSummary(S(log), BENCH).reps).toEqual([
      { r: 3, w: 70, d: '2026-10-10' },
      { r: 5, w: 70, d: '2026-09-01' },
      { r: 8, w: 65, d: '2026-10-10' },
      { r: 10, w: 62.5, d: '2026-09-01' },
    ])
  })

  it('an assistance machine has no tonnage, and its record is the least help', () => {
    if (!ASSIST) return
    const s = exerciseSummary(S([W('a', '2026-10-01', [set(30, 8)], ASSIST), W('b', '2026-10-08', [set(20, 8)], ASSIST)]), ASSIST)
    expect(s.records.setVol).toBeNull()
    expect(s.records.sessionVol).toBeNull()
    expect(s.reps).toEqual([{ r: 8, w: 20, d: '2026-10-08' }])
  })

  it('an empty log has no records, and ranges cut the series', () => {
    const s = exerciseSummary(S([]), BENCH)
    expect(s.total).toBe(0)
    expect(Object.values(s.records).every(v => v === null)).toBe(true)
    const pts = exerciseSummary(S(log), BENCH).series.main
    expect(inRange(pts, '3m', day('2026-10-16')).length).toBe(2)
    expect(inRange(pts, 'all', day('2026-10-16')).length).toBe(3)
  })
})
