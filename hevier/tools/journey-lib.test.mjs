// node --test hevier/tools/journey-lib.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OWNER, J8_TYPED as T, checkJ8, checkJ8b, checkJ1, diffFacts, entryFacts, exportFacts, mapChanges, report, rowOf, rowPlan, routineFacts } from './journey-lib.mjs'

const G = OWNER.GROSTONAS.id
const warm = (w, r) => ({ w, r, done: true, phase: 'warmup', warmup: true })
const work = (w, r, rpe) => ({ w, r, done: true, rpe })
const sides = (w, L, R) => ({ w, r: L + R, done: true, sides: { L: { w, r: L, done: true, rpe: 9 }, R: { w, r: R, done: true, rpe: 9 } } })
const routineA = { id: OWNER.UPPER_A, name: 'TBJP Upper A', ex: [{ id: '1299', sets: 2, reps: 6, weight: 90, mode: 'reps', warmupSets: 3 }] }

// A run of J8 as the owner meant it: every rule holds.
function goodJ8() {
  const opened = [
    { id: '1299', brand: null, cable: null, side: false, sets: [{ kind: 'warmup', w: 50, r: 6 }, { kind: 'warmup', w: 70, r: 4 }, { kind: 'work', w: 90, r: 6 }, { kind: 'work', w: 60, r: 11 }] },
  ]
  const before = { routine: routineFacts(routineA), hvMachines: { 1299: { [G]: 'LifeFitness' }, '0587': { [G]: 'LifeFitness' } }, hvCables: { '0150': { [G]: 'x2' } } }
  const w = {
    id: 'w1', start: 2000, name: 'TBJP Upper A', routineId: OWNER.UPPER_A, gym: { id: G }, note: T.NOTE, prs: ['1299'],
    entries: [
      { id: '1299', hvBrand: 'LifeFitness', sets: [warm(50, 6), warm(70, 4), work(92.5, 6, 9.5), work(60, 11, 9)] },
      { id: '0587', hvBrand: 'Evolve', sets: [warm(50, 4), work(72.6, 5, 9)] },
      { id: '0150', hvBrand: 'LifeFitness', hvCable: 'x2', sets: [work(55, 6, 9)] },
      { id: '0592', hvBrand: 'LifeFitness', sets: [sides(26.25, 10, 8)] },
      { id: '0362', sets: [sides(10, 11, 9)] },
    ],
  }
  const S = {
    workouts: [w], routines: [routineA], queue: { ids: [OWNER.UPPER_A, OWNER.LOWER_A, 'ub'] }, exWeights: { 1299: { w: 92.5 } },
    hvMachines: { 1299: { [G]: 'LifeFitness' }, '0587': { [G]: 'Evolve' } }, hvCables: { '0150': { [G]: 'x2' } },
  }
  const draft = {
    title: 'TBJP Upper A', description: T.NOTE + '\nAt Lemon Gym',
    exercises: [
      { ex: '1299', template: 'FBF92739', notes: 'LifeFitness', sets: [{ type: 'warmup', weight_kg: 50, reps: 6 }, { type: 'normal', weight_kg: 92.5, reps: 6, rpe: 9.5 }] },
      { ex: '0587', notes: 'Evolve', sets: [] },
      { ex: '0150', notes: 'LifeFitness · cable ×2', sets: [] },
      { ex: '0592', notes: 'One arm\nLifeFitness\nSet 1: L 26.25 kg × 10, R 26.25 kg × 8', sets: [] },
      { ex: '0362', notes: 'Set 1: L 10 kg × 11, R 10 kg × 9', sets: [] },
    ],
  }
  return {
    S, since: 1000, before, draft, best: { w: 92.5, r: 6 },
    opened: { entries: opened, warmupsAfterTyping: [[50, 6], [70, 4]] },
    ui: { saved: true, prevBefore: '70 × 4', prevAfter: '70 × 7', next: 'TBJP Upper B', nextExpected: 'TBJP Upper B' },
  }
}

