// @vitest-environment happy-dom
// The next session's plan (hevier/DECISIONS.md D128): what a routine opens with is upstream's own
// build, the plan is laid over it set by set, and nothing changes without one.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  exKeys, planSlots, setPlanned, clearPlan, plannedAt, layPlan, nextSession, planFields, lastText, stepped,
  openWithPlan, endPlans, usedBy,
} from './next-plan.js'
import { planTurn } from './next-plan-run.js'
import { fixture, PLAIN, BENCH, CALF, PLANK, BIKE, DEADLIFT, NOW, TODAY } from './routine-open.fixture.js'
import { hooks } from '../hooks.js'
import { isPlain, plainRows } from './plain-routine.js'
import { rowMode } from './hold-set.js'
import { buildCombinedEntries } from '../../lib/session-merge.js'

beforeAll(() => {
  // The fork's hooks a session's build reads (hevier/index.js install).
  hooks.plainRoutine = { is: isPlain, rows: plainRows }
  hooks.setMode = rowMode
})
afterAll(() => { Object.assign(hooks, { plainRoutine: null, setMode: null }) })

const plan = (S, ...args) => { const ok = setPlanned(S, PLAIN.id, ...args); return ok }
const ex = (S, id) => nextSession(S, PLAIN.id).find(x => x.id === id)
const opened = S => buildCombinedEntries(S, [PLAIN.id]).entries

describe('hevier: the plan field (D128)', () => {
  it('keys an exercise by its id, a second time in the routine by its count', () => {
    expect(exKeys([{ id: 'a' }, { id: 'b' }, { id: 'a' }])).toEqual(['a', 'b', 'a#2'])
  })

  it('keys warm-ups and work sets apart, an L/R pair as one set', () => {
    const rows = [{ phase: 'warmup', w: 20, r: 5 }, { w: 60, r: 8 }, { side: 'L', sec: 30 }, { side: 'R', sec: 30 }]
    expect(planSlots(rows).map(s => [s.key, s.at])).toEqual([['w0', [0]], ['0', [1]], ['1', [2, 3]]])
  })

  it('writes a number, puts one back, and clears a routine', () => {
    const S = fixture()
    expect(plan(S, BENCH, '0', null, 'w', 67.5)).toBe(true)
    expect(plan(S, CALF, '0', 'L', 'r', 12)).toBe(true)
    expect(S.hvPlan).toEqual({ [PLAIN.id]: { ex: { [BENCH]: { 0: { w: 67.5 } }, [CALF]: { 0: { L: { r: 12 } } } } } })
    expect(plannedAt(S, PLAIN.id, BENCH, '0')).toEqual({ w: 67.5 })
    plan(S, CALF, '0', 'L', 'r', null)
    expect(S.hvPlan[PLAIN.id].ex[CALF]).toBeUndefined()
    plan(S, BENCH, '0', null, 'w', null)
    expect('hvPlan' in S).toBe(false)
    plan(S, BENCH, '1', null, 'r', 9)
    clearPlan(S, PLAIN.id)
    expect('hvPlan' in S).toBe(false)
  })

  it('refuses what is not a weight or reps: negative, not finite, part reps, another field', () => {
    const S = fixture()
    for (const [f, v] of [['w', -2.5], ['w', NaN], ['w', Infinity], ['w', '60'], ['r', 8.5], ['r', -1], ['sec', 30]]) {
      expect(plan(S, BENCH, '0', null, f, v)).toBe(false)
    }
    expect(plan(S, BENCH, '0', 'X', 'r', 8)).toBe(false)
    expect('hvPlan' in S).toBe(false)
  })

  it('a changed plan is the next session’s: the running workout no longer uses it up', () => {
    const S = fixture()
    plan(S, BENCH, '0', null, 'w', 70)
    S.hvPlan[PLAIN.id].used = 'a1'
    plan(S, BENCH, '0', null, 'r', 6)
    expect(S.hvPlan[PLAIN.id].used).toBeUndefined()
  })
})

