// @vitest-environment happy-dom
// Lifts: where each lift is going over the window (D140).
import { describe, expect, it } from 'vitest'
import { DEF } from '../../store/useStore.js'
import { EXDB, isAssisted } from '../../lib/exercises.js'
import { muscleGroup } from './strength-signal.js'
import { WINDOWS, liftsWindow, currentPhase, windowFrom, medianChange, liftProgress, progressTotals, shownPct } from './lift-progress.js'

const TODAY = '2026-10-31'
const NOW = Date.parse(TODAY + 'T12:00:00Z')
const dayAgo = n => new Date(NOW - n * 864e5).toISOString().slice(0, 10)
const CHEST = EXDB.filter(e => e.eq === 'barbell' && muscleGroup(e) === 'Chest').map(e => e.id)
const BODY = EXDB.find(e => e.eq === 'body weight' && muscleGroup(e) === 'Chest').id
const CALF = EXDB.find(e => e.eq === 'barbell' && muscleGroup(e) === 'Calves').id

let n = 0
const workout = (ago, lifts, entry = {}, w = {}) => ({
  id: 'w' + ++n, d: dayAgo(ago), start: NOW - ago * 864e5, end: NOW - ago * 864e5 + 36e5,
  entries: Object.entries(lifts).map(([id, sets]) => ({ id, sets: sets.map(([w, r]) => ({ w, r, done: true })), ...entry })),
  ...w,
})
/** One session per day in `days` with one set of `weights[i]` × 8 for `id`. */
const series = (id, days, weights, entry) => days.map((ago, i) => workout(ago, { [id]: [[weights[i], 8]] }, entry))
const state = (workouts, over = {}) => ({ ...structuredClone(DEF), workouts, ...over })
const progress = (workouts, from = null, over = {}) => liftProgress(state(workouts, over), { from, today: TODAY })
const pts = (...ys) => ys.map((y, i) => ({ d: dayAgo(30 - i), y }))

describe('liftsWindow', () => {
  it('reads the stored window, 12 weeks for none or an unknown one', () => {
    expect(WINDOWS).toEqual(['12w', 'phase', 'all'])
    expect([liftsWindow({ hvLiftsWindow: 'all' }), liftsWindow({ hvLiftsWindow: 'phase' }), liftsWindow({ hvLiftsWindow: 'x' }), liftsWindow({}), liftsWindow(null)])
      .toEqual(['all', 'phase', '12w', '12w', '12w'])
  })
})

describe('medianChange', () => {
  it('two points: the last against the first', () => {
    expect(medianChange(pts(100, 110))).toBe(10)
  })
  it('five points: the median of the first two against the last two', () => {
    expect(medianChange(pts(100, 104, 90, 108, 112))).toBe(8)   // 102 to 110
  })
  it('seven points: the median of the first three against the last three', () => {
    expect(medianChange(pts(100, 90, 110, 50, 120, 100, 130))).toBe(20)   // 100 to 120
  })
  it('none with fewer than two points or a first median of 0; never −0', () => {
    expect(medianChange(pts(100))).toBeNull()
    expect(medianChange([])).toBeNull()
    expect(medianChange(pts(0, 10))).toBeNull()
    expect(Object.is(medianChange(pts(1000, 999.9)), 0)).toBe(true)
  })
})

describe('currentPhase and windowFrom', () => {
  const phased = (ago, p) => workout(ago, { [CHEST[0]]: [[60, 8]] }, {}, p ? { hvPhase: { p } } : {})

  it('12 weeks is 84 days with today; All has no start', () => {
    const S = state([])
    expect(windowFrom(S, '12w', TODAY)).toBe(dayAgo(83))
    expect(windowFrom(S, 'all', TODAY)).toBeNull()
    expect(windowFrom(S, 'phase', TODAY)).toBe(dayAgo(83))   // no phase: 12 weeks
  })

  it('the phase runs from the first workout of the latest unbroken run in it', () => {
    const S = state([phased(60, 'cutting'), phased(40, 'bulking'), phased(30, 'cutting'), phased(20, 'cutting'), phased(5, 'cutting')])
    expect(currentPhase(S)).toEqual({ phase: 'cutting', since: dayAgo(30) })
    expect(windowFrom(S, 'phase', TODAY)).toBe(dayAgo(30))
  })

  it('none when the latest workout has no phase', () => {
    const S = state([phased(30, 'cutting'), phased(20, 'cutting'), phased(5, null)])
    expect(currentPhase(S)).toBeNull()
    expect(windowFrom(S, 'phase', TODAY)).toBe(dayAgo(83))
    expect(currentPhase(state([]))).toBeNull()
  })
})

