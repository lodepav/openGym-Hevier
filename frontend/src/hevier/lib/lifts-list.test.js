import { describe, it, expect } from 'vitest'
import { liftRows, liftSections, liftsBy } from './lifts-list.js'

const set = (w, r, extra = {}) => ({ w, r, done: true, ...extra })
const wo = (d, entries) => ({ id: 'w' + d, d, start: Date.parse(d + 'T10:00:00'), end: Date.parse(d + 'T11:00:00'), entries })
const S = { workouts: [
  wo('2026-11-01', [{ id: 'press', sets: [set(60, 8), set(50, 10)] }, { id: 'curl', sets: [set(20, 10)] }]),
  wo('2026-11-08', [{ id: 'press', sets: [set(55, 8)] }, { id: 'row', sets: [set(70, 8, { done: false })] }]),
  wo('2026-11-15', [{ id: 'curl', sets: [set(30, 3, { warmup: true }), set(22.5, 8), set(20, 12)] }]),
] }

describe('Lifts: the rows (D135)', () => {
  const rows = liftRows(S)

  it('one row per exercise with a done set, the most recently trained first', () => {
    expect(rows.map(r => [r.id, r.d])).toEqual([['curl', '2026-11-15'], ['press', '2026-11-08']])
  })

  it('the last set is the last session’s best, the best is all-time; a new best when the last session set a record', () => {
    const [curl, press] = rows
    expect([press.last.w, press.last.r, press.best.w, press.best.r, press.newBest]).toEqual([55, 8, 60, 8, false])
    expect([curl.last.w, curl.best.w, curl.newBest]).toEqual([22.5, 22.5, true])
    expect(curl.mode).toBe('reps')
  })

  it('no new best with Motivation’s record marks off (D114)', () => {
    expect(liftRows({ ...S, hvModuleParts: { 'motivation.records': false } })[0].newBest).toBe(false)
  })

  it('a single session is no new best', () => {
    const one = liftRows({ workouts: [wo('2026-11-01', [{ id: 'press', sets: [set(60, 8)] }])] })
    expect(one[0].newBest).toBe(false)
  })

  it('a tie with an earlier best is not a new one', () => {
    const tie = liftRows({ workouts: [wo('2026-11-01', [{ id: 'p', sets: [set(60, 8)] }]), wo('2026-11-08', [{ id: 'p', sets: [set(60, 8)] }])] })
    expect(tie[0].newBest).toBe(false)
  })

  it('nothing logged, no rows', () => {
    expect(liftRows({ workouts: [] })).toEqual([])
    expect(liftRows(undefined)).toEqual([])
  })
})

describe('Lifts: recent or by muscle, and the search', () => {
  const rows = [{ id: 'curl' }, { id: 'squat' }, { id: 'press' }, { id: 'odd' }, { id: 'fly' }]
  const muscle = { curl: 'Biceps', squat: 'Quadriceps', press: 'Front Delts', fly: 'Chest', odd: 'Wrists' }
  const muscleOf = id => muscle[id]

  it('recent is one section in the rows’ order', () => {
    expect(liftSections(rows)).toEqual([{ key: 'recent', label: 'Recently trained', rows }])
  })

  it('by muscle groups them in the groups’ order, keeping recent first inside each', () => {
    const two = [...rows, { id: 'fly2' }]
    muscle.fly2 = 'Chest'
    const s = liftSections(two, { by: 'muscle', muscleOf })
    expect(s.map(g => g.key)).toEqual(['chest', 'shoulders', 'arms', 'legs', 'other'])
    expect(s[0].rows.map(r => r.id)).toEqual(['fly', 'fly2'])
  })

  it('a search keeps its hits, and finding none leaves no section', () => {
    expect(liftSections(rows, { keep: new Set(['press', 'curl']) })[0].rows.map(r => r.id)).toEqual(['curl', 'press'])
    expect(liftSections(rows, { by: 'muscle', keep: new Set(), muscleOf })).toEqual([])
  })

  it('remembers By muscle only when picked', () => {
    expect([liftsBy({ hvLiftsBy: 'muscle' }), liftsBy({ hvLiftsBy: 'x' }), liftsBy({}), liftsBy(null)]).toEqual(['muscle', 'recent', 'recent', 'recent'])
  })
})
