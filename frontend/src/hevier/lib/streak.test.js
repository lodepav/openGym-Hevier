import { describe, expect, it } from 'vitest'
import { trainingStreak } from './streak.js'

const MONDAY = 1, SUNDAY = 0
const ws = (...days) => days.map(d => ({ d }))
// Every `step` days from `from`, `n` times.
function every(from, step, n) {
  const out = [], d = new Date(from + 'T12:00:00')
  for (let i = 0; i < n; i++) {
    out.push({ d: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') })
    d.setDate(d.getDate() + step)
  }
  return out
}

describe('hevier: training streak (D59)', () => {
  it('is null with no workouts', () => {
    expect(trainingStreak([], '2026-10-18')).toBeNull()
    expect(trainingStreak(ws('2026-10-20'), '2026-10-18')).toBeNull()
  })

  it('counts consecutive weeks', () => {
    // Mondays 28 Sep, 5 Oct, 12 Oct 2026; today is Sunday 18 Oct.
    expect(trainingStreak(ws('2026-09-29', '2026-10-06', '2026-10-13', '2026-10-15'), '2026-10-18')).toEqual({ unit: 'weeks', n: 3 })
  })

  it('lets one week off pass and counts it', () => {
    // Weeks of 21 Sep and 5 Oct trained, 28 Sep off.
    expect(trainingStreak(ws('2026-09-22', '2026-10-06'), '2026-10-07')).toEqual({ unit: 'weeks', n: 3 })
  })

  it('breaks at two weeks off in a row', () => {
    // 14 Sep trained, 21 and 28 Sep off, 5 Oct trained: a new run of one.
    expect(trainingStreak(ws('2026-09-15', '2026-10-06'), '2026-10-07')).toEqual({ unit: 'weeks', n: 1 })
  })

  it('stays alive through this week and one week off, not two', () => {
    const w = ws('2026-09-29', '2026-10-01')   // week of 28 Sep
    expect(trainingStreak(w, '2026-10-04')).toEqual({ unit: 'weeks', n: 1 })   // same week
    expect(trainingStreak(w, '2026-10-18')).toEqual({ unit: 'weeks', n: 1 })   // 5 Oct off, 12 Oct running
    expect(trainingStreak(w, '2026-10-19')).toEqual({ unit: 'weeks', n: 0 })   // 5 and 12 Oct off
  })

  it('follows the week start', () => {
    // Sunday 4 Oct and Sunday 18 Oct: Monday weeks 28 Sep and 12 Oct (5 Oct off); Sunday weeks
    // 4 Oct and 18 Oct (11 Oct off). Both a run of three.
    const w = ws('2026-10-04', '2026-10-18')
    expect(trainingStreak(w, '2026-10-18', MONDAY)).toEqual({ unit: 'weeks', n: 3 })
    expect(trainingStreak(w, '2026-10-18', SUNDAY)).toEqual({ unit: 'weeks', n: 3 })
    // Saturday 3 Oct and Sunday 18 Oct: Sunday weeks 27 Sep and 18 Oct, two weeks off between.
    expect(trainingStreak(ws('2026-10-03', '2026-10-18'), '2026-10-18', SUNDAY)).toEqual({ unit: 'weeks', n: 1 })
  })

  it('switches to years once the run spans a year, to a tenth rounded down', () => {
    const w = every('2025-03-18', 7, 83)   // weekly from 18 Mar 2025 to 13 Oct 2026
    expect(trainingStreak(w, '2026-10-18')).toEqual({ unit: 'years', n: 1.5 })
    expect(trainingStreak(every('2025-10-13', 7, 53), '2026-10-13')).toEqual({ unit: 'weeks', n: 53 })   // 364 days
    expect(trainingStreak(every('2025-10-13', 7, 54), '2026-10-19')).toEqual({ unit: 'years', n: 1 })    // 371 days
  })

  it('keeps the years through weeks off shorter than two months', () => {
    // A year of weekly training, then six weeks off: the week streak is broken, the years are not.
    const w = [...every('2025-01-06', 7, 53), { d: '2026-02-16' }]
    expect(trainingStreak(w, '2026-02-20')).toEqual({ unit: 'years', n: 1.1 })
  })

  it('breaks the years at two months off', () => {
    const w = [...every('2024-01-01', 7, 60), ...every('2025-05-01', 7, 30)]   // the first run's last is 17 Feb 2025
    expect(trainingStreak(w, '2025-10-20').unit).toBe('weeks')
    // No workout for over two months: back to weeks, and the week streak is gone.
    expect(trainingStreak(every('2024-01-01', 7, 60), '2025-04-18')).toEqual({ unit: 'weeks', n: 0 })
    expect(trainingStreak(every('2024-01-01', 7, 60), '2025-04-17')).toEqual({ unit: 'years', n: 1.1 })
  })
})