describe('liftProgress', () => {
  it('reads each lift rising, holding or falling, with its change and its estimated 1RM', () => {
    const map = progress([
      ...series(CHEST[0], [15, 8, 1], [70, 65, 60]),     // worse, worse: falling
      ...series(CHEST[1], [15, 8, 1], [70, 70, 70]),     // the same twice: holding
      ...series(CHEST[2], [15, 8, 1], [60, 65, 70]),     // better twice: rising
    ])
    expect([CHEST[0], CHEST[1], CHEST[2]].map(id => [map.get(id).state, map.get(id).pct])).toEqual([
      ['falling', -14], ['holding', 0], ['rising', 17],
    ])
    const { lines } = map.get(CHEST[2])
    expect(lines.map(l => l.key)).toEqual([''])
    expect(lines[0].points.map(p => p.d)).toEqual([dayAgo(15), dayAgo(8), dayAgo(1)])
    expect(lines[0].points[0].y).toBeLessThan(lines[0].points[2].y)
  })

  it('cuts the points at the window, and still holds its first session against the one before', () => {
    const log = series(CHEST[0], [100, 20, 8], [80, 70, 60])
    const from = windowFrom(state(log), '12w', TODAY)
    const p = progress(log, from).get(CHEST[0])
    expect(p.lines[0].points.map(x => x.d)).toEqual([dayAgo(20), dayAgo(8)])
    expect(p.state).toBe('falling')   // 70 against the 80 before the window, then 60 against 70
    expect(p.pct).toBe(-14)
    expect(progress(log).get(CHEST[0]).lines[0].points).toHaveLength(3)
    expect(progress(series(CHEST[0], [100, 90], [80, 70]), from).has(CHEST[0])).toBe(false)
  })

  it('a lift on two machine labels has a line per label, the most recent first, and reads as that one (D82)', () => {
    const p = progress([
      ...series(CHEST[0], [15, 8, 2], [70, 65, 60], { hvBrand: 'LF' }),
      ...series(CHEST[0], [14, 7, 1], [50, 55, 60], { hvBrand: 'HS' }),
    ]).get(CHEST[0])
    expect(p.lines.map(l => [l.key, l.state, l.pct, l.points.length])).toEqual([['HS', 'rising', 20, 3], ['LF', 'falling', -14, 3]])
    expect([p.state, p.pct]).toEqual(['rising', 20])
  })

  it('leaves out entries kept out of progression', () => {
    expect(progress(series(CHEST[0], [15, 8, 1], [70, 65, 60], { noProg: true })).has(CHEST[0])).toBe(false)
    const log = series(CHEST[0], [15, 8, 1], [70, 65, 60])
    log[1].entries[0].noProg = true
    expect(progress(log).get(CHEST[0]).lines[0].points).toHaveLength(2)
  })

  it('judges calves too, but not a bodyweight lift', () => {
    const map = progress([...series(CALF, [15, 8, 1], [70, 65, 60]), ...series(BODY, [15, 8, 1], [10, 5, 2])])
    expect(map.get(CALF).state).toBe('falling')
    expect(map.get(BODY).state).toBeNull()
    expect(map.get(BODY)).toEqual({ state: null, pct: null, lines: [] })
    const help = EXDB.find(e => isAssisted(e.id)).id
    expect(progress(series(help, [15, 8, 1], [40, 30, 20])).get(help)).toEqual({ state: null, pct: null, lines: [] })
  })

  it('the sessions of a deload routine count as points but are not judged', () => {
    const log = series(CHEST[0], [15, 8, 1], [70, 50, 75])
    log[1].entries[0] = { ...log[1].entries[0], noProg: true, rid: 'dl' }
    const p = progress(log, null, { routines: [{ id: 'dl', name: 'Deload', excludeFromProgression: true, slots: [] }] }).get(CHEST[0])
    expect(p.lines[0].points).toHaveLength(3)
    expect(p.state).toBeNull()   // the 50 is no worse session; the 75 against the 70 is the only verdict
  })

  it('needs two sessions with a verdict to judge', () => {
    expect(progress(series(CHEST[0], [8, 1], [70, 65])).get(CHEST[0])).toMatchObject({ state: null, pct: -7 })
  })

  it('a lift whose sets have no estimate (over 12 reps) has no line but is still judged', () => {
    const log = [15, 8, 1].map((ago, i) => workout(ago, { [CHEST[0]]: [[[40, 35, 30][i], 15]] }))
    expect(progress(log).get(CHEST[0])).toEqual({ state: 'falling', pct: null, lines: [] })
  })
})

describe('shownPct', () => {
  it('leaves out a percent that points against the state; holding and no state keep theirs', () => {
    expect([shownPct('rising', -2), shownPct('falling', 3), shownPct('rising', 0), shownPct('falling', 0)]).toEqual([null, null, 0, 0])
    expect([shownPct('rising', 5), shownPct('falling', -4), shownPct('holding', 3), shownPct('holding', -3), shownPct(null, -3), shownPct('rising', null)])
      .toEqual([5, -4, 3, -3, -3, null])
  })
})

describe('progressTotals', () => {
  it('counts each lift once, leaving out those without a state', () => {
    const map = progress([
      ...series(CHEST[0], [15, 8, 1], [70, 65, 60]),
      ...series(CHEST[1], [15, 8, 1], [70, 70, 70]),
      ...series(CHEST[2], [15, 8, 1], [60, 65, 70]),
      ...series(CHEST[3], [15, 8, 1], [60, 65, 70], { hvBrand: 'LF' }),
      ...series(CHEST[3], [14, 7], [60, 65], { hvBrand: 'HS' }),
      ...series(BODY, [15, 8, 1], [10, 5, 2]),
    ])
    expect(progressTotals(map)).toEqual({ rising: 2, holding: 1, falling: 1 })
    expect(progressTotals(new Map())).toEqual({ rising: 0, holding: 0, falling: 0 })
  })
})
