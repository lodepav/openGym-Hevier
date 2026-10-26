// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { DEF } from '../../store/useStore.js'
import { monthCells, monthsBack, workoutsByDay, restDays, dayMark, workoutKind, dayKind, dayTitle, planKind, planTitle } from './calendar.js'
import { EXDB, isCardio } from '../../lib/exercises.js'

const MONDAY = 1, SUNDAY = 0

describe('hevier: calendar', () => {
  it('lays a month out from the week start', () => {
    // 1 October 2026 is a Thursday.
    const mon = monthCells(2026, 9, MONDAY)
    expect(mon.slice(0, 4)).toEqual([null, null, null, '2026-10-01'])
    expect(mon.at(-1)).toBe('2026-10-31')
    expect(mon.filter(Boolean)).toHaveLength(31)
    expect(monthCells(2026, 9, SUNDAY).indexOf('2026-10-01')).toBe(4)
  })

  it('counts months back across a year', () => {
    expect(monthsBack(2026, 1, 3)).toEqual([{ y: 2026, mo: 1 }, { y: 2026, mo: 0 }, { y: 2025, mo: 11 }])
  })

  it('counts rest days since the last workout', () => {
    const ws = [{ d: '2026-10-10' }, { d: '2026-10-13' }, { d: '2026-10-20' }]
    expect(restDays(ws, '2026-10-16')).toBe(3)
    expect(restDays(ws, '2026-10-13')).toBe(0)
    expect(restDays([], '2026-10-16')).toBeNull()
  })

  it('marks trained days first, then notes and plans', () => {
    const S = { ...structuredClone(DEF), workouts: [{ d: '2026-10-13' }] }
    const by = workoutsByDay(S.workouts)
    expect(by['2026-10-13']).toHaveLength(1)
    expect(dayMark(S, '2026-10-13', by)).toBe('done')
    expect(dayMark(S, '2026-10-14', by)).toBe('')
  })
})

describe('hevier: calendar kinds and titles', () => {
  const RUN = EXDB.find(e => isCardio(e)).id
  const LIFT = EXDB.find(e => !isCardio(e)).id
  const w = (name, ids, extra = {}) => ({ name, entries: ids.map(id => ({ id })), ...extra })

  it('cardio only when every exercise is cardio, strength with any lift, deload when the title or note says so', () => {
    expect(workoutKind(w('Run', [RUN]))).toBe('cardio')
    expect(workoutKind(w('Mixed', [RUN, LIFT]))).toBe('strength')
    expect(workoutKind(w('Deload week', [LIFT]))).toBe('deload')
    expect(workoutKind(w('Push', [LIFT], { note: 'light, DELOAD' }))).toBe('deload')
    expect(workoutKind(w('Empty', []))).toBe('strength')
  })

  it('a day takes deload over strength over cardio, and its first workout\'s title', () => {
    const run = w('Run', [RUN], { start: 2 }), push = w('Push', [LIFT], { start: 1 })
    expect(dayKind([run, push])).toBe('strength')
    expect(dayKind([run])).toBe('cardio')
    expect(dayKind([run, w('Deload', [LIFT])])).toBe('deload')
    expect(dayKind(undefined)).toBe('')
    expect(dayTitle([run, push])).toBe('Push')
    expect(dayTitle(undefined)).toBe('')
  })

  it('a planned day from today on, not trained, takes its routines\' kind (D68)', () => {
    const S = structuredClone(DEF)
    S.routines = [
      { id: 'push', name: 'Push', ex: [{ id: LIFT }] },
      { id: 'run', name: 'Run', ex: [{ id: RUN }] },
      { id: 'dl', name: 'Deload legs', ex: [{ id: LIFT }] },
    ]
    S.week = { 1: ['push'], 2: ['run'], 3: ['run', 'push'], 6: ['dl'] }   // 2026-10-19 is a Monday
    const today = '2026-10-19'
    expect(planKind(S, '2026-10-19', {}, today)).toBe('strength')
    expect(planKind(S, '2026-10-20', {}, today)).toBe('cardio')
    expect(planKind(S, '2026-10-21', {}, today)).toBe('strength')
    expect(planKind(S, '2026-10-24', {}, today)).toBe('deload')
    expect(planKind(S, '2026-10-22', {}, today)).toBe('')                       // nothing planned
    expect(planKind(S, '2026-10-12', {}, today)).toBe('')                       // past
    expect(planKind(S, '2026-10-19', { '2026-10-19': [{}] }, today)).toBe('')   // trained
    expect(planTitle(S, '2026-10-21', {}, today)).toBe('Run')                  // the first routine's name
    expect(planTitle(S, '2026-10-12', {}, today)).toBe('')
  })
})
