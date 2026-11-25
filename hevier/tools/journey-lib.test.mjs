// node --test hevier/tools/journey-lib.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OWNER, UX, J8_TYPED as T, checkJ8, checkJ8b, checkJ1, checkJ2, checkJ3, checkJ4, checkJ5, checkJ6, checkJ7, snapOf, diffFacts, entryFacts, exportFacts, mapChanges, report, rowOf, rowPlan, routineFacts } from './journey-lib.mjs'

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

// The test profile, cut down: two gyms with the leg press's brands (JOURNEYS.md, "Set up on 2026-10-25").
const uxS = () => ({
  workouts: [{ start: 1, entries: [{ id: UX.LEG_PRESS, hvBrand: 'Life Fitness' }] }], routines: [{ id: 'r1', name: UX.ROUTINE, ex: [{ id: UX.LEG_PRESS, sets: 3 }] }],
  equipProfiles: [{ id: 'g1', name: 'Holmes Place' }, { id: 'g2', name: 'Weekend Gym' }],
  hvMachines: { [UX.LEG_PRESS]: { g1: 'Life Fitness', g2: 'Hammer' } }, hvCables: { [UX.CABLE]: { g1: 'x2' } },
  week: { 1: ['r1'] }, dayPlan: {}, rotation: { sequence: ['r1'] },
})

test('snapOf keys the per-gym maps by gym name and hashes the log', () => {
  const s = snapOf(uxS())
  assert.deepEqual(s.machines, { [UX.LEG_PRESS]: { 'Holmes Place': 'Life Fitness', 'Weekend Gym': 'Hammer' } })
  assert.equal(s.nWorkouts, 1)
  assert.notEqual(s.workouts, snapOf({ ...uxS(), workouts: [] }).workouts)
})

test('J2 passes when nothing was imported and the routine is as before, and says which set count went wrong', () => {
  const S = uxS()
  const r = routineFacts(S.routines[0])
  const run = {
    before: snapOf(S), after: snapOf(S),
    routine: { name: UX.ROUTINE, before: r, after: r, sets: { before: 3, added: 4, removed: 3 } },
    ui: { importShown: true, liftFound: true, liftOpened: true, labels: true, routinePage: true, editor: true },
  }
  assert.deepEqual(checkJ2(run).problems, [])
  run.routine.sets.removed = 4
  run.routine.after = { ...r, ex: [{ ...r.ex[0], sets: 4 }] }
  run.after = snapOf({ ...S, workouts: [] })
  const { problems } = checkJ2(run)
  assert.ok(problems.includes('J2: S.workouts changed (1 → 0 workouts): something was imported or edited'))
  assert.ok(problems.includes('J2: step 3: removing the added set left 4 sets, not 3'))
  assert.ok(problems.some(p => p.startsWith('J2: Leg Day is not as before') && p.includes('ex.0.sets: 3 → 4')))
})

test('J3 keeps the brand picked at that gym only, and fails on a saved workout or a lost ×2', () => {
  const S = uxS()
  const after = { ...S, hvMachines: { [UX.LEG_PRESS]: { g1: 'Life Fitness', g2: 'Life Fitness' } }, hvCables: { [UX.CABLE]: { g1: 'x2', g2: 'x2' } } }
  const run = {
    before: snapOf(S), after: snapOf(after), gym: 'Weekend Gym', other: 'Holmes Place',
    ui: { brandShown: 'Hammer', picked: 'Life Fitness', prevBefore: '120 × 10', prevAfter: '140 × 8', logged: { before: false, after: true },
      header: 'KG ×2', hidden: '12 hidden at Weekend Gym', discardAsked: 'Discard workout?' },
  }
  assert.deepEqual(checkJ3(run).problems, [])
  run.after = snapOf({ ...after, active: { entries: [] }, hvCables: {} })
  run.ui.prevAfter = '120 × 10'
  const { problems } = checkJ3(run)
  assert.ok(problems.some(p => p.startsWith('J3: the workout was saved or left open')))
  assert.ok(problems.includes('J3: step 3: S.hvCables has none for 1323 at Weekend Gym, not ×2'))
  assert.ok(problems.includes('J3: step 2: PREVIOUS stayed "120 × 10" when the brand went to Life Fitness'))
})

test('J4 wants right first saved, the hold kept, 12:34 and the time since ▶ after Home', () => {
  const S = uxS()
  const good = () => ({
    before: snapOf(S), after: snapOf({ ...S, hvSideOrder: { [UX.ONE_LEG]: 'RL' } }),
    ui: { perSide: true, firstSide: 'R', ticked: { R: true, L: true }, plank: { afterStop: 3, afterTick: 3, done: true },
      bike: { shown: '12:34', min: 754 / 60 }, away: { shown: 22, expected: 22 }, discardAsked: 'Discard workout?' },
  })
  assert.deepEqual(checkJ4(good()).problems, [])
  const run = good()
  run.ui.bike.shown = '0:12:34'
  run.ui.away.shown = 1   // the timer started over when the app came back
  run.after = snapOf(S)
  const { problems } = checkJ4(run)
  assert.ok(problems.includes('J4: step 1: S.hvSideOrder has nothing for 0733, not RL'))
  assert.ok(problems.includes('J4: step 3: 1234 on the number pad reads "0:12:34", not 12:34'))
  assert.ok(problems.includes('J4: step 4: after 20 s away the set timer showed 1 s, 22 s since ▶'))
})