describe('hevier: what the next session opens with (D128)', () => {
  it('without a plan, is what a start builds, with last time beside each set', () => {
    const S = fixture()
    const built = opened(S)
    const session = nextSession(S, PLAIN.id)
    expect(session.map(x => x.sets.flatMap(s => s.rows))).toEqual(built.map(e => e.sets))
    const bench = session.find(x => x.id === BENCH)
    expect(bench.sets.map(s => [s.key, s.rows[0].w, s.rows[0].r])).toEqual([['w0', 42.5, 8], ['0', 65, 8], ['1', 65, 7], ['2', 65, 6]])
    expect(bench.sets.map(s => lastText(s.last[0], { cfg: bench.cfg }))).toEqual(['42.5 × 8', '65 × 8', '65 × 7', '65 × 6'])
    // Never done: the routine's own numbers, and no last time.
    const dl = session.find(x => x.id === DEADLIFT)
    expect(dl.sets.map(s => [s.rows[0].w, s.rows[0].r, s.last[0]])).toEqual([[100, 5, null], [100, 5, null]])
  })

  it('reads the same with a session open, as the start of the next one would', () => {
    const S = fixture()
    const was = nextSession(S, PLAIN.id).map(x => x.sets.map(s => s.rows))
    S.active = { id: 'a0', d: TODAY, start: NOW, routineIds: [PLAIN.id], entries: [{ id: BENCH, rid: PLAIN.id, hvBrand: 'Other', sets: [] }] }
    expect(nextSession(S, PLAIN.id).map(x => x.sets.map(s => s.rows))).toEqual(was)
  })

  it('lays a planned weight over one set; the warm-up and the other sets stay last time’s', () => {
    const S = fixture()
    plan(S, BENCH, '0', null, 'w', 67.5)
    plan(S, BENCH, '2', null, 'r', 8)
    const bench = ex(S, BENCH)
    expect(bench.sets.map(s => [s.rows[0].w, s.rows[0].r])).toEqual([[42.5, 8], [67.5, 8], [65, 7], [65, 8]])
    expect(bench.sets[1].rows[0]).toMatchObject({ weightOrigin: 'manual' })
    expect(bench.sets[1].rows[0].hvLast).toBeUndefined()
    // Reps alone leave the weight drawn as last time's.
    expect(bench.sets[3].rows[0].hvLast).toBe(1)
    expect(bench.sets[1].base[0].w).toBe(65)
    // A warm-up is planned by its own tap.
    plan(S, BENCH, 'w0', null, 'w', 45)
    expect(ex(S, BENCH).sets[0].rows[0].w).toBe(45)
  })

  it('plans each side of a per-side set on its own', () => {
    const S = fixture()
    plan(S, CALF, '1', 'R', 'r', 11)
    plan(S, CALF, '1', 'L', 'w', 22)
    const set = ex(S, CALF).sets[1]
    expect(set.rows[0].sides).toMatchObject({ L: { w: 22, r: 11 }, R: { w: 20, r: 11 } })
    expect(set.rows[0].r).toBe(22)
    expect(set.rows[0].hvLast).toBe('R')
    expect(lastText(set.last[0], { cfg: ex(S, CALF).cfg, side: 'L' })).toBe('20 × 11')
  })

  it('shows holds and cardio read-only: nothing to plan there', () => {
    const S = fixture()
    const plank = ex(S, PLANK), bike = ex(S, BIKE)
    expect(plank.sets.every(s => !s.plannable)).toBe(true)
    expect(bike.sets.every(s => !s.plannable)).toBe(true)
    const ids = planFields(nextSession(S, PLAIN.id)).map(f => f.x.id)
    expect(ids).not.toContain(PLANK)
    expect(ids).not.toContain(BIKE)
    expect(lastText(bike.sets[0].last[0], { cfg: bike.cfg, speedUnit: 'kmh' })).toMatch(/^30:00 @ 8.5/)
    // A plan stored for them anyway (another build, a backup) is not laid.
    S.hvPlan = { [PLAIN.id]: { ex: { [PLANK]: { 0: { w: 10, r: 5 } } } } }
    expect(ex(S, PLANK).sets[0].rows).toEqual(opened(fixture()).find(e => e.id === PLANK).sets.slice(0, 1))
  })

  it('lists the numbers to plan in reading order, each with what it opens with and without the plan', () => {
    const S = fixture()
    plan(S, BENCH, '0', null, 'w', 70)
    const fields = planFields(nextSession(S, PLAIN.id))
    expect(fields.slice(0, 4).map(f => [f.id, f.value, f.base, f.planned])).toEqual([
      [BENCH + '|w0||w', 42.5, 42.5, false], [BENCH + '|w0||r', 8, 8, false], [BENCH + '|0||w', 70, 65, true], [BENCH + '|0||r', 8, 8, false],
    ])
    expect(fields.filter(f => f.x.id === CALF).map(f => f.side + f.field).slice(0, 4)).toEqual(['Lw', 'Lr', 'Rw', 'Rr'])
  })

  it('steps a weight by the exercise’s step and reps by one, never below 0', () => {
    const S = fixture()
    const cfg = ex(S, BENCH).cfg
    expect(stepped(S, cfg, 'w', 65, 1)).toBe(67.5)
    expect(stepped(S, cfg, 'w', 65, -1)).toBe(62.5)
    expect(stepped(S, { ...cfg, inc: 1 }, 'w', 65, 1)).toBe(66)
    expect(stepped(S, cfg, 'r', 0, -1)).toBe(0)
    expect(stepped(S, cfg, 'r', 8, 1)).toBe(9)
  })

  it('reads a stored plan as data: what is not a number is left out', () => {
    const S = fixture()
    S.hvPlan = { [PLAIN.id]: { ex: { [BENCH]: { 0: { w: 'heavy', r: 9 }, 1: { w: -5 } } } } }
    const bench = ex(S, BENCH)
    expect([bench.sets[1].rows[0].w, bench.sets[1].rows[0].r]).toEqual([65, 9])
    expect(bench.sets[2].rows[0].w).toBe(65)
    expect(layPlan({}, opened(S))).toEqual(opened(S))
  })
})