test('J8 passes when the saved Upper A keeps every rule the owner set', () => {
  const { problems, facts } = checkJ8(goodJ8())
  assert.deepEqual(problems, [])
  assert.deepEqual(facts.machines, [`0587.${G}: LifeFitness → Evolve`])
})

test('J8 fails, saying what and where, on the regressions it exists for', () => {
  const run = goodJ8()
  run.opened.warmupsAfterTyping = [[52.5, 6], [72.5, 4]]                 // the 11-14 re-aim
  run.S.workouts[0].entries[0].sets[0].rpe = 8                           // effort on a warm-up
  run.S.workouts[0].entries[2].hvCable = '2:1'                           // the cable lost its setup
  run.S.workouts[0].entries[3].sets[0].sides.R.r = 10                    // the uneven side evened out
  run.S.routines = [{ ...routineA, ex: [{ ...routineA.ex[0], weight: 92.5 }] }]   // the routine took the session
  run.draft.exercises[0].template = 'f7d6da6c'                           // D138: the custom template again
  run.ui.next = 'TBJP Upper A'
  run.S.queue.ids = ['ub', 'lb', OWNER.UPPER_A]                          // the redo did not restart the pass
  const { problems } = checkJ8(run)
  const has = part => assert.ok(problems.some(p => p.includes(part)), `a problem naming "${part}" in:\n${problems.join('\n')}`)
  has("1299's warm-ups moved when the top set was retyped: [[50,6],[70,4]] → [[52.5,6],[72.5,4]]")
  has('a 1299 warm-up was saved with an effort rating')
  has('0150 saved with cable 2:1, not ×2')
  has('0592 saved L 10 / R 10, typed L 10 / R 8')
  has('the Upper A routine changed')
  has('1299 exports as template f7d6da6c')
  has('Today still names TBJP Upper A next')
  has("the rotation's pass did not start over from Upper A")
})

test('J8 says so when nothing was saved, and --hr asks every ticked set for a heart rate', () => {
  const run = goodJ8()
  run.since = 5000
  assert.deepEqual(checkJ8(run).problems, ['J8: no Upper A saved by this run'])
  const hr = goodJ8()
  hr.hr = true
  assert.ok(checkJ8(hr).problems.some(p => p.includes('--hr, but the workout has no average heart rate')))
})

test('J8b keeps the holds as opened and fails on a prompt that blocked a tick', () => {
  const S = OWNER.SAHAROVA.id
  const hold = side => ({ side, mode: 'time', w: 24, sec: 75, done: true })
  const routine = { id: OWNER.LOWER_A, name: 'TBJP Lower A', ex: [{ id: '1178', sets: 3, side: true }] }
  const run = {
    since: 0, ui: { saved: true }, prompts: [],
    before: { routine: routineFacts(routine), hvMachines: {} },
    opened: { entries: [{ id: '1178', sets: [{ kind: 'warmup' }, { kind: 'work', mode: 'time', side: 'L', sec: 75, w: 24 }, { kind: 'work', mode: 'time', side: 'R', sec: 75, w: 24 }, { kind: 'work' }] }] },
    S: { routines: [routine], hvMachines: {}, workouts: [{ start: 1, routineId: OWNER.LOWER_A, gym: { id: S }, entries: [
      { id: '1178', hvBrand: 'Achilles Rehab', sets: [warm(0, 20), hold('L'), hold('R'), sides(24, 12, 12)] },
    ] }] },
    draft: { exercises: [{ ex: '1178', notes: 'Achilles Rehab\nSet 1: hold 75 s L, 75 s R at 24 kg', sets: [{ type: 'normal', reps: 12 }] }] },
  }
  assert.deepEqual(checkJ8b(run).problems, [])
  run.prompts = ['Reps: 0 is under a third']
  run.S.workouts[0].entries[0].sets[2] = { ...hold('R'), sec: 45 }
  const { problems } = checkJ8b(run)
  assert.ok(problems.includes('J8b: a prompt came up on a tick: Reps: 0 is under a third'))
  assert.ok(problems.some(p => p.startsWith("J8b: 1178's holds saved as")))
})

