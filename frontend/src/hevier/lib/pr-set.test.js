import { describe, expect, it } from 'vitest'
import { EXDB, isAssisted } from '../../lib/exercises.js'
import { prSetIndex, livePrSetIndex } from './pr-set.js'

const BENCH = EXDB.find(e => /^barbell bench press$/i.test(e.n)).id
const s = (w, done = true, extra = {}) => ({ w, r: 5, done, ...extra })

describe('hevier: the set that made a record', () => {
  it('the first ticked working set at the session’s best weight', () => {
    const e = { id: BENCH, sets: [s(100, true, { phase: 'warmup' }), s(60), s(80), s(80), s(90, false)] }
    expect(prSetIndex({ prs: [BENCH] }, e)).toBe(2)
  })
  it('none when the exercise made no record, or has no ticked working set', () => {
    expect(prSetIndex({ prs: [] }, { id: BENCH, sets: [s(80)] })).toBe(-1)
    expect(prSetIndex({}, { id: BENCH, sets: [s(80)] })).toBe(-1)
    expect(prSetIndex({ prs: [BENCH] }, { id: BENCH, sets: [s(80, false)] })).toBe(-1)
  })
  it('on an assistance machine, the least help', () => {
    const assisted = EXDB.find(e => isAssisted(e.id))
    expect(prSetIndex({ prs: [assisted.id] }, { id: assisted.id, sets: [s(40), s(20), s(30)] })).toBe(1)
  })

  describe('live, in the running session (D22)', () => {
    const S = (sets, extra = {}) => ({
      workouts: [{ d: '2026-10-01', entries: [{ id: BENCH, sets: [s(85)] }] }],
      active: { entries: [{ id: BENCH, sets }], ...extra },
    })
    const live = st => livePrSetIndex(st, st.active.entries[0])
    it('marks the first ticked work set past the heaviest weight so far', () => {
      expect(live(S([s(80), s(90), s(90), s(95, false)]))).toBe(1)
    })
    it('a set that only equals the record is not one, and nothing ticked is nothing', () => {
      expect(live(S([s(85), s(85)]))).toBe(-1)
      expect(live(S([s(100, false)]))).toBe(-1)
    })
    it('a warm-up never counts', () => {
      expect(live(S([s(100, true, { phase: 'warmup' }), s(80)]))).toBe(-1)
    })
    it('none in a workout logged into the past', () => {
      expect(live(S([s(100)], { backfill: { d: '2026-09-01' } }))).toBe(-1)
    })
  })
})
