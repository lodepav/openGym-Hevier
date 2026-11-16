import { describe, expect, it } from 'vitest'
import { EXDB } from '../../lib/exercises.js'
import { pastSwaps, doneHere } from './swap-history.js'

const id = re => EXDB.find(e => re.test(e.n)).id
const SQUAT = id(/^barbell full squat$/i)       // Quadriceps
const BENCH = id(/^barbell bench press$/i)      // Chest
const ROW = id(/^barbell bent over row$/i)      // Upper Back
const DB_BENCH = id(/^dumbbell bench press$/i)  // Chest
const CHEST_PRESS = id(/^lever chest press$/i)  // Chest
const FLY = id(/^dumbbell fly$/i)               // Chest
const CURL = id(/^barbell curl$/i)              // Biceps

const routine = (ex = [SQUAT, BENCH, ROW]) => ({ id: 'r1', name: 'Full A', ex: ex.map(x => ({ id: x, sets: 3, reps: 8 })) })
let n = 0
// A saved workout of routine r1 on `d`, each exercise with one ticked set of `w` kg.
const wk = (d, ids, { rid = 'r1', gym, w = 50 } = {}) => ({
  id: 'w' + ++n, d, start: Date.parse(d + 'T10:00:00'), routineIds: rid ? [rid] : [],
  entries: ids.map(x => ({ id: x, ...(rid ? { rid } : {}), ...(gym ? { hvGym: gym } : {}), sets: [{ w, r: 8, done: true }] })),
})
const state = (workouts, r = routine()) => ({ unit: 'kg', routines: [r], workouts })

describe('hevier pastSwaps (D129)', () => {
  it('finds an exercise done once in place of the routine’s, with when and the last set', () => {
    const S = state([wk('2026-09-01', [SQUAT, BENCH, ROW]), wk('2026-09-08', [SQUAT, DB_BENCH, ROW], { w: 27.5 })])
    const rows = pastSwaps(S, BENCH, 'r1')
    expect(rows.map(r => r.id)).toEqual([DB_BENCH])
    expect(rows[0]).toMatchObject({ n: 1, d: '2026-09-08' })
    expect(rows[0].last).toMatchObject({ w: 27.5, r: 8 })
  })

  it('counts swaps to two different exercises, the most often first', () => {
    const S = state([
      wk('2026-09-01', [SQUAT, BENCH, ROW]),
      wk('2026-09-03', [SQUAT, CHEST_PRESS, ROW]),
      wk('2026-09-05', [SQUAT, DB_BENCH, ROW]),
      wk('2026-09-07', [SQUAT, DB_BENCH, ROW]),
      wk('2026-09-09', [SQUAT, BENCH, ROW]),
    ])
    expect(pastSwaps(S, BENCH, 'r1').map(r => [r.id, r.n])).toEqual([[DB_BENCH, 2], [CHEST_PRESS, 1]])
    expect(pastSwaps(S, SQUAT, 'r1')).toEqual([])
  })

  it('an extra exercise added beside the routine’s own is no swap', () => {
    const S = state([
      wk('2026-09-01', [SQUAT, BENCH, ROW]),
      wk('2026-09-03', [SQUAT, BENCH, FLY, ROW]),        // added, the bench still done
      wk('2026-09-05', [SQUAT, ROW, DB_BENCH]),          // the bench left out, the press done elsewhere
      wk('2026-09-07', [SQUAT, CURL, ROW]),              // another muscle in its place
    ])
    expect(pastSwaps(S, BENCH, 'r1')).toEqual([])
  })

  it('a routine edited since: what its old exercise was is not a swap of the new one', () => {
    // The routine had the dumbbell press until 2026-09-05 and the bench since.
    const S = state([
      wk('2026-09-01', [SQUAT, DB_BENCH, ROW]),
      wk('2026-09-03', [SQUAT, DB_BENCH, ROW]),
      wk('2026-09-07', [SQUAT, BENCH, ROW]),
    ])
    expect(pastSwaps(S, BENCH, 'r1')).toEqual([])
    // Swapped after the edit, it counts.
    S.workouts.push(wk('2026-09-09', [SQUAT, CHEST_PRESS, ROW]))
    expect(pastSwaps(S, BENCH, 'r1').map(r => r.id)).toEqual([CHEST_PRESS])
  })

  it('a gap two missing routine exercises of one muscle could fill is left alone', () => {
    const S = state([
      wk('2026-09-01', [SQUAT, BENCH, FLY, ROW]),
      wk('2026-09-03', [SQUAT, DB_BENCH, ROW]),
    ], routine([SQUAT, BENCH, FLY, ROW]))
    expect(pastSwaps(S, BENCH, 'r1')).toEqual([])
  })

  it('only the routine’s own workouts, and nothing for an exercise not in it', () => {
    const S = state([
      wk('2026-09-01', [SQUAT, BENCH, ROW]),
      wk('2026-09-03', [SQUAT, DB_BENCH, ROW], { rid: 'r2' }),
    ])
    expect(pastSwaps(S, BENCH, 'r1')).toEqual([])
    expect(pastSwaps(S, CURL, 'r1')).toEqual([])
    expect(pastSwaps(S, BENCH, null)).toEqual([])
  })

  it('reads an older workout without `rid` on its entries by its one routine', () => {
    const old = (d, ids) => ({ ...wk(d, ids, { rid: null }), routineIds: ['r1'] })
    const S = state([old('2026-09-01', [SQUAT, BENCH, ROW]), old('2026-09-03', [SQUAT, DB_BENCH, ROW])])
    expect(pastSwaps(S, BENCH, 'r1').map(r => r.id)).toEqual([DB_BENCH])
  })
})

describe('hevier doneHere (D129)', () => {
  it('lists what this gym logged, most recent first, with how often and the last set', () => {
    const S = state([
      wk('2026-09-01', [SQUAT, FLY], { gym: 'g1' }),
      wk('2026-09-03', [SQUAT, CHEST_PRESS], { gym: 'g2' }),
      wk('2026-09-05', [DB_BENCH, BENCH], { gym: 'g1' }),
      wk('2026-09-07', [FLY], { gym: 'g1', w: 14 }),
    ])
    const rows = doneHere(S, 'g1')
    expect(rows.map(r => r.id)).toEqual([FLY, DB_BENCH, BENCH, SQUAT])
    expect(rows[0]).toMatchObject({ n: 2, d: '2026-09-07' })
    expect(rows[0].last).toMatchObject({ w: 14 })
    expect(doneHere(S).map(r => r.id)).toEqual([FLY, DB_BENCH, BENCH, SQUAT, CHEST_PRESS])
  })

  it('counts a workout saved without a gym: only one known to be elsewhere is left out', () => {
    const S = state([wk('2026-09-01', [CURL]), wk('2026-09-03', [ROW], { gym: 'g2' }), wk('2026-09-05', [FLY], { gym: 'g1' })])
    expect(doneHere(S, 'g1').map(r => r.id)).toEqual([FLY, CURL])
  })
})
