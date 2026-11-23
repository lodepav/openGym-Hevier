// @vitest-environment happy-dom
// What Go Hevier tells OpenBite about strength in the current phase (D95).
import { describe, expect, it } from 'vitest'
import { DEF } from '../../store/useStore.js'
import { EXDB } from '../../lib/exercises.js'
import { arrows, fallingChain, muscleGroup, readExercise, sessionVerdict, strengthSignal } from './strength-signal.js'

const TODAY = '2026-10-31'
const NOW = Date.parse(TODAY + 'T12:00:00Z')
const dayAgo = n => new Date(NOW - n * 864e5).toISOString().slice(0, 10)
const s = (day, verdict) => ({ day, verdict })

// Loaded barbell lifts by their main muscle, so a test can ask for "two chest exercises".
const loaded = muscle => EXDB.filter(e => e.eq === 'barbell' && muscleGroup(e) === muscle).map(e => e.id)
const CHEST = loaded('Chest')
const BACK = loaded('Back')
const BODY = EXDB.find(e => e.eq === 'body weight').id

let n = 0
const workout = (ago, phase, lifts, extra = {}) => ({
  id: 'w' + ++n, d: dayAgo(ago), start: NOW - ago * 864e5, end: NOW - ago * 864e5 + 36e5,
  entries: Object.entries(lifts).map(([id, sets]) => ({ id, sets: sets.map(([w, r]) => ({ w, r, done: true })), ...(extra.entry || {}) })),
  ...(phase ? { hvPhase: { p: phase } } : {}),
})
const log = (workouts, over = {}) => ({ ...structuredClone(DEF), workouts, ...over })
const signal = (workouts, over) => strengthSignal(log(workouts, over), TODAY, NOW)
/** Sessions `ago` days back with one top weight each: the same weights for each id in `ids`. */
const series = (ids, days, weights, phase = 'cutting') => days.map((ago, i) =>
  workout(ago, phase, Object.fromEntries(ids.map(id => [id, [[weights[i], 8]]]))))

describe('sessionVerdict', () => {
  it('goes by the majority of the arrows, a tie being the same', () => {
    expect(sessionVerdict([1, 1, -1])).toBe(1)
    expect(sessionVerdict([-1, -1, 1])).toBe(-1)
    expect(sessionVerdict([1, -1])).toBe(0)
    expect(sessionVerdict([0, 0])).toBe(0)
    expect(sessionVerdict([1, 0, 0])).toBe(1)
  })
  it('has none without an arrow', () => {
    expect(sessionVerdict([null, null])).toBeNull()
    expect(sessionVerdict([])).toBeNull()
  })
})

describe('fallingChain', () => {
  it('falls after worse, worse', () => {
    expect(fallingChain([s(0, -1), s(7, -1)])).toEqual({ falling: true, days: 7 })
  })
  it('falls after worse, the same, worse', () => {
    expect(fallingChain([s(0, -1), s(7, 0), s(14, -1)])).toEqual({ falling: true, days: 14 })
  })
  it('stays falling on a repeat of the dropped performance', () => {
    expect(fallingChain([s(0, -1), s(4, -1), s(8, 0)]).falling).toBe(true)
  })
  it('does not fall on one drop, or a drop then repeats', () => {
    expect(fallingChain([s(0, -1)]).falling).toBe(false)
    expect(fallingChain([s(0, -1), s(7, 0), s(14, 0)]).falling).toBe(false)
  })
  it('a better session breaks the chain', () => {
    expect(fallingChain([s(0, -1), s(4, 1), s(8, -1)]).falling).toBe(false)
    expect(fallingChain([s(0, -1), s(4, -1), s(8, 1)]).falling).toBe(false)
  })
  it('a gap of two weeks restarts it: a skipped stretch is not a drop', () => {
    expect(fallingChain([s(0, -1), s(14, -1)]).falling).toBe(false)
    expect(fallingChain([s(0, -1), s(13, -1)]).falling).toBe(true)
  })
})

describe('readExercise', () => {
  it('rises when most sessions are better', () => {
    expect(readExercise([s(0, 1), s(7, 1), s(14, 0)]).rising).toBe(true)
    expect(readExercise([s(0, 1)]).rising).toBe(false)
  })
  it('is not rising only over two weeks with few better sessions', () => {
    expect(readExercise([s(0, 0), s(7, 0), s(14, 1)]).notRising).toBe(true)
    expect(readExercise([s(0, 0), s(7, 0)]).notRising).toBe(false)
    expect(readExercise([s(0, 1), s(14, 0)]).notRising).toBe(false)
  })
})

