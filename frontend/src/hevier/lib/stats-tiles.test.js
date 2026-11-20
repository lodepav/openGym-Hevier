import { describe, expect, it } from 'vitest'
import { EXDB } from '../../lib/exercises.js'
import { weekExerciseTime, longestExercises, bodyWeightNow, bodyWeightPoints, thisWeek, workoutsThisMonth, weekRpe, trainingTime, weekChange } from './stats-tiles.js'

const BENCH = EXDB.find(e => /^barbell bench press$/i.test(e.n)).id
const SQUAT = EXDB.find(e => /^barbell full squat$/i.test(e.n)).id
const MIN = 60000
const TODAY = '2026-11-18'   // a Wednesday
const timed = (d, benchMin, squatMin) => {
  const start = Date.parse(d + 'T08:00:00')
  return { id: 'w' + d, d, start, end: start + (benchMin + squatMin) * MIN, entries: [
    { id: BENCH, sets: [{ w: 60, r: 8, done: true, at: start + benchMin * MIN }] },
    { id: SQUAT, sets: [{ w: 80, r: 5, done: true, at: start + (benchMin + squatMin) * MIN }] },
  ] }
}
const plain = (d, sets, extra = {}) => ({ id: 'p' + d, d, start: Date.parse(d + 'T10:00:00'), end: Date.parse(d + 'T11:00:00'),
  entries: [{ id: BENCH, sets }], ...extra })

describe('Statistics tile numbers (D142)', () => {
  it('exercise time this week: the timed exercises of this week added up, 0 without set times', () => {
    const log = [timed('2026-11-16', 10, 20), timed('2026-11-17', 5, 5), timed('2026-11-10', 10, 10), timed('2026-01-01', 60, 60), plain('2026-11-17', [{ w: 60, r: 8, done: true }])]
    expect(weekExerciseTime(log, TODAY, 1)).toBe(40 * MIN)
    // A week starting Sunday still has Monday the 16th; starting Wednesday the 18th, it has neither.
    expect(weekExerciseTime(log, TODAY, 0)).toBe(40 * MIN)
    expect(weekExerciseTime(log, TODAY, 3)).toBe(0)
    expect(weekExerciseTime([plain('2026-11-17', [{ w: 60, r: 8, done: true }])], TODAY, 1)).toBe(0)
    expect(longestExercises(log, TODAY, 1).map(r => r.id)).toEqual([SQUAT])
  })

  it('body weight: the latest and its change from 4 weeks before it', () => {
    const bw = [{ d: '2026-10-01', w: 84 }, { d: '2026-10-20', w: 83 }, { d: '2026-11-17', w: 82.4 }]
    expect(bodyWeightNow(bw)).toEqual({ w: 82.4, d: '2026-11-17', change: -0.6 })
    expect(bodyWeightNow([{ d: '2026-11-17', w: 82.4 }]).change).toBeNull()
    expect(bodyWeightNow([{ d: '2026-01-10', w: 90 }, { d: '2026-11-17', w: 82.4 }]).change).toBeNull()
    expect(bodyWeightNow([])).toBeNull()
    expect(bodyWeightPoints(bw, TODAY).map(p => p.y)).toEqual([84, 83, 82.4])
    expect(bodyWeightPoints([{ d: '2026-01-01', w: 90 }], TODAY)).toEqual([])
  })

  it('this week: work sets and time, warm-ups and last week left out', () => {
    const log = [plain('2026-11-16', [{ w: 20, r: 5, done: true, warmup: true }, { w: 60, r: 8, done: true }, { w: 60, r: 8, done: true }]),
      plain('2026-11-09', [{ w: 60, r: 8, done: true }])]
    expect(thisWeek(log, TODAY, 1)).toEqual({ sets: 2, ms: 3600000 })
  })

  it('workouts this month', () => {
    expect(workoutsThisMonth([plain('2026-11-01', []), plain('2026-11-18', []), plain('2026-10-31', [])], TODAY)).toBe(2)
  })

  it('average RPE: RIR read as RPE, only from enough rated work sets', () => {
    const rated = [{ w: 60, r: 8, done: true, rpe: 8 }, { w: 60, r: 8, done: true, rpe: 9 }, { w: 60, r: 8, done: true, rir: 1 },
      { w: 60, r: 8, done: true, rpe: 8 }, { w: 60, r: 8, done: true, rpe: 9 }, { w: 20, r: 5, done: true, warmup: true, rpe: 5 }]
    expect(weekRpe([plain('2026-11-17', rated)], TODAY, 1)).toEqual({ rpe: 8.6, n: 5 })
    expect(weekRpe([plain('2026-11-17', rated.slice(0, 2))], TODAY, 1)).toEqual({ rpe: null, n: 2 })
    expect(weekRpe([plain('2026-11-10', rated)], TODAY, 1).n).toBe(0)
  })

  it('training time: minutes under an hour, then hours to one decimal', () => {
    expect([0, 29000, 2 * MIN, 59 * MIN, 59.6 * MIN, 60 * MIN, 270 * MIN, 273 * MIN].map(trainingTime))
      .toEqual(['0 min', '0 min', '2 min', '59 min', '1 h', '1 h', '4.5 h', '4.6 h'])
  })
})

describe('a week tile against last week (the critique, 2026-11-20)', () => {
  it('writes the change with its arrow, in the tile’s own words', () => {
    expect(weekChange(14, 11)).toEqual({ dir: 1, text: '↑ 3 vs last week' })
    expect(weekChange(4, 9)).toEqual({ dir: -1, text: '↓ 5 vs last week' })
    expect(weekChange(5, 5)).toEqual({ dir: 0, text: '= vs last week' })
    expect(weekChange(120000, 0, ms => trainingTime(ms)).text).toBe('↑ 2 min vs last week')
  })
  it('says nothing with neither week trained', () => {
    expect(weekChange(0, 0)).toBeNull()
  })
})
