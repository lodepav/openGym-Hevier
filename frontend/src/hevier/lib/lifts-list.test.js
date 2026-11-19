import { describe, it, expect } from 'vitest'
import { liftRows, liftSections, liftsBy, liftSetText } from './lifts-list.js'
import { EXDB } from '../../lib/exercises.js'

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
  const rows = [{ id: 'curl' }, { id: 'squat' }, { id: 'press' }, { id: 'odd' }, { id: 'calf' }, { id: 'row' }, { id: 'fly' }, { id: 'none' }, { id: 'pull' }]
  const group = { curl: 'Biceps', squat: 'Quadriceps', press: 'Shoulders', fly: 'Chest', odd: 'Wrists', calf: 'Calves', row: 'Back', none: '', pull: 'Back' }
  const groupOf = id => group[id]

  it('recent is one section in the rows’ order', () => {
    expect(liftSections(rows)).toEqual([{ key: 'recent', label: 'Recently trained', rows }])
  })

  it('by muscle groups them by D95’s groups in the old groups’ order, calves included, keeping recent first inside each (D141)', () => {
    const s = liftSections(rows, { by: 'muscle', groupOf })
    expect(s.map(g => g.key)).toEqual(['Chest', 'Back', 'Shoulders', 'Biceps', 'Quadriceps', 'Calves', 'Wrists', 'other'])
    expect(s.map(g => g.label).at(-1)).toBe('Other')
    expect(s[1].rows.map(r => r.id)).toEqual(['row', 'pull'])
  })

  it('a section keeps all its group’s ids while a filter shows only some of its rows', () => {
    const s = liftSections(rows, { by: 'muscle', keep: new Set(['pull', 'curl']), groupOf })
    expect(s.map(g => [g.key, g.rows.map(r => r.id), g.ids])).toEqual([['Back', ['pull'], ['row', 'pull']], ['Biceps', ['curl'], ['curl']]])
  })

  it('a search keeps its hits, and finding none leaves no section', () => {
    expect(liftSections(rows, { keep: new Set(['press', 'curl']) })[0].rows.map(r => r.id)).toEqual(['curl', 'press'])
    expect(liftSections(rows, { by: 'muscle', keep: new Set(), groupOf })).toEqual([])
    expect(liftSections(rows, { keep: new Set() })).toEqual([])
  })

  it('remembers By muscle only when picked', () => {
    expect([liftsBy({ hvLiftsBy: 'muscle' }), liftsBy({ hvLiftsBy: 'x' }), liftsBy({}), liftsBy(null)]).toEqual(['muscle', 'recent', 'recent', 'recent'])
  })
})

describe('Lifts: a set as a row writes it', () => {
  const opts = { mode: 'reps', unit: '', id: 'pullup' }
  it('a body-weight set with no added load reads its reps, a weighted one "80 × 8"', () => {
    expect(liftSetText({ w: 0, r: 12 }, { ...opts, bw: true })).toBe('12 reps')
    expect(liftSetText({ r: 1 }, { ...opts, bw: true })).toBe('1 rep')
    expect(liftSetText({ w: 10, r: 12 }, { ...opts, bw: true })).toBe('+10 × 12')
    expect(liftSetText({ w: 80, r: 8 }, opts)).toBe('80 × 8')
    expect(liftSetText({ w: 0, r: 15 }, opts)).toBe('15 reps')
    expect(liftSetText({ w: 10, r: 10 }, opts)).toBe('10 × 10')
  })
  it('a per-side body-weight set reads its reps on each side', () => {
    const side = { w: 0, r: 12 }
    expect(liftSetText({ sides: { L: side, R: side }, done: true }, { ...opts, bw: true })).toBe('L 12 reps\nR 12 reps')
    const id = EXDB.find(e => e.eq === 'body weight' && /pull.?up/i.test(e.n)).id
    expect(liftSetText({ sides: { L: side, R: side }, done: true }, { ...opts, id, bw: true })).toBe('L 12 reps\nR 12 reps')
    expect(liftSetText({ sides: { L: { w: 5, r: 8 }, R: { w: 5, r: 8 } }, done: true }, { ...opts, id, bw: true })).toBe('L +5 × 8\nR +5 × 8')
  })
})