test('J1 keeps only its rules in the facts, so the date it runs on does not matter', () => {
  const routine = { id: 'r', name: 'Push Day', ex: [{ id: 'a', sets: 2 }, { id: 'b', sets: 2 }] }
  const run = {
    since: 0, started: 'Push Day', routine: routineFacts(routine),
    opened: [{ sets: [{ w: 60, r: 8 }, { w: 60, r: 8 }] }, { sets: [] }],
    prefilled: { idx: 0, set: 0 }, typed: { idx: 0, set: 1, w: 62.5 },
    rest: { before: 85, after: 145, skipped: true }, swap: { idx: 1, from: 'b', to: 'c' },
    ui: { saved: true, inHistory: true, detailShowsWeight: true },
    S: { routines: [routine], workouts: [{ start: 1, name: 'Push Day', entries: [{ id: 'a', sets: [{ w: 60, r: 8 }, { w: 62.5, r: 8 }] }, { id: 'c', sets: [] }] }] },
  }
  const ok = checkJ1(run)
  assert.deepEqual(ok.problems, [])
  assert.ok(Object.values(ok.facts.checks).every(v => v === true))
  run.rest.after = 90
  assert.deepEqual(checkJ1(run).problems, ['J1: +1 min took the rest from 85 s to 90 s'])
})

test('a card\'s rows map to sets: a per-side set is two rows, a hold pair is one row each', () => {
  const sets = [{ sides: {} }, { side: 'L', mode: 'time' }, { side: 'R', mode: 'time' }, { sides: {} }, { w: 1 }]
  const plan = rowPlan(sets, ['R', 'L', 'L', 'R', 'L', 'R', null])
  assert.equal(rowOf(plan, 0, 'L'), 1)
  assert.equal(rowOf(plan, 2), 3)
  assert.equal(rowOf(plan, 3, 'R'), 5)
  assert.equal(rowOf(plan, 4), 6)
  assert.equal(rowOf(plan, 9), null)
})

test('facts drop the clock and ids; a diff and a map change read as before → after', () => {
  const e = { id: '1299', hvBrand: 'LifeFitness', target: {}, sets: [{ w: 92.5, r: 6, done: true, at: 123, hr: { avg: 120 }, rpe: 9.5 }] }
  assert.deepEqual(entryFacts(e), { id: '1299', brand: 'LifeFitness', cable: null, side: false, sets: [{ kind: 'work', w: 92.5, r: 6, rpe: 9.5, done: true }] })
  assert.deepEqual(exportFacts({ title: 'A', description: null, exercises: [{ ex: '1', notes: 'x', sets: [{ type: 'normal', reps: 5, completed_at: 'z', duration_seconds: null }] }] }).exercises[0].sets, [{ type: 'normal', reps: 5 }])
  assert.equal(exportFacts({ description: 'Hi\nHeart rate 105 avg, 136 max\nAt Lemon Gym', exercises: [{ notes: 'Evolve\nTime 13 min\nSet 1: L 5 kg × 3, R 5 kg × 2\nHR 94, 88' , sets: [] }] }).exercises[0].notes, 'Evolve\nSet 1: L 5 kg × 3, R 5 kg × 2')
  assert.deepEqual(mapChanges({ a: { g: 'X' } }, { a: { g: 'Y', h: 'Z' } }), ['a.g: X → Y', 'a.h: – → Z'])
  assert.deepEqual(diffFacts({ s: [{ w: 90 }] }, { s: [{ w: 92.5 }] }), ['s.0.w: 90 → 92.5'])
  const r = report('J8', { problems: ['J8: x'], facts: { a: 2 } }, { a: 1 })
  assert.equal(r.code, 1)
  assert.equal(r.text, 'J8: 1 failed check, 1 difference from the baseline\n  FAIL J8: x\n  DIFF a: 1 → 2')
  assert.deepEqual(report('J1', { problems: [], facts: { a: 1 } }, { a: 1 }), { code: 0, text: 'J1: every check passed, no difference from the baseline' })
})
