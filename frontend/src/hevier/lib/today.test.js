import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setsText, sessionSets, weekStrip, roundOf } from './today.js'
import { pinOn } from './plan-pins.js'
import { hooks } from '../hooks.js'

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
    expect(setsText([{ kind: 'warm', n: 0 }, ...[0, 1, 2].map(k => ({ kind: 'work', k, w: 60, reps: 8 }))])).toBe('3 sets · 60 × 8')
    expect(setsText([{ kind: 'work', w: 80, reps: 8 }, { kind: 'work', w: 55, reps: 13 }])).toBe('80 × 8, 55 × 13')
    expect(setsText([{ kind: 'work', w: 0, reps: 12 }])).toBe('× 12')
    expect(setsText([{ kind: 'work', w: 0, sec: 45 }])).toBe('45 s')
    expect(setsText([{ kind: 'work', min: 20, speed: 8 }])).toBe('20 min')
    expect(setsText([{ kind: 'work', w: 40, reps: 12, repsMin: 8 }])).toBe('40 × 8–12')
  })

  it('reads each routine exercise in order, through the routine table', () => {
    const s = S({ routines: [{ id: 'ua', name: 'Upper A', ex: [{ id: 'x1', sets: 3, reps: 8, weight: 60 }, { id: 'x2', sets: 1, reps: 10 }] }] })
    expect(sessionSets(s, ['ua', 'gone'])).toEqual([
      { key: 'ua:0', id: 'x1', sets: '3 sets · 60 × 8' },
      { key: 'ua:1', id: 'x2', sets: '× 10' },
    ])
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
