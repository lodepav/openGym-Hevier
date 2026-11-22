import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { workNumberOf, openedHolds, holdsOf, plannedHold, setHold, shiftHolds, pruneHolds, openHold, holdsAfter, canPlanHolds, HOLD_MAX } from './routine-holds.js'
import { isPlain, plainRows, refillRows } from './plain-routine.js'
import { buildPlannedEntry } from '../../lib/session-start.js'
import { makeSideSet } from '../../lib/workout-model.js'
import { mergeStates, stampChange } from '../../lib/sync-merge.js'
import { hooks } from '../hooks.js'
import { nextSession } from './next-plan.js'

const curl = { id: '0043', sets: 3, reps: 10, weight: 20, mode: 'reps' }
const arms = { id: 'r-arms', name: 'Arms', ex: [curl] }
const S0 = workouts => ({ unit: 'kg', workouts, exWeights: {}, routines: [arms] })
const day = (d, sets, target) => ({ d, routineId: arms.id, entries: [{ id: '0043', sets, ...(target ? { target } : {}) }] })
const kinds = rows => rows.map(s => (s.phase === 'warmup' ? 'W' : s.mode === 'time' ? 'H' + s.sec : 'S' + s.r))

describe('hevier routine holds (D146)', () => {
  beforeAll(() => { hooks.plainRoutine = { is: isPlain, rows: plainRows } })
  afterAll(() => { hooks.plainRoutine = null })

  it('plans, reads and clears a hold per work set, and reads a synced map warily', () => {
    const c = setHold(curl, 1, 40)
    expect(c.hvHolds).toEqual({ 1: 40 })
    expect(plannedHold(c, 1)).toBe(40)
    expect(plannedHold(c, 0)).toBeUndefined()
    expect(setHold(c, 1, null).hvHolds).toBeUndefined()
    expect(setHold(c, 1, 0).hvHolds).toEqual({ 1: 0 })
    expect(setHold(curl, 1, 99999).hvHolds).toEqual({ 1: HOLD_MAX })
    // Not a set it has, not a reps exercise, a pyramid: nothing.
    expect(setHold(curl, 3, 40)).toBe(curl)
    expect(setHold({ ...curl, mode: 'time' }, 0, 40).hvHolds).toBeUndefined()
    expect(canPlanHolds({ ...curl, pyramid: [10, 8, 6] })).toBe(false)
    expect(holdsOf({ ...curl, hvHolds: { 0: 40, 1: 'x', 2: -1, 5: 30, a: 3, 1.5: 4 } })).toEqual({ 0: 40 })
    expect(holdsOf({ ...curl, hvHolds: [40] })).toEqual({})
  })

  it('keeps each hold on its set when a set above is taken out, and prunes what the sets lost', () => {
    const c = { ...curl, sets: 4, hvHolds: { 0: 30, 2: 40, 3: 50 } }
    expect(shiftHolds(c, 1).hvHolds).toEqual({ 0: 30, 1: 40, 2: 50 })
    expect(shiftHolds(c, 0).hvHolds).toEqual({ 1: 40, 2: 50 })
    expect(pruneHolds({ ...c, sets: 3 }).hvHolds).toEqual({ 0: 30, 2: 40 })
    expect(pruneHolds({ ...c, mode: 'time' }).hvHolds).toBeUndefined()
  })

  it('opens a planned hold in place of a rep set, the weight as filled, and marks what it opened as', () => {
    const base = { w: 20, r: 10, done: false }
    const filled = { w: 25, r: 8, done: false, hvLast: 1 }
    const c = setHold(curl, 1, 40)
    expect(openHold(c, 1, base, filled)).toEqual([{ w: 25, done: false, hvLast: 1, mode: 'time', sec: 40, hvHeld: 2 }])
    expect(openHold(c, 0, base, filled)).toEqual([filled])
    // Last time a hold there: the planned seconds win, last time's weight stays.
    expect(openHold(c, 1, base, { w: 25, mode: 'time', sec: 60, done: false })[0]).toMatchObject({ mode: 'time', sec: 40, w: 25, hvHeld: 2 })
    // A carried hold with nothing planned is marked; a planned rep set opens at the routine's reps,
    // at last time's weight on that set (the routine's when last time had none).
    expect(openHold(curl, 1, base, { w: 25, mode: 'time', sec: 60 })[0].hvHeld).toBe(2)
    expect(openHold(setHold(curl, 1, 0), 1, base, { w: 25, mode: 'time', sec: 60 })).toEqual([{ ...base, w: 25 }])
    expect(openHold(setHold(curl, 1, 0), 1, base, { w: 0, mode: 'time', sec: 60 })).toEqual([base])
    // A per-side set becomes D89's L/R pair.
    const side = makeSideSet({ w: 20, r: 20 })
    const pair = openHold(setHold({ ...curl, side: true }, 0, 30), 0, side, side)
    expect(pair.map(r => [r.side, r.mode, r.sec, r.hvHeld])).toEqual([['L', 'time', 30, 1], ['R', 'time', 30, 1]])
  })

  it('a plain routine opens the planned set as a hold; last time’s hold carries over elsewhere', () => {
    const S = S0([day('2026-11-01', [{ w: 22, r: 10, done: true }, { w: 22, r: 9, done: true }, { w: 18, mode: 'time', sec: 50, done: true }])])
    const planned = setHold(curl, 1, 40)
    const sets = buildPlannedEntry(S, planned, arms).sets
    expect(kinds(sets)).toEqual(['S10', 'H40', 'H50'])
    expect(sets[1].w).toBe(22)
    // The planned rep set over last time's hold.
    expect(kinds(buildPlannedEntry(S, setHold(curl, 2, 0), arms).sets)).toEqual(['S10', 'S9', 'S10'])
    expect(buildPlannedEntry(S, setHold(curl, 2, 0), arms).sets[2].w).toBe(18)
    // Never done: the routine's weight.
    expect(buildPlannedEntry(S0([]), planned, arms).sets[1]).toMatchObject({ w: 20, mode: 'time', sec: 40 })
    // With progression on, upstream's build: no holds.
    expect(kinds(buildPlannedEntry(S0([]), planned, { ...arms, hvProg: true }).sets)).toEqual(['S10', 'S10', 'S10'])
  })

  it('keeps the planned hold when the brand changes, at last time’s weight on the new brand (D82)', () => {
    const planned = setHold(curl, 1, 40)
    const branded = (d, brand, w) => ({ d, routineId: arms.id, entries: [{ id: '0043', hvBrand: brand, sets: [{ w, r: 10, done: true }, { w, r: 9, done: true }] }] })
    const S = { ...S0([branded('2026-11-01', 'Technogym', 30), branded('2026-11-08', 'Life Fitness', 22)]),
      equipProfiles: [{ id: 'city' }], activeEquipId: 'city', hvMachines: { '0043': { city: 'Life Fitness' } } }
    const e = { id: '0043', rid: arms.id, target: planned, sets: buildPlannedEntry(S, planned, arms).sets }
    expect(e.sets[1]).toMatchObject({ w: 22, mode: 'time', sec: 40 })
    const out = refillRows(S, S, e, arms, 'Technogym', 'Life Fitness')
    expect(kinds(out)).toEqual(['S10', 'H40', 'S10'])
    expect(out.map(r => r.w)).toEqual([30, 30, 20])
    // A hold typed into keeps its numbers.
    const typed = { ...e, sets: e.sets.map((r, i) => (i === 1 ? { ...r, sec: 55 } : r)) }
    expect(refillRows(S, S, typed, arms, 'Technogym', 'Life Fitness')[1]).toMatchObject({ w: 22, sec: 55 })
  })

  it('opens the planned hold on an exercise shown in its own unit (D41), and the target keeps the plan', () => {
    const planned = setHold(curl, 1, 40)
    const S = { ...S0([]), exUnit: { '0043': { unit: 'lb', _ts: 1 } } }
    const built = buildPlannedEntry(S, planned, arms)
    expect(built.sets[1]).toMatchObject({ mode: 'time', sec: 40 })
    expect(built.target.hvHolds).toEqual({ 1: 40 })
  })

  it('D35: plans a hold made in the workout, drops one turned back, and leaves carried and timed ones', () => {
    const at = (sets, target = curl) => ({ id: '0043', target, sets })
    const rep = { w: 20, r: 10, done: true }
    const hold = (sec, from) => ({ w: 20, mode: 'time', sec, done: true, ...(from ? { hvHeld: from } : {}) })
    // Made in the workout.
    expect(holdsAfter(curl, at([rep, hold(35), rep]))).toEqual({ 1: 35 })
    // Opened as one, carried or planned, held longer: no change.
    expect(holdsAfter(curl, at([rep, hold(60, 2), rep]))).toBe(null)
    const planned = setHold(curl, 1, 40)
    expect(holdsAfter(planned, at([rep, hold(60, 2), rep], planned))).toBe(null)
    // Turned back.
    expect(holdsAfter(planned, at([rep, { ...rep, hvHeld: 2 }, rep], planned))).toEqual({})
    // A set above it taken out: the hold moves up with its set.
    const smaller = { ...planned, sets: 2 }
    expect(holdsAfter(smaller, at([hold(40, 2), rep], planned))).toEqual({ 0: 40 })
    // The hold's own set taken out.
    expect(holdsAfter(smaller, at([rep, rep], planned))).toEqual({})
    // A warm-up does not count.
    expect(holdsAfter(curl, at([{ w: 10, r: 10, phase: 'warmup', done: true }, rep, rep, rep]))).toBe(null)
  })

  it('reads what each work set opens as and last time’s hold, from the next session', () => {
    const S = { ...S0([day('2026-11-01', [{ w: 22, r: 10, done: true }, { w: 18, mode: 'time', sec: 50, done: true }, { w: 22, r: 9, done: true }])]),
      routines: [{ ...arms, ex: [{ ...curl, warmupSets: 1, hvHolds: { 2: 40 } }] }] }
    expect(openedHolds(nextSession(S, arms.id))).toEqual([[{ open: 0, last: 0 }, { open: 50, last: 50 }, { open: 40, last: 0 }]])
  })

  it('numbers the routine page’s work sets around a hold: 1, H, 2', () => {
    const sets = [{ kind: 'warm', n: 0, rows: [{}] }, { kind: 'work', n: 0, rows: [{ r: 8 }] }, { kind: 'work', n: 1, rows: [{ mode: 'time', sec: 40 }] }, { kind: 'work', n: 2, rows: [{ r: 8 }] }]
    expect(workNumberOf(sets, sets[1])).toBe(1)
    expect(workNumberOf(sets, sets[3])).toBe(2)
  })

  it('the routine exercise’s holds come through a sync with a later change on another device', () => {
    const base = { _ts: 1, unit: 'kg', routines: [{ ...arms, _ts: 1 }] }
    const edit = (fn, wall) => { const next = structuredClone(base); fn(next); next._ts = stampChange(base, next, wall); return next }
    const phone = edit(s => { s.routines[0].ex[0] = setHold(s.routines[0].ex[0], 1, 40) }, 100)
    const laptop = edit(s => { s.routines[0].name = 'Arms A' }, 200)
    for (const merged of [mergeStates(phone, laptop), mergeStates(laptop, phone)]) {
      expect(merged.routines[0].ex[0].hvHolds).toEqual({ 1: 40 })
      expect(merged.routines[0].name).toBe('Arms A')
    }
  })
})