test('J5 is read only and ends on the default layout; a layout left changed fails', () => {
  const S = uxS()
  const def = { tiles: { order: ['a'], hidden: [] }, cards: { order: ['w'], hidden: [] } }
  const run = {
    before: snapOf(S), after: snapOf({ ...S, hvStatsLayout: def }), layoutDefault: def, pins: { workouts: 1 },
    ui: { chart: { reps: 'Weekly reps', week: 'Week of 3 Nov: 120 reps', setsSheet: true }, arrange: { hidden: true, moved: true, reset: true },
      report: { opened: true }, lift: { opened: true, last: true, reps: 5, chart: true, all: 12 }, detail: { opened: true, trends: 4, named: 4 },
      calendar: { before: 6, after: 12, planned: null } },
  }
  assert.deepEqual(checkJ5(run).problems, [])
  run.after = snapOf({ ...S, hvStatsLayout: { ...def, cards: { order: ['w'], hidden: ['w'] } }, hvStrength: { [UX.LEG_PRESS]: 'x' } })
  run.ui.detail.named = 3
  const { problems } = checkJ5(run)
  assert.ok(problems.includes('J5: S.hvStrength changed: were strength levels saved?'))
  assert.ok(problems.some(p => p.startsWith('J5: after Reset S.hvStatsLayout is')))
  assert.ok(problems.includes('J5: step 5: 1 of 4 ↑ = ↓ marks have no name (D66)'))
})

test('J6 leaves the plan, routines, folders and gym marks as they were; a leftover mark fails', () => {
  const S = uxS()
  const run = {
    before: snapOf(S), after: snapOf(S),
    mid: { ex: [...UX.NEW_ROUTINE].sort(), linked: true, warmups: 1, orderBefore: UX.NEW_ROUTINE, orderAfter: ['0612', '0274', '0499'], backup: UX.BACKUP, missingMarked: true, missingCleared: true },
    ui: { day: '1', dayChanged: true, folderMade: true, toasts: ['“Journey routine” gone.'] },
  }
  assert.deepEqual(checkJ6(run).problems, [])
  run.after = snapOf({ ...S, hvGymMissing: { [UX.BACKUP]: ['g1'] }, week: { 1: ['r1', 'r2'] } })
  run.mid.missingCleared = false
  const { problems } = checkJ6(run)
  assert.ok(problems.includes('J6: S.hvGymMissing is not as before: {} → {"0001":["Holmes Place"]}'))
  assert.ok(problems.includes('J6: S.week is not as before: {"1":["r1"]} → {"1":["r1","r2"]}'))
  assert.ok(problems.includes('J6: step 3: a second tap on the chip did not take the mark back'))
})

test('J7 is J1 at font_scale 2.0, named controls, and the scale back at 1.0', () => {
  const routine = { id: 'r', name: 'Push Day', ex: [{ id: 'a', sets: 2 }] }
  const named = name => ({ role: 'button', name })
  const run = {
    since: 0, started: 'Push Day', routine: routineFacts(routine),
    opened: [{ sets: [{ w: 60, r: 8 }, { w: 60, r: 8 }] }], prefilled: { idx: 0, set: 0 }, typed: { idx: 0, set: 1, w: 62.5 },
    rest: { before: 85, after: 145, skipped: true }, swap: null, ui: { saved: true, inHistory: true, detailShowsWeight: true },
    S: { routines: [routine], workouts: [{ start: 1, name: 'Push Day', entries: [{ id: 'a', sets: [{ w: 60, r: 8 }, { w: 62.5, r: 8 }] }] }] },
    font: { during: '2.0', after: '1.0' },
    ax: { fields: [{ role: 'textbox', name: 'Set 2, Weight (kg)' }], setType: named('Set 2, Set type'), tick: named('Set 2 done'), rest: [named('+1 min'), named('Skip')] },
  }
  assert.deepEqual(checkJ7(run).problems, [])
  run.font.after = '2.0'
  run.ax.tick = { role: 'checkbox', name: '' }
  run.rest.skipped = false
  assert.deepEqual(checkJ7(run).problems, [
    'J7: Skip left the rest running',
    'J7: font_scale is 2.0 afterwards, not 1.0',
    'J7: the tick has no name: {"role":"checkbox","name":""}',
  ])
})
