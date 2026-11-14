// @vitest-environment happy-dom
// Statistics → Lift trends: D95's read per exercise, without a phase.
import { describe, expect, it } from 'vitest'
import { DEF } from '../../store/useStore.js'
import { EXDB } from '../../lib/exercises.js'
import { muscleGroup } from './strength-signal.js'
import { liftTrends } from './lift-trends.js'

const TODAY = '2026-10-31'
const NOW = Date.parse(TODAY + 'T12:00:00Z')
const dayAgo = n => new Date(NOW - n * 864e5).toISOString().slice(0, 10)
const CHEST = EXDB.filter(e => e.eq === 'barbell' && muscleGroup(e) === 'Chest').map(e => e.id)
const BODY = EXDB.find(e => e.eq === 'body weight' && muscleGroup(e) === 'Chest').id
const CALF = EXDB.find(e => e.eq === 'barbell' && muscleGroup(e) === 'Calves').id

let n = 0
const workout = (ago, lifts, entry = {}) => ({
  id: 'w' + ++n, d: dayAgo(ago), start: NOW - ago * 864e5, end: NOW - ago * 864e5 + 36e5,
  entries: Object.entries(lifts).map(([id, sets]) => ({ id, sets: sets.map(([w, r]) => ({ w, r, done: true })), ...entry })),
})
/** One session per day in `days` with one set of `weights[i]` × 8 for `id`. */
const series = (id, days, weights, entry) => days.map((ago, i) => workout(ago, { [id]: [[weights[i], 8]] }, entry))
const trends = (workouts, over = {}) => liftTrends({ ...structuredClone(DEF), workouts, ...over }, TODAY)

describe('liftTrends', () => {
  it('has nothing without a log', () => {
    expect(trends([])).toEqual([])
  })

  it('reads each exercise falling, holding or rising, Falling first, the largest change first', () => {
    const rows = trends([
      ...series(CHEST[0], [15, 8, 1], [70, 65, 60]),     // worse, worse: falling
      ...series(CHEST[1], [15, 8, 1], [70, 70, 70]),     // the same twice: holding
      ...series(CHEST[2], [15, 8, 1], [60, 65, 70]),     // better twice: rising
      ...series(CHEST[3], [15, 8, 1], [100, 100, 110]),  // the same, then better: rising by half, so holding
      ...series(CHEST[4], [15, 8, 1], [50, 60, 70]),
    ])
    expect(rows.map(r => [r.id, r.state, r.pct])).toEqual([
      [CHEST[0], 'falling', -14],   // 70 × 8 to 60 × 8: −10/70
      [CHEST[3], 'holding', 10],
      [CHEST[1], 'holding', 0],
      [CHEST[4], 'rising', 40],
      [CHEST[2], 'rising', 17],     // 60 to 70: +10/60
    ])
  })

  it('a session before the window is only last time; the 1RM change starts inside it', () => {
    const [r] = trends(series(CHEST[0], [30, 15, 8], [100, 60, 66]))
    expect(r).toMatchObject({ state: 'holding', sessions: 2, pct: 10 })   // 60 to 66, the 100 left out
  })

  it('counts days since the last record, or since the first session when there is none', () => {
    const rows = trends([
      ...series(CHEST[0], [15, 8, 1], [70, 65, 60]),
      ...series(CHEST[2], [40, 15, 8, 1], [80, 60, 65, 62.5]),
    ])
    const by = Object.fromEntries(rows.map(r => [r.id, r]))
    expect(by[CHEST[0]]).toMatchObject({ recordDays: null, sinceDays: 15 })   // a first time is no record
    expect(by[CHEST[2]]).toMatchObject({ recordDays: null, sinceDays: 40 })   // nothing beat the 80
    const [up] = trends(series(CHEST[2], [15, 8, 1], [60, 65, 70]))
    expect(up.recordDays).toBe(1)
    const [off] = trends(series(CHEST[2], [15, 8, 1], [60, 65, 70]), { hvModuleParts: { 'motivation.records': false } })
    expect(off.recordDays).toBeNull()
  })

  it('needs two compared sessions in the last three weeks', () => {
    expect(trends(series(CHEST[0], [15, 8], [70, 65]))).toEqual([])         // one compared session
    expect(trends(series(CHEST[0], [40, 30, 22], [70, 65, 60]))).toEqual([])  // all before the window
  })

  it('leaves out bodyweight lifts, calves and abs, and entries kept out of progression', () => {
    expect(trends([
      ...series(BODY, [15, 8, 1], [10, 5, 2]),
      ...series(CALF, [15, 8, 1], [70, 65, 60]),
      ...series(CHEST[0], [15, 8, 1], [70, 65, 60], { noProg: true }),
    ])).toEqual([])
  })

  it('another machine label is another chain (D82)', () => {
    const rows = trends([
      ...series(CHEST[0], [15, 8, 1], [70, 65, 60], { hvBrand: 'LF' }),
      ...series(CHEST[0], [14, 7, 0], [50, 55, 60], { hvBrand: 'HS' }),
    ])
    expect(rows.map(r => [r.key, r.state, r.pct])).toEqual([['LF', 'falling', -14], ['HS', 'rising', 20]])
  })

  it('reads imported sets with no tick times, and whatever the arrows switch shows', () => {
    const rows = trends(series(CHEST[0], [15, 8, 1], [70, 65, 60]), { setTrend: false })
    expect(rows[0].state).toBe('falling')
  })
})
