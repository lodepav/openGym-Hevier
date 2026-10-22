import { describe, it, expect } from 'vitest'
import { previousSetsFor, previousMode } from './previous-sets.js'

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

  it('Any workout (D21) reads the newest session, whatever routine it came from', () => {
    const hist = H([
      { d: '2026-10-01', entries: [{ id: 'squat', rid: 'heavy', sets: [W(100, 5)] }] },
      { d: '2026-10-03', entries: [{ id: 'squat', rid: 'light', sets: [W(70, 10)] }] },
    ])
    expect(previousSetsFor(hist, { id: 'squat', rid: 'heavy', sets: [{}] }, 'any')).toEqual([W(70, 10)])
    expect(previousMode({})).toBe('routine')
    expect(previousMode({ hvPrevious: 'any' })).toBe('any')
  })

  it('is all nulls for an exercise never done before', () => {
    expect(previousSetsFor(H([]), { id: 'new', sets: [{}, {}] })).toEqual([null, null])
  })

  it('reads a set last time lacked from the last session that had it, as Hevy does', () => {
    const hist = H([
      { d: '2026-09-01', entries: [{ id: 'row', sets: [warm(20, 10), warm(30, 5), W(40, 10), W(40, 9), W(40, 8)] }] },
      { d: '2026-10-01', entries: [{ id: 'row', sets: [warm(25, 10), W(45, 10)] }] },
    ])
    const entry = { id: 'row', sets: [{ phase: 'warmup' }, { phase: 'warmup' }, {}, {}, {}, {}] }
    expect(previousSetsFor(hist, entry)).toEqual([warm(25, 10), warm(30, 5), W(45, 10), W(40, 9), W(40, 8), null])
    // Workout Detail's arrows (D66) keep to the last session.
    expect(previousSetsFor(hist, entry, 'routine', { walk: false })).toEqual([warm(25, 10), null, W(45, 10), null, null, null])
  })

  it('walks the same routine’s sessions first, then any other', () => {
    const hist = H([
      { d: '2026-09-01', entries: [{ id: 'squat', rid: 'light', sets: [W(70, 10), W(70, 10), W(70, 10)] }] },
      { d: '2026-09-05', entries: [{ id: 'squat', rid: 'heavy', sets: [W(100, 5), W(100, 5)] }] },
      { d: '2026-10-01', entries: [{ id: 'squat', rid: 'light', sets: [W(72, 10)] }] },
      { d: '2026-10-03', entries: [{ id: 'squat', rid: 'heavy', sets: [W(105, 5)] }] },
    ])
    const entry = { id: 'squat', rid: 'heavy', sets: [{}, {}, {}] }
    expect(previousSetsFor(hist, entry)).toEqual([W(105, 5), W(100, 5), W(70, 10)])
  })

  it('skips sessions kept out of progression', () => {
    const hist = H([
      { d: '2026-09-01', entries: [{ id: 'row', sets: [W(40, 10), W(40, 9)] }] },
      { d: '2026-10-01', entries: [{ id: 'row', noProg: true, sets: [W(20, 10), W(20, 10)] }] },
    ])
    expect(previousSetsFor(hist, { id: 'row', sets: [{}, {}] })).toEqual([W(40, 10), W(40, 9)])
  })

  it('reads last time on the same brand first, then a session with no brand, never another brand (D82)', () => {
    const hist = H([
      { d: '2026-09-01', entries: [{ id: 'press', sets: [W(80, 10), W(80, 9)] }] },
      { d: '2026-09-15', entries: [{ id: 'press', hvBrand: 'Technogym', sets: [W(150, 10)] }] },
      { d: '2026-10-01', entries: [{ id: 'press', hvBrand: 'Life Fitness', sets: [W(120, 10)] }] },
      { d: '2026-10-08', entries: [{ id: 'press', hvBrand: 'Technogym', sets: [W(160, 8)] }] },
    ])
    const entry = { id: 'press', sets: [{}, {}] }
    expect(previousSetsFor(hist, entry, 'routine', { label: 'Life Fitness' })).toEqual([W(120, 10), W(80, 9)])
    expect(previousSetsFor(hist, entry, 'routine', { label: 'Hammer' })).toEqual([W(80, 10), W(80, 9)])
    // No label: every session, as before.
    expect(previousSetsFor(hist, entry)).toEqual([W(160, 8), W(80, 9)])
    // Workout Detail's arrows keep to the last session on the label.
    expect(previousSetsFor(hist, entry, 'routine', { walk: false, label: 'Technogym' })).toEqual([W(160, 8), null])
  })

  it('tells a cable’s setups apart: ×2 reads ×2 sessions, then untagged (1:1) ones (D82)', () => {
    const hist = H([
      { d: '2026-10-01', entries: [{ id: '0150', sets: [W(40, 10)] }] },
      { d: '2026-10-08', entries: [{ id: '0150', hvCable: 'x2', sets: [W(20, 10)] }] },
      { d: '2026-10-15', entries: [{ id: '0150', hvCable: '2:1', sets: [W(70, 10)] }] },
    ])
    const entry = { id: '0150', sets: [{}] }
    expect(previousSetsFor(hist, entry, 'routine', { label: '|x2' })).toEqual([W(20, 10)])
    expect(previousSetsFor(hist, entry, 'routine', { label: '|2:1' })).toEqual([W(70, 10)])
  })
})
