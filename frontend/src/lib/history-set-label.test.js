import { describe, it, expect } from 'vitest'
import { historySetLabel } from './history.js'
import { finishHolds } from './finish-compare.js'

describe('historySetLabel: the set kind in front of the numbers', () => {
  it('marks a timed hold "H" and a warm-up "W", and leaves a work rep set as it was', () => {
    const hold = { mode: 'time', sec: 45 }
    expect(historySetLabel('plank', { sec: 45, w: 0, done: true }, hold)).toBe('H 0:45')
    expect(historySetLabel('plank', { sec: 30, w: 0, done: true, phase: 'warmup' }, hold)).toBe('W 0:30')
    const reps = { mode: 'reps', reps: 5, weight: 60 }
    expect(historySetLabel('bench', { w: 40, r: 5, done: true, phase: 'warmup', warmup: true }, reps)).toBe('W 40×5')
    expect(historySetLabel('bench', { w: 60, r: 5, done: true }, reps)).toBe('60×5')
  })

  it('reads a hold saved without a target from its seconds', () => {
    expect(historySetLabel('plank', { sec: 60, done: true }, null)).toBe('H 1:00')
  })
})

describe('finishHolds: the timed holds the lift rows leave out', () => {
  it('lists each timed exercise with the sets that were held', () => {
    const w = { entries: [
      { id: 'plank', target: { mode: 'time', sec: 45 }, sets: [{ sec: 30, done: true, phase: 'warmup' }, { sec: 45, done: true }, { sec: 45, done: false }] },
      { id: 'bench', target: { mode: 'reps' }, sets: [{ w: 60, r: 5, done: true }] },
    ] }
    expect(finishHolds(w)).toEqual([{ id: 'plank', target: { mode: 'time', sec: 45 }, sets: [{ sec: 30, done: true, phase: 'warmup' }, { sec: 45, done: true }] }])
    expect(finishHolds({ entries: [] })).toEqual([])
  })
})