describe('strengthSignal', () => {
  it('has nothing without a phase on any workout, or anything to judge', () => {
    expect(signal([])).toBeNull()
    expect(signal(series(CHEST.slice(0, 2), [10, 5], [60, 50], null))).toBeNull()
    expect(signal([workout(1, 'cutting', { [CHEST[0]]: [[60, 8]] })])).toBeNull()   // no last time
  })

  it('one exercise falling alone says nothing, however it falls', () => {
    const r = signal([
      ...series([CHEST[0]], [15, 8, 1], [70, 65, 60]),
      ...series([CHEST[1]], [15.5, 8.5, 1.5], [70, 70, 70]),
    ])
    expect(r.trend).toBe('holding')
    expect(r.level).toBeNull()
    expect(r.exercises_falling).toBe(1)
    expect(r.exercises_tracked).toBe(2)
  })

  it('a muscle with one exercise cannot count', () => {
    expect(signal(series([CHEST[0]], [15, 8, 1], [70, 65, 60])).trend).toBe('holding')
  })

  it('is a warning when more than half of one muscle\'s exercises fall', () => {
    const r = signal(series(CHEST.slice(0, 2), [15, 8, 1], [70, 65, 60]))
    expect(r).toMatchObject({ trend: 'falling', level: 'warning', muscles: 'Chest', phase: 'cutting', exercises_falling: 2, chain_days: 7 })
    expect(JSON.parse(r.detail)[0]).toMatchObject({ muscle: 'Chest', done: 2 })
    expect(JSON.parse(r.detail)[0].exercises).toHaveLength(2)
  })

  it('an exercise compared only once does not count against the muscle', () => {
    const r = signal([
      ...series(CHEST.slice(0, 2), [15, 8, 1], [70, 65, 60]),
      ...series([CHEST[2], CHEST[3]], [9, 2], [70, 75]),
    ])
    expect(r).toMatchObject({ trend: 'falling', level: 'warning', exercises_tracked: 4 })
    expect(JSON.parse(r.detail)[0].done).toBe(2)
  })

  it('half is not more than half', () => {
    const r = signal([
      ...series(CHEST.slice(0, 2), [15, 8, 1], [70, 65, 60]),
      ...series(CHEST.slice(2, 4), [15.5, 8.5, 1.5], [70, 70, 70]),
    ])
    expect(r.exercises_falling).toBe(2)
    expect(r.trend).toBe('holding')
  })

  it('is a clear sign with two muscles falling', () => {
    const r = signal(series([...CHEST.slice(0, 2), ...BACK.slice(0, 2)], [15, 8, 1], [70, 65, 60]))
    expect(r).toMatchObject({ trend: 'falling', level: 'clear' })
    expect(r.muscles.split(',').sort()).toEqual(['Back', 'Chest'])
  })

  it('takes back and shoulders whole, however the main muscle splits them', () => {
    const byName = re => EXDB.find(e => re.test(e.n))
    expect(muscleGroup(byName(/^lat pulldown|cable lat pulldown/i))).toBe('Back')
    expect(muscleGroup(byName(/barbell bent over row/i))).toBe('Back')
    expect(muscleGroup(byName(/dumbbell lateral raise/i))).toBe('Shoulders')
    expect(BACK.length).toBeGreaterThan(1)
  })

  it('leaves out calves and abs, as if they were not done', () => {
    const ofGroup = m => EXDB.filter(e => e.eq !== 'body weight' && !/assist/i.test(e.eq || '') && muscleGroup(e) === m).map(e => e.id)
    for (const m of ['Calves', 'Abdominals', 'Obliques']) {
      expect(signal(series(ofGroup(m).slice(0, 2), [15, 8, 1], [70, 65, 60]))).toBeNull()
    }
    const r = signal([
      ...series(CHEST.slice(0, 2), [15, 8, 1], [70, 65, 60]),
      ...series(ofGroup('Calves').slice(0, 2), [14, 7, 2], [70, 65, 60]),
    ])
    expect(r).toMatchObject({ level: 'warning', muscles: 'Chest', exercises_tracked: 2, exercises_falling: 2 })
  })

  it('leaves out kept-out and bodyweight exercises', () => {
    const off = series(CHEST.slice(0, 2), [15, 8, 1], [70, 65, 60]).map(w => ({ ...w, entries: w.entries.map(e => ({ ...e, noProg: true })) }))
    expect(signal(off)).toBeNull()
    const body = [15, 8, 1].map((ago, i) => workout(ago, 'cutting', { [BODY]: [[0, 12 - i]] }))
    expect(signal(body)).toBeNull()
  })

  it('counts only the current phase, each session still against the one before it', () => {
    // The drops in the bulk are gone once the cut starts; the cut's one drop is not a chain.
    const r = signal([
      ...series(CHEST.slice(0, 2), [20, 15], [70, 65], 'bulking'),
      ...series(CHEST.slice(0, 2), [8], [60], 'cutting'),
    ])
    expect(r.phase).toBe('cutting')
    expect(r.phase_days).toBe(8)
    expect(r.exercises_falling).toBe(0)
  })

  it('a workout without a phase inside a cut neither ends it nor counts in it', () => {
    const cut = series(CHEST.slice(0, 2), [20, 8, 1], [70, 65, 60])
    const none = series(CHEST.slice(0, 2), [12], [70], null)[0]
    const r = signal([cut[0], none, cut[1], cut[2]])
    expect(r).toMatchObject({ phase: 'cutting', phase_days: 20, sessions_week_avg: 1.1 })
    // The latest workout without a phase: the row follows the latest one with a phase.
    const late = series(CHEST.slice(0, 2), [0], [60], null)[0]
    expect(signal([cut[0], none, cut[1], late])).toMatchObject({ phase: 'cutting', phase_days: 20, last_workout_at: cut[1].end })
  })

  it('a workout in another phase still ends the run', () => {
    const r = signal([
      ...series(CHEST.slice(0, 2), [20], [70]),
      ...series(CHEST.slice(0, 2), [12], [70], 'bulking'),
      ...series(CHEST.slice(0, 2), [8, 1], [65, 60]),
    ])
    expect(r).toMatchObject({ phase: 'cutting', phase_days: 8 })
  })

  it('looks at three weeks only', () => {
    const r = signal(series(CHEST.slice(0, 2), [40, 30, 22, 1], [80, 70, 60, 60]))
    expect(r.exercises_falling).toBe(0)
  })

  describe('not rising', () => {
    // The first session has no last time, so three weeks of arrows take four sessions.
    const flat = phase => series(CHEST.slice(0, 2), [16, 15, 8, 1], [70, 70, 70, 70], phase)
    it('speaks in a bulk that has run two weeks', () => {
      expect(signal(flat('bulking'))).toMatchObject({ trend: 'not_rising', level: 'warning', muscles: 'Chest' })
    })
    it('does not speak on a cut or at maintenance, where holding is fine', () => {
      expect(signal(flat('cutting')).trend).toBe('holding')
      expect(signal(flat('maintaining')).trend).toBe('holding')
    })
    it('does not speak before two weeks of the bulk', () => {
      const r = signal(series(CHEST.slice(0, 2), [10, 5, 1], [70, 70, 70], 'bulking'))
      expect(r.trend).toBe('holding')
    })
  })

  it('says rising after two weeks of the phase', () => {
    const up = series(CHEST.slice(0, 2), [15, 8, 1], [60, 65, 70], 'bulking')
    expect(signal(up)).toMatchObject({ trend: 'rising', level: null, muscles: 'Chest' })
    const early = series(CHEST.slice(0, 2), [10, 5, 1], [60, 65, 70], 'bulking')
    expect(signal(early).trend).toBe('holding')
  })

  it('reports the training load beside it', () => {
    const r = signal(series(CHEST.slice(0, 2), [14, 8, 1], [70, 65, 60]))
    expect(r).toMatchObject({ sets_7d: 2, sessions_7d: 1, sessions_week_avg: 1.5, sets_week_avg: 3, phase_days: 14 })
    const early = signal(series(CHEST.slice(0, 2), [3, 1], [70, 65]))
    expect(early.sets_week_avg).toBeNull()
    expect(early.sessions_week_avg).toBeNull()
  })

  it('does not change the log it reads', () => {
    const workouts = series(CHEST.slice(0, 2), [15, 8, 1], [60, 65, 70])
    const order = workouts.map(w => w.id).reverse()
    const S = log(workouts.reverse())
    strengthSignal(S, TODAY, NOW)
    expect(S.workouts.map(w => w.id)).toEqual(order)
  })
})

describe('strengthSignal: round 2 of the stats review', () => {
  it('reads the arrows whatever Compare sets with last time shows on screen', () => {
    const r = signal(series(CHEST.slice(0, 2), [15, 8, 1], [70, 65, 60]), { setTrend: false })
    expect(r).toMatchObject({ trend: 'falling', level: 'warning', muscles: 'Chest' })
  })

  it('a per-side hold\'s L and R rows are one vote', () => {
    const hold = (side, sec) => ({ w: 20, mode: 'time', sec, side, done: true })
    const at = (ago, top, sec) => ({ id: 'h' + ago, d: dayAgo(ago), start: NOW - ago * 864e5, end: NOW - ago * 864e5 + 36e5,
      entries: [{ id: CHEST[0], sets: [{ w: top, r: 8, done: true }, hold('L', sec), hold('R', sec)] }] })
    const S = log([at(8, 70, 30), at(1, 65, 40)])
    const w = S.workouts[1]
    // 65 × 8 is worse, the hold on each side better: one set each way, the same.
    expect(arrows(S, w, 0)).toEqual([-1, 1, null])
    expect(sessionVerdict(arrows(S, w, 0))).toBe(0)
  })
})
