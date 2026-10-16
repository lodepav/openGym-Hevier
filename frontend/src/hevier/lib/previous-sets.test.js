import { describe, it, expect } from 'vitest'
import { previousSetsFor } from './previous-sets.js'

const W = (w, r, extra = {}) => ({ w, r, done: true, ...extra })
const warm = (w, r) => W(w, r, { phase: 'warmup' })
const H = workouts => ({ workouts, exWeights: {} })

describe('hevier previousSetsFor', () => {
  it('lines work set N up with last time’s work set N', () => {
    const hist = H([{ d: '2026-10-01', entries: [{ id: 'squat', sets: [W(60, 8), W(62.5, 7), W(62.5, 6)] }] }])
    const entry = { id: 'squat', sets: [{ w: 65, r: 8 }, { w: 65, r: 8 }, { w: 65, r: 8 }, { w: 65, r: 8 }] }
    expect(previousSetsFor(hist, entry)).toEqual([W(60, 8), W(62.5, 7), W(62.5, 6), null])
  })

  it('lines warm-ups up with last time’s warm-ups, and work sets count from 1 after them', () => {
    const hist = H([{ d: '2026-10-01', entries: [{ id: 'bench', sets: [warm(20, 10), warm(40, 5), W(60, 8)] }] }])
    const entry = { id: 'bench', sets: [{ phase: 'warmup', w: 20, r: 10 }, { w: 62.5, r: 8 }, { w: 62.5, r: 8 }] }
    expect(previousSetsFor(hist, entry)).toEqual([warm(20, 10), W(60, 8), null])
  })

  it('reads the newest session and skips sets that were never ticked', () => {
    const hist = H([
      { d: '2026-09-01', entries: [{ id: 'row', sets: [W(40, 10)] }] },
      { d: '2026-10-01', entries: [{ id: 'row', sets: [W(45, 10), { w: 45, r: 10, done: false }, W(45, 8)] }] },
    ])
    expect(previousSetsFor(hist, { id: 'row', sets: [{}, {}, {}] })).toEqual([W(45, 10), W(45, 8), null])
  })

  it('prefers the same routine’s last session (upstream lastEntryFor, issue #216)', () => {
    const hist = H([
      { d: '2026-10-01', entries: [{ id: 'squat', rid: 'heavy', sets: [W(100, 5)] }] },
      { d: '2026-10-03', entries: [{ id: 'squat', rid: 'light', sets: [W(70, 10)] }] },
    ])
    expect(previousSetsFor(hist, { id: 'squat', rid: 'heavy', sets: [{}] })).toEqual([W(100, 5)])
    expect(previousSetsFor(hist, { id: 'squat', rid: 'light', sets: [{}] })).toEqual([W(70, 10)])
  })

  it('is all nulls for an exercise never done before', () => {
    expect(previousSetsFor(H([]), { id: 'new', sets: [{}, {}] })).toEqual([null, null])
  })
})
