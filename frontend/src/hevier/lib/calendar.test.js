// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { DEF } from '../../store/useStore.js'
import { monthCells, monthsBack, monthsWith, workoutsByDay, restDays, dayMark, workoutKind, dayKind, dayTitle, drawnTitle, planKind, planTitle, openScroll, kindSaid, notesIn } from './calendar.js'
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
    expect(monthsWith({ '2025-12-30': [1], '2026-02-01': [1, 2], '2026-02-14': [3], '2025-12-01': [4] }))
      .toEqual([{ y: 2026, mo: 1, n: 3 }, { y: 2025, mo: 11, n: 2 }])
    expect(monthsWith({})).toEqual([])
    expect(['Afternoon workout 💪', 'Legs 🏋️‍♂️', 'Run 🇨🇭', 'Day 2', 'Push 💪🏽 ', '🔥', ''].map(drawnTitle))
      .toEqual(['Afternoon workout', 'Legs', 'Run', 'Day 2', 'Push', '🔥', ''])
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

describe('hevier: where the month view opens (the sixth audit, 2026-11-22)', () => {
  it('at the bottom while the newest month’s heading stays under the bar, else on that heading', () => {
    // A short month: the page's end, the heading well under the 150 px bar.
    expect(openScroll({ page: 2000, view: 800, head: 1500, bar: 150 })).toBe(1200)
    // A month taller than the screen: its heading 8 px under the bar.
    expect(openScroll({ page: 2000, view: 800, head: 1000, bar: 150 })).toBe(842)
    // A page shorter than the screen stays at the top.
    expect(openScroll({ page: 600, view: 800, head: 200, bar: 150 })).toBe(0)
  })
})

describe('hevier: a day\'s kind word in its spoken name (the ninth critique, 2026-11-22)', () => {
  it('is left out when the title already says it, in any case', () => {
    expect(kindSaid('Cardio', 'Cardio')).toBe('')
    expect(kindSaid('Deload', 'deload legs 💪')).toBe('')
    expect(kindSaid('Cardio', 'Morning run')).toBe('Cardio')
    expect(kindSaid('Cardio', '')).toBe('Cardio')
    expect(kindSaid('', 'Cardio')).toBe('')
  })
})

describe('hevier: the key lists Note only when a note dot is drawn (the tenth critique, 2026-11-22)', () => {
  const S = { ...structuredClone(DEF), dayNotes: { '2026-10-05': { tag: 'sick' } } }
  const oct = [{ y: 2026, mo: 9 }], nov = [{ y: 2026, mo: 10 }]
  it('a noted day in the months shown, not trained', () => {
    expect(notesIn(S, oct, {}, '2026-11-22')).toBe(true)
    expect(notesIn(S, [...nov, ...oct], {}, '2026-11-22')).toBe(true)
    expect(notesIn(S, nov, {}, '2026-11-22')).toBe(false)
    expect(notesIn(S, oct, { '2026-10-05': [{ id: 'w' }] }, '2026-11-22')).toBe(false)
    expect(notesIn({ ...S, dayNotes: {} }, oct, {}, '2026-11-22')).toBe(false)
  })
  it('not a noted day planned from today on: its name or the planned dot is drawn', () => {
    const week = { 0: ['r'], 1: ['r'], 2: ['r'], 3: ['r'], 4: ['r'], 5: ['r'], 6: ['r'] }
    const planned = { ...S, routines: [{ id: 'r', name: 'Push', ex: [] }], week, dayNotes: { '2026-10-05': { tag: 'sick' } } }
    expect(notesIn(planned, oct, {}, '2026-10-05')).toBe(false)
    expect(notesIn(planned, oct, {}, '2026-10-06')).toBe(true)
  })
})
