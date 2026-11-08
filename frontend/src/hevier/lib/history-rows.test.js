import { describe, it, expect } from 'vitest'
import { setMark, historyRows } from './history-rows.js'
import { exerciseHistory } from '../../lib/exercise-history.js'

const warm = (w, r) => ({ w, r, done: true, phase: 'warmup' })
const rep = (w, r) => ({ w, r, done: true })
const hold = (w, sec, more = {}) => ({ w, sec, mode: 'time', done: true, ...more })

describe('hevier: a past set\'s mark, W for a warm-up and H for a hold (D89)', () => {
  it('numbers the rep sets around the holds and the warm-ups', () => {
    const rows = [warm(40, 5), rep(60, 8), hold(0, 30), rep(60, 7), hold(10, 20)]
    expect(rows.map((_, i) => setMark(rows, i))).toEqual(['W', 1, 'H', 2, 'H'])
  })

  it('marks an L/R hold pair once, on its L row', () => {
    const rows = [rep(20, 10), hold(10, 30, { side: 'L' }), hold(10, 25, { side: 'R' })]
    expect(rows.map((_, i) => setMark(rows, i))).toEqual([1, 'H', ''])
  })
})

describe('hevier: an exercise\'s History lists its holds (D89)', () => {
  const w = { id: 'w1', d: '2026-11-01', start: 1, entries: [{ id: 'pullup', target: { mode: 'reps', reps: 8 },
    sets: [warm(0, 5), rep(0, 8), hold(0, 30), rep(0, 6), { ...hold(0, 40), done: false }] }] }
  const S = { workouts: [w] }

  it('upstream\'s history leaves the hold out, historyRows puts it back where it was done', () => {
    const [session] = exerciseHistory(S, 'pullup').sessions
    expect(session.sets.map(s => s.r)).toEqual([8, 6])
    const rows = historyRows(w, 'pullup', session)
    expect(rows.map(x => x.s.sec ?? x.s.r)).toEqual([8, 30, 6])
    expect(rows[1].target.mode).toBe('time')
    expect(rows.map((x, i, all) => setMark(all.map(y => y.s), i))).toEqual([1, 'H', 2])
  })

  it('keeps the session\'s own sets when there is no workout or nothing to add', () => {
    const [session] = exerciseHistory(S, 'pullup').sessions
    expect(historyRows(null, 'pullup', session).map(x => x.s)).toEqual(session.sets)
    const plain = { id: 'w2', d: '2026-11-01', start: 1, entries: [{ id: 'bench', target: { mode: 'reps' }, sets: [rep(60, 5), rep(60, 5)] }] }
    const [s2] = exerciseHistory({ workouts: [plain] }, 'bench').sessions
    expect(historyRows(plain, 'bench', s2).map(x => x.s)).toEqual(s2.sets)
  })

  it('a session of holds only still lists them', () => {
    const only = { id: 'w3', d: '2026-11-01', start: 1, entries: [{ id: 'pullup', target: { mode: 'reps' }, sets: [hold(0, 30), hold(0, 25)] }] }
    const [s3] = exerciseHistory({ workouts: [only] }, 'pullup').sessions
    expect(historyRows(only, 'pullup', s3).map(x => x.s.sec)).toEqual([30, 25])
  })
})
