import { describe, expect, it } from 'vitest'
import { EXDB, isAssisted } from '../../lib/exercises.js'
import { workoutRecords, recordsIn, liveRecords, recordsAt } from './records.js'

const BENCH = EXDB.find(e => /^barbell bench press$/i.test(e.n)).id
const PULLUP = EXDB.find(e => /^pull-?up$/i.test(e.n))?.id || EXDB.find(e => e.eq === 'body weight' && /pull/i.test(e.n)).id
const CABLE = '8878'      // cable 45 degrees reverse fly
const ASSISTED = EXDB.find(e => isAssisted(e.id)).id

const s = (w, r = 5, extra = {}) => ({ w, r, done: true, ...extra })
let n = 0
const wk = (day, entries) => ({ id: 'w' + ++n, d: '2026-10-' + String(day).padStart(2, '0'), start: Date.parse('2026-10-' + String(day).padStart(2, '0') + 'T10:00:00'), entries })
const kinds = (S, w) => workoutRecords(S, w).map(r => r.kind)

describe('hevier personal records (D51)', () => {
  it('the first session sets the bar; a later one that beats it sets records on the sets that made them', () => {
    const a = wk(1, [{ id: BENCH, sets: [s(80, 5), s(80, 5)] }])
    const b = wk(3, [{ id: BENCH, sets: [s(20, 10, { phase: 'warmup' }), s(80, 5), s(85, 3), s(70, 10)] }])
    const S = { workouts: [b, a] }    // stored out of order: read by date
    expect(workoutRecords(S, a)).toEqual([])
    const recs = workoutRecords(S, b)
    expect(recs.map(r => [r.kind, r.set])).toEqual([['weight', 2], ['e1rm', 2], ['setVol', 3], ['sessionVol', -1]])
    expect(recs.find(r => r.kind === 'setVol')).toMatchObject({ v: 700, w: 70, r: 10 })
    expect(recordsAt(recs, 0, 2).map(r => r.kind)).toEqual(['weight', 'e1rm'])
    expect(recordsAt(recs, 0, -1).map(r => r.kind)).toEqual(['sessionVol'])
  })

  it('an exercise kept out of progression sets no record and raises no bar (D57)', () => {
    const a = wk(1, [{ id: BENCH, sets: [s(80, 5)] }])
    const b = wk(2, [{ id: BENCH, sets: [s(120, 5)], noProg: true }])
    const c = wk(3, [{ id: BENCH, sets: [s(90, 5)] }])
    const d = { ...wk(4, [{ id: BENCH, sets: [s(130, 5)] }]), excludeFromProgression: true }
    const S = { workouts: [a, b, c, d] }
    expect(kinds(S, b)).toEqual([])
    expect(kinds(S, c)).toContain('weight')
    expect(kinds(S, d)).toEqual([])
  })

  it('a tie is no record, and a worse session does not lower the bar', () => {
    const a = wk(1, [{ id: BENCH, sets: [s(100, 5)] }])
    const b = wk(2, [{ id: BENCH, sets: [s(90, 5)] }])
    const c = wk(3, [{ id: BENCH, sets: [s(100, 5)] }])
    const S = { workouts: [a, b, c] }
    expect(kinds(S, b)).toEqual([])
    expect(kinds(S, c)).toEqual([])
  })

  it('records follow the brand and the cable setup, never the gym', () => {
    const e = (w, extra) => ({ id: CABLE, sets: [s(w, 10)], ...extra })
    const a = wk(1, [e(40, { hvBrand: 'Life Fitness', hvGym: 'g1' })])
    const b = wk(2, [e(30, { hvBrand: 'Matrix', hvGym: 'g1' })])       // first on this brand: the bar
    const c = wk(3, [e(35, { hvBrand: 'Matrix', hvGym: 'g2' })])       // beats Matrix, not Life Fitness
    const d = wk(4, [e(45, { hvBrand: 'Life Fitness', hvGym: 'g2' })]) // another gym, the same brand
    const x = wk(5, [e(20, { hvBrand: 'Life Fitness', hvCable: 'x2' })])  // a new setup: the bar
    const S = { workouts: [a, b, c, d, x] }
    expect(kinds(S, b)).toEqual([])
    expect(kinds(S, c)).toContain('weight')
    expect(kinds(S, d)).toContain('weight')
    expect(kinds(S, x)).toEqual([])
  })

  it('an exercise with no load competes in reps', () => {
    const a = wk(1, [{ id: PULLUP, sets: [s(0, 8), s(0, 6)] }])
    const b = wk(2, [{ id: PULLUP, sets: [s(0, 7), s(0, 7), s(0, 5)] }])
    const c = wk(3, [{ id: PULLUP, sets: [s(0, 10)] }])
    const S = { workouts: [a, b, c] }
    expect(workoutRecords(S, b).map(r => [r.kind, r.v])).toEqual([['sessionReps', 19]])
    expect(workoutRecords(S, c).map(r => [r.kind, r.set])).toEqual([['reps', 0]])
  })

  it('on an assistance machine only the weight counts, and less help is the record', () => {
    const a = wk(1, [{ id: ASSISTED, sets: [s(40, 8)] }])
    const b = wk(2, [{ id: ASSISTED, sets: [s(30, 8)] }])
    expect(kinds({ workouts: [a, b] }, b)).toEqual(['weight'])
  })

  it('holds and cardio: the longest', () => {
    const PLANK = EXDB.find(e => /^plank$/i.test(e.n))?.id || 'plank'
    const a = wk(1, [{ id: PLANK, target: { mode: 'time' }, sets: [{ sec: 60, done: true }] }])
    const b = wk(2, [{ id: PLANK, target: { mode: 'time' }, sets: [{ sec: 45, done: true }, { sec: 75, done: true }] }])
    expect(workoutRecords({ workouts: [a, b] }, b).map(r => [r.kind, r.set])).toEqual([['sec', 1]])
  })

  it('lists a month’s records with their workouts', () => {
    const a = wk(1, [{ id: BENCH, sets: [s(80)] }])
    const b = wk(2, [{ id: BENCH, sets: [s(90)] }])
    const S = { workouts: [a, b] }
    expect(recordsIn(S, [a, b]).map(r => [r.w.id, r.kind])).toEqual([[b.id, 'weight'], [b.id, 'e1rm'], [b.id, 'setVol'], [b.id, 'sessionVol']])
  })

  describe('live (D22)', () => {
    const base = wk(1, [{ id: CABLE, hvBrand: 'Life Fitness', sets: [s(40, 10)] }])
    const S = (sets, extra = {}) => ({
      workouts: [base], hvMachines: { [CABLE]: { '': 'Life Fitness' } },
      active: { id: 'a', d: '2026-10-05', start: Date.parse('2026-10-05T10:00:00'), entries: [{ id: CABLE, sets }], ...extra },
    })
    it('the ticked sets against the saved log, by the label the session shows', () => {
      expect(liveRecords(S([s(45, 10), s(45, 10, { done: false })])).map(r => [r.kind, r.set])).toEqual([['weight', 0], ['e1rm', 0], ['setVol', 0], ['sessionVol', -1]])
      expect(liveRecords(S([s(40, 10)]))).toEqual([])
    })
    it('a new brand in the session is a first time', () => {
      const st = S([s(45, 10)])
      st.active.entries[0].hvBrand = 'Matrix'
      expect(liveRecords(st)).toEqual([])
    })
    it('none on an exercise kept out of progression (D57)', () => {
      const st = S([s(50, 10)])
      st.active.entries[0].noProg = true
      expect(liveRecords(st)).toEqual([])
    })
    it('none in a workout logged into the past', () => {
      expect(liveRecords(S([s(50, 10)], { backfill: { d: '2026-09-01' } }))).toEqual([])
    })
    it('editing a workout compares it with the ones before it only', () => {
      const later = wk(9, [{ id: CABLE, hvBrand: 'Life Fitness', sets: [s(60, 10)] }])
      const st = S([s(45, 10)], { editingWorkoutId: 'edited', start: Date.parse('2026-10-05T10:00:00') })
      st.workouts = [base, { ...wk(5, []), id: 'edited' }, later]
      st.active.entries[0].hvBrand = 'Life Fitness'   // an edited workout reads only what it saved
      expect(liveRecords(st).map(r => r.kind)).toContain('weight')
    })
  })
})
