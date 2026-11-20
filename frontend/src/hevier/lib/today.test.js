import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setsText, sessionSets, weekStrip, roundOf } from './today.js'
import { pinOn } from './plan-pins.js'
import { hooks } from '../hooks.js'
import { isPlain, plainRows } from './plain-routine.js'
import { setPlanned } from './next-plan.js'
import { fixture, PLAIN, BENCH, CALF, PLANK } from './routine-open.fixture.js'

// next-planned.test.js's case: a six-session pass, Upper A and Lower A done Sat 14 and Sun 15 Nov,
// today Mon 16 Nov, the rest planned day by day from Tue 17.
const ids = ['ua', 'la', 'ub', 'lb', 'uc', 'lc']
const routines = ids.map(id => ({ id, name: 'TBJP ' + id.toUpperCase(), ex: [] }))
const TODAY = '2026-11-16'
const w = (id, d) => ({ id: 'w-' + id + d, d, start: Date.parse(d + 'T10:00:00'), routineIds: [id], routineId: id, name: id, entries: [] })
const plan = { '2026-11-17': 'ua', '2026-11-18': 'la', '2026-11-20': 'ub', '2026-11-21': 'lb', '2026-11-23': 'uc', '2026-11-24': 'lc' }
const S = (over = {}) => ({
  unit: 'kg', routines, week: {}, dayPlan: { ...plan }, weekStart: 1,
  workouts: [w('ua', '2026-11-14'), w('la', '2026-11-15')],
  queue: { ids, since: Date.parse('2026-11-02T08:00:00'), startsOn: '2026-11-02', label: 'TBJP', rotationId: 'r1' },
  rotation: { id: 'r1', sequence: ids, label: 'TBJP' },
  ...over,
})

beforeEach(() => { hooks.pinOn = pinOn })
afterEach(() => { hooks.pinOn = null })

describe('Today: the sets the next session opens with (D134)', () => {
  it('collapses equal sets, lists different ones, leaves warm-ups out', () => {
    expect(setsText([{ kind: 'warm', n: 0 }, ...[0, 1, 2].map(k => ({ kind: 'work', k, w: 60, reps: 8 }))])).toBe('3 × 60 × 8')
    expect(setsText([{ kind: 'work', w: 80, reps: 8 }, { kind: 'work', w: 55, reps: 13 }])).toBe('80 × 8, 55 × 13')
    expect(setsText([8, 8, 7, 6].map(reps => ({ kind: 'work', w: 80, reps })))).toBe('2 × 80 × 8, 80 × 7, 80 × 6')
    expect(setsText([{ kind: 'work', w: 0, reps: 12 }])).toBe('× 12')
    expect(setsText([{ kind: 'work', w: 0, sec: 45 }])).toBe('45 s')
    expect(setsText([{ kind: 'work', min: 20, speed: 8 }])).toBe('20 min')
  })

  it('reads each routine exercise in order, through the routine table', () => {
    const s = S({ routines: [{ id: 'ua', name: 'Upper A', ex: [{ id: 'x1', sets: 3, reps: 8, weight: 60 }, { id: 'x2', sets: 1, reps: 10 }] }] })
    expect(sessionSets(s, ['ua', 'gone'])).toEqual([
      { key: 'ua:0', id: 'x1', sets: '3 × 60 × 8' },
      { key: 'ua:1', id: 'x2', sets: '× 10' },
    ])
  })

  it('writes an exercise shown in lb in lb, as its page does (D41)', () => {
    const s = S({ unit: 'kg', exUnit: { x1: { unit: 'lb', _ts: 1 } }, routines: [{ id: 'ua', name: 'Upper A', ex: [{ id: 'x1', sets: 3, reps: 8, weight: 60 }] }] })
    expect(sessionSets(s, ['ua'])[0].sets).toMatch(/^3 × 132(\.\d+)? × 8$/)
  })
})

describe('Today: the card shows what the routine’s page shows (D128)', () => {
  beforeEach(() => { hooks.plainRoutine = { is: isPlain, rows: plainRows } })
  afterEach(() => { hooks.plainRoutine = null })

  it('last time’s sets, a per-side set each side, holds as seconds, and a planned number', () => {
    const s = fixture()
    const card = () => Object.fromEntries(sessionSets(s, [PLAIN.id]).map(x => [x.id, x.sets]))
    expect(card()).toMatchObject({ [BENCH]: '65 × 8, 65 × 7, 65 × 6', [CALF]: '20 × 12/9, 20 × 11/9', [PLANK]: '60 s, 50 s' })
    setPlanned(s, PLAIN.id, BENCH, '1', null, 'r', 8)
    setPlanned(s, PLAIN.id, BENCH, '2', null, 'w', 62.5)
    expect(card()[BENCH]).toBe('2 × 65 × 8, 62.5 × 6')
  })
})

describe('Today: the week in one row', () => {
  it('done days, today at rest, the planned routines and the next one marked', () => {
    const days = weekStrip(S(), TODAY)
    expect(days.map(d => d.iso)).toEqual(['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22'])
    expect(days.map(d => d.kind)).toEqual(['rest', 'plan', 'plan', '', 'plan', 'plan', ''])
    expect(days[1]).toMatchObject({ name: 'TBJP UA', next: true })
    expect(days.filter(d => d.next)).toHaveLength(1)
  })

  it('starts on Sunday when the profile does, the weekend done', () => {
    const days = weekStrip(S({ weekStart: 0 }), TODAY)
    expect(days[0].iso).toBe('2026-11-15')
    expect(days[0].kind).toBe('done')
  })
})

describe('Today: the round line', () => {
  it('counts the rotation’s round while it runs', () => {
    expect(roundOf(S(), TODAY)).toEqual({ done: 2, of: 6, round: true })
  })

  it('without one, this week’s workouts against the planned weekdays, or nothing', () => {
    const plain = { routines, week: { 2: ['ua'], 4: ['la'] }, dayPlan: {}, workouts: [w('ua', '2026-11-17')], weekStart: 1 }
    expect(roundOf(plain, '2026-11-18')).toEqual({ done: 1, of: 2, round: false })
    expect(roundOf({ ...plain, week: {} }, '2026-11-18')).toBe(null)
  })
})

describe('Today: the week row drops what every planned name starts with', () => {
  it('keeps the part that tells the days apart', async () => {
    const { shortNames } = await import('./today.js')
    expect(shortNames(['Plan Upper A', '', 'Plan Lower A', 'Plan Upper A'])).toEqual(['Upper A', '', 'Lower A', 'Upper A'])
    expect(shortNames(['Push', '', 'Pull'])).toEqual(['Push', '', 'Pull'])
    expect(shortNames(['Plan Upper A', 'Cardio', 'Plan Lower A'])).toEqual(['Upper A', 'Cardio', 'Lower A'])
    expect(shortNames(['Plan A', '', 'Plan A'])).toEqual(['Plan A', '', 'Plan A'])
    expect(shortNames(['Plan', 'Plan B'])).toEqual(['Plan', 'Plan B'])
  })
})

