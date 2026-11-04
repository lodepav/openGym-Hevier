import { describe, expect, it } from 'vitest'
import { forkWeeklySets, GROUP_OF, mostRoom } from './weekly-sets.js'
import { EXDB } from '../../lib/exercises.js'
import { TARGET_MUSCLES } from '../../lib/muscle-targets.js'
import { mainMuscleOf } from './main-muscle.js'

const find = re => EXDB.find(e => re.test(e.n))
const BENCH = find(/^barbell bench press$/), PULLDOWN = find(/^cable bar lateral pulldown$/), ROW = find(/^lever seated row$/), CURL = find(/^barbell curl$/)
const sets = n => Array.from({ length: n }, () => ({ w: 50, r: 8, done: true }))
const today = '2026-11-04'   // a Wednesday
const S = (extra = {}) => ({ weekStart: 1, workouts: [
  { id: 'a', d: '2026-11-02', entries: [{ id: BENCH.id, sets: sets(4) }, { id: PULLDOWN.id, sets: sets(3) }] },
  { id: 'b', d: '2026-11-03', entries: [{ id: ROW.id, sets: [...sets(2), { w: 30, r: 10, done: true, phase: 'warmup' }] }, { id: CURL.id, sets: sets(3) }] },
  { id: 'old', d: '2026-10-27', entries: [{ id: BENCH.id, sets: sets(9) }] },
], ...extra })

describe('hevier: weekly sets per muscle, counted the fork’s way (D99)', () => {
  it('maps every fork group name onto one of upstream’s ranged groups', () => {
    for (const g of Object.values(GROUP_OF)) expect(TARGET_MUSCLES).toContain(g)
  })
  it('counts this week’s work sets by main muscle, lats and upper back as one back', () => {
    expect(mainMuscleOf(PULLDOWN)).toBe('Lats')
    const rows = Object.fromEntries(forkWeeklySets(S(), today).map(r => [r.slug, r]))
    expect(rows.chest.sets).toBe(4)              // last week's nine left out
    expect(rows['upper-back'].sets).toBe(5)      // 3 pulldown (lats) + 2 rows, the warm-up not counted
    expect(rows.biceps.sets).toBe(3)
    expect(rows.chest).toMatchObject({ lo: 10, hi: 20, status: 'below' })
  })
  it('holds them against the profile’s own range, and finds the most room', () => {
    const rows = forkWeeklySets(S({ muscleTargets: { chest: [2, 4] } }), today)
    expect(rows.find(r => r.slug === 'chest').status).toBe('in')
    expect(mostRoom(rows).slug).toBe('deltoids')   // the first in body order with nothing yet (upstream's rule)
  })
})
