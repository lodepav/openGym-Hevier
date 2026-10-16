import { describe, expect, it } from 'vitest'
import { EXDB, isAssisted } from '../../lib/exercises.js'
import { prSetIndex } from './pr-set.js'

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
})
