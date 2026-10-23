import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { finishCompare } from '../../lib/finish-compare.js'
import { isPlain, progressionOn, plainRows, filledFromLast, refillRows, withoutForecast } from './plain-routine.js'
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

  // D82: the user's leg press, Life Fitness at City Gym and Technogym at Home.
  const press = { id: 'press', sets: 2, reps: 10, weight: 100, mode: 'reps', warmupSets: 0 }
  const legs = { id: 'r-legs', name: 'Legs', ex: [press] }
  const pressDay = (d, brand, sets) => ({ d, routineId: legs.id, entries: [{ id: 'press', ...(brand ? { hvBrand: brand } : {}), sets }] })
  const labelled = (gym, active) => ({
    ...S0([
      pressDay('2026-09-01', null, [W(90, 10), W(90, 10)]),
      pressDay('2026-10-01', 'Life Fitness', [W(140, 10)]),
      pressDay('2026-10-08', 'Technogym', [W(180, 8), W(180, 7)]),
    ]),
    equipProfiles: [{ id: 'city' }, { id: 'home' }], activeEquipId: gym, active,
    hvMachines: { press: { city: 'Life Fitness', home: 'Technogym' } },
  })

  it('opens at last time on the brand the gym has, then at a session with no brand (D82)', () => {
    expect(pick(buildPlannedEntry(labelled('city'), press, legs).sets)).toEqual([['S', 140, 10], ['S', 90, 10]])
    expect(pick(buildPlannedEntry(labelled('home'), press, legs).sets)).toEqual([['S', 180, 8], ['S', 180, 7]])
    // A session already open reads its own gym.
    expect(pick(buildPlannedEntry(labelled('city', { start: 1, hvGym: 'home', entries: [] }), press, legs).sets)).toEqual([['S', 180, 8], ['S', 180, 7]])
  })

  it('refills the untouched sets when the brand changes, and keeps a typed or ticked one (D82)', () => {
    const S = labelled('city')
    const e = { id: 'press', rid: legs.id, target: press, sets: buildPlannedEntry(S, press, legs).sets }
    // To Technogym: both rows were last time's on Life Fitness or with no brand.
    expect(pick(refillRows(S, S, e, legs, 'Technogym', 'Life Fitness'))).toEqual([['S', 180, 8], ['S', 180, 7]])
    // A brand never done: last time with no brand, else the routine's own numbers.
    expect(pick(refillRows(S, S, e, legs, 'Hammer', 'Life Fitness'))).toEqual([['S', 90, 10], ['S', 90, 10]])
    const typed = { ...e, sets: [{ ...e.sets[0], r: 12 }, { ...e.sets[1], done: true }] }
    expect(pick(refillRows(S, S, typed, legs, 'Technogym', 'Life Fitness'))).toEqual([['S', 140, 12], ['S', 90, 10]])
    // Not a plain routine's: upstream's rows stay.
    expect(refillRows(S, S, e, { ...legs, hvProg: true }, 'Technogym', 'Life Fitness')).toBe(null)
  })
})

describe('withoutForecast (D85)', () => {
  const plain = { id: 'r1', name: 'Leg Day', ex: [{ id: '0043', sets: 3, reps: 8, weight: 0 }] }
  const prog = { id: 'r2', name: 'Push Day', hvProg: true, ex: [{ id: '0025', sets: 3, reps: 8, weight: 60 }] }
  const S = { unit: 'kg', routines: [plain, prog], workouts: [] }
  const w = { id: 'w1', d: '2026-10-23', start: 2, entries: [
    { id: '0043', rid: 'r1', sets: [{ w: 60, r: 8, done: true }] },
    { id: '0025', rid: 'r2', sets: [{ w: 60, r: 8, done: true }] },
  ] }
  it('drops "Next time" for a routine without progression, keeps it for one with', () => {
    const rows = finishCompare(withoutForecast(S), w)
    expect(rows.find(r => r.id === '0043').next).toBeNull()
    expect(rows.find(r => r.id === '0025').next).not.toBeNull()
  })
  it('leaves the profile as it is', () => {
    withoutForecast(S)
    expect(plain.excludeFromProgression).toBeUndefined()
    expect(withoutForecast({ routines: [prog] }).routines[0]).toBe(prog)
  })
})
