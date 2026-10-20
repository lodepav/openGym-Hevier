import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { isPlain, progressionOn, plainRows, filledFromLast } from './plain-routine.js'
import { buildPlannedEntry } from '../../lib/session-start.js'
import { hooks } from '../hooks.js'
import { makeSideSet } from '../../lib/workout-model.js'

const W = (w, r, extra = {}) => ({ w, r, done: true, ...extra })
const warm = (w, r) => W(w, r, { phase: 'warmup' })
const S0 = workouts => ({ unit: 'kg', workouts, exWeights: {}, routines: [] })
const pick = rows => rows.map(s => [s.phase === 'warmup' ? 'W' : 'S', s.w, s.r])

// The user's TBJP Upper B, as Hevy's routine has it: one warm-up and 2 × 75 kg × 8 on the reverse
// fly (rep range 8–12 → double progression, D31), last done as W 52.5 × 5, 75 × 8, 52.5 × 10.
const fly = { id: '0602', sets: 2, reps: 12, repsMin: 8, weight: 75, mode: 'reps', warmupSets: 1, prog: 'double', restSec: 75 }
const upperB = { id: 'r-upper-b', name: 'TBJP Upper B', ex: [fly] }
const flyDay = (d, sets) => ({ d, routineId: upperB.id, entries: [{ id: '0602', sets }] })

describe('hevier plain routines (D69)', () => {
  beforeAll(() => { hooks.plainRoutine = { is: isPlain, rows: plainRows } })
  afterAll(() => { hooks.plainRoutine = null })

  it('is off unless the routine switches it on, and a deload or freestyle keeps upstream’s', () => {
    expect(isPlain(upperB)).toBe(true)
    expect(progressionOn(upperB)).toBe(false)
    expect(isPlain({ ...upperB, hvProg: true })).toBe(false)
    expect(isPlain({ ...upperB, excludeFromProgression: true })).toBe(false)
    expect(isPlain(null)).toBe(false)
  })

  it('opens each set at what was done last time, warm-up included, with no double progression', () => {
    const S = S0([flyDay('2026-10-13', [warm(52.5, 5), W(75, 8), W(52.5, 10)])])
    const built = buildPlannedEntry(S, fly, upperB)
    expect(pick(built.sets)).toEqual([['W', 52.5, 5], ['S', 75, 8], ['S', 52.5, 10]])
    expect(built.plan.kind).toBe('off')
  })

  it('takes a set last time lacked from the last session that had it', () => {
    const S = S0([
      flyDay('2026-10-06', [warm(50, 5), W(75, 8), W(52.5, 11)]),
      flyDay('2026-10-13', [W(77.5, 8)]),
    ])
    expect(pick(buildPlannedEntry(S, fly, upperB).sets)).toEqual([['W', 50, 5], ['S', 77.5, 8], ['S', 52.5, 11]])
  })

  it('opens a never-done exercise at the routine’s numbers', () => {
    const built = buildPlannedEntry(S0([]), { ...fly, warmupSets: 0 }, upperB)
    expect(pick(built.sets)).toEqual([['S', 75, 12], ['S', 75, 12]])
  })

  it('with the switch on is upstream’s: double progression and a warm-up ramp', () => {
    const S = S0([flyDay('2026-10-13', [warm(52.5, 5), W(75, 12), W(75, 12)])])
    const built = buildPlannedEntry(S, fly, { ...upperB, hvProg: true })
    expect(built.plan.kind).not.toBe('off')
    expect(built.sets[0].w).not.toBe(52.5)
  })

  it('marks a filled weight so an edit above it does not cascade, and keeps it grey (hvLast)', () => {
    const S = S0([flyDay('2026-10-13', [W(75, 8), W(52.5, 10)])])
    const [a, b] = buildPlannedEntry(S, { ...fly, warmupSets: 0 }, upperB).sets
    expect(a).toMatchObject({ weightOrigin: 'manual', hvLast: 1, done: false })
    expect(b).toMatchObject({ w: 52.5, r: 10, weightOrigin: 'manual', hvLast: 1 })
  })

  it('fills per-side sets side by side (the user’s Iso-Lateral High Row)', () => {
    const row = { id: '1454', sets: 1, reps: 8, weight: 50, mode: 'reps', unilateral: true }
    const last = makeSideSet({ w: 50, r: 14 })
    last.sides.L = { ...last.sides.L, r: 7, done: true }
    last.sides.R = { ...last.sides.R, r: 6, done: true }
    last.done = true
    const rows = plainRows(S0([{ d: '2026-10-13', routineId: upperB.id, entries: [{ id: '1454', sets: [last] }] }]), {}, row, upperB, [makeSideSet({ w: 50, r: 8 })])
    expect(rows[0].sides.L).toMatchObject({ w: 50, r: 7, done: false })
    expect(rows[0].sides.R).toMatchObject({ w: 50, r: 6, done: false })
    // The mark is on the row, as upstream rebuilds a side from the fields it knows.
    expect(rows[0].hvLast).toBe('LR')
    expect(filledFromLast(rows[0], 'L') && filledFromLast(rows[0], 'R')).toBe(true)
    expect(filledFromLast({ ...rows[0], hvLast: 'R' }, 'L')).toBe(false)
  })

  it('fills a timed hold’s seconds and leaves a ticked row alone', () => {
    const plank = { id: 'plank', sets: 2, sec: 30, mode: 'time' }
    const H = S0([{ d: '2026-10-13', routineId: upperB.id, entries: [{ id: 'plank', sets: [W(0, 0, { sec: 75 }), W(0, 0, { sec: 60 })] }] }])
    const out = plainRows(H, {}, plank, upperB, [{ sec: 30, w: 0, done: true }, { sec: 30, w: 0, done: false }])
    expect(out.map(s => s.sec)).toEqual([30, 60])
  })
})
