// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { DEF } from '../../store/useStore.js'
import { monthCells, monthsBack, workoutsByDay, restDays, dayMark } from './calendar.js'

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