describe('hevier: a plan is used up by the workout that opens with it (D128)', () => {
  const start = (S, id = 'a1') => {
    const { entries, routineIds } = buildCombinedEntries(S, [PLAIN.id])
    return { ...S, active: { id, d: TODAY, start: NOW, routineIds, entries } }
  }

  it('a start lays the plan and marks it as that workout’s; the page shows the same numbers', () => {
    const S = fixture()
    plan(S, BENCH, '0', null, 'w', 70)
    plan(S, CALF, '0', 'R', 'r', 10)
    const page = nextSession(S, PLAIN.id).map(x => x.sets.flatMap(s => s.rows))
    const A = start(S)
    const turn = planTurn(A, S)
    expect(turn).toEqual({ lay: [PLAIN.id], id: 'a1' })
    openWithPlan(A, turn.lay)
    expect(A.active.entries.map(e => e.sets)).toEqual(page)
    expect(usedBy(A, 'a1')).toEqual([PLAIN.id])
    // Laid once: the same session again, or synced in already laid, lays nothing.
    expect(planTurn(A, { ...A, active: null })).toBe(null)
  })

  it('saved, the plan is gone; discarded, it stays for the next session', () => {
    const S = fixture()
    plan(S, BENCH, '0', null, 'w', 70)
    const A = start(S)
    openWithPlan(A, [PLAIN.id])
    const saved = { ...A, active: null, workouts: [...A.workouts, { id: 'a1', entries: [] }] }
    expect(planTurn(saved, A)).toEqual({ ended: { id: 'a1', saved: true } })
    endPlans(saved, 'a1', true)
    expect('hvPlan' in saved).toBe(false)
    const gone = { ...A, active: null }
    expect(planTurn(gone, A)).toEqual({ ended: { id: 'a1', saved: false } })
    endPlans(gone, 'a1', false)
    expect(gone.hvPlan).toEqual({ [PLAIN.id]: { ex: { [BENCH]: { 0: { w: 70 } } } } })
  })

  it('lays nothing on an edited saved workout, a past one logged, or one with a set ticked', () => {
    const S = fixture()
    plan(S, BENCH, '0', null, 'w', 70)
    const A = start(S)
    expect(planTurn({ ...A, active: { ...A.active, editingWorkoutId: 'w1' } }, S)).toBe(null)
    expect(planTurn({ ...A, active: { ...A.active, backfill: {} } }, S)).toBe(null)
    const ticked = structuredClone(A)
    ticked.active.entries[0].sets[0].done = true
    expect(planTurn(ticked, S)).toBe(null)
    // A plan changed while its workout runs is not used up by it.
    openWithPlan(A, [PLAIN.id])
    plan(A, BENCH, '1', null, 'w', 70)
    expect(planTurn({ ...A, active: null, workouts: [{ id: 'a1' }] }, A)).toBe(null)
  })
})
