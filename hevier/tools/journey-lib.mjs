// The pure half of journey-check.mjs: what each scripted journey (hevier/ux/JOURNEYS.md, "Check")
// must leave behind, read from the app's saved state, and the comparison with the accepted
// baseline. journey-lib.test.mjs runs it without the emulator.
//
// A journey's run gives two things. `problems`: the rules the journey states, checked on every run
// whatever the baseline says (a top set saved at the weight typed, warm-ups not re-aimed, the
// routine left alone...). `facts`: what the saved data looks like, compared with the baseline, so a
// merge that changes what a session opens with or saves shows as a difference. Each journey's facts
// hold nothing that moves with the date or the clock: no ids, timestamps or heart rates, and J1,
// whose routine is the one Today plans, keeps only its rules' outcomes.

import { createHash } from 'node:crypto'

// The owner's profile (~/.cache/hevier/owner-profile.tar, from the 2026-11-18 backup).
export const OWNER = {
  UPPER_A: 'mvdp0joqy9lf7', LOWER_A: 'mvdp0joqq1vn3',
  GROSTONAS: { id: 'eqmvgpzvq1b00r', name: 'Lemon Gym · Grostonas iela 1' },
  SAHAROVA: { id: 'eqmvnule78vk2o', name: 'Lemon Gym · Andreja Saharova iela 30' },
}
// What J8 and J8b type (JOURNEYS.md): kg as typed, RPE on working sets only.
export const J8_TYPED = {
  TOP_STEP: 2.5, TOP_RPE: 9.5, BACK_RPE: 9, PRESS_BRAND: 'Evolve', PRESS_KG: 72.6, NOTE: 'Journey check',
  CURL: { L: 10, R: 8 }, TRICEPS: { L: 11, R: 9 },
}
export const SCRIPTED = ['J1', 'J2', 'J3', 'J4', 'J5', 'J6', 'J7', 'J8', 'J8b']
export const PROFILE_OF = { J1: 'ux', J2: 'ux', J3: 'ux', J4: 'ux', J5: 'ux', J6: 'ux', J7: 'ux', J8: 'owner', J8b: 'owner' }
// What J3, J4 and J6 add (catalogue ids): the test profile's leg press and cable (JOURNEYS.md, "Set up on
// 2026-10-25"), a one-limb, a timed and a cardio exercise, and three plain ones for a new routine.
export const UX = {
  LEG_PRESS: '0739', CABLE: '1323', ONE_LEG: '0733', PLANK: '0463', BIKE: '0798',
  NEW_ROUTINE: ['0274', '0499', '0612'], BACKUP: '0001', ROUTINE: 'Leg Day',
  FOLDER: 'Journey folder', ROUTINE_NAME: 'Journey routine', BIKE_DIGITS: '1234', BIKE_SHOWN: '12:34', BIKE_SEC: 754,
}

const num = v => (v == null || v === '' ? null : Number(v))
const round = v => (v == null ? null : Math.round(Number(v) * 1000) / 1000)
export const isWarm = s => s?.phase === 'warmup' || s?.warmup === true
const isHold = s => s?.mode === 'time' && s?.sec != null

/** One set as the facts keep it: what was logged, none of the timing. */
export function setFacts(s) {
  const out = { kind: isWarm(s) ? 'warmup' : 'work', w: round(s.w), r: num(s.r) }
  if (s.mode) out.mode = s.mode
  if (s.sec != null) out.sec = num(s.sec)
  if (s.side) out.side = s.side
  if (s.rpe != null) out.rpe = num(s.rpe)
  if (s.rir != null) out.rir = num(s.rir)
  if (s.done != null) out.done = !!s.done
  if (s.sides) {
    out.sides = {}
    for (const k of ['L', 'R']) {
      const d = s.sides[k]
      if (!d) continue
      out.sides[k] = { w: round(d.w), r: num(d.r), done: !!d.done, ...(d.rpe != null ? { rpe: num(d.rpe) } : {}), ...(d.rir != null ? { rir: num(d.rir) } : {}) }
    }
  }
  return out
}

/** A session's or a saved workout's exercise: id, brand, cable, gym tag and sets. */
export const entryFacts = e => ({
  id: e.id, brand: e.hvBrand ?? null, cable: e.hvCable ?? null, side: e.target?.side === true,
  sets: (e.sets || []).map(setFacts),
})

/** A routine as its editor holds it: what a Finish without "Update the routine too" must not touch. */
export const routineFacts = r => (r ? {
  name: r.name, ex: (r.ex || []).map(c => ({
    id: c.id, sets: c.sets ?? null, reps: c.reps ?? null, weight: c.weight ?? null, mode: c.mode ?? null,
    warmupSets: c.warmupSets ?? null, side: c.side === true, warmupRows: c.warmupRows ?? null,
  })),
} : null)

// The note lines that follow the clock and the strap, not what was logged.
const timed = l => !/^(Time \d+ min|HR [\d, ]+|Heart rate \d+ avg(, \d+ max)?)$/.test(l)
const steady = text => (text == null ? null : text.split('\n').filter(timed).join('\n'))

/** A Hevy export draft (hevy-export.js workoutDraft) without its times and heart rates. */
export const exportFacts = d => (d ? {
  title: d.title, description: steady(d.description),
  exercises: d.exercises.map(e => ({
    ex: e.ex, brand: e.brand ?? null, cable: e.cable ?? null, side: !!e.side, notes: steady(e.notes),
    template: e.template ?? null,
    sets: e.sets.map(s => Object.fromEntries(Object.entries(s).filter(([k, v]) => k !== 'completed_at' && v != null))),
  })),
} : null)

/** The rows a card draws, in order (`seen`: each `.hv-row`'s side, 'L', 'R' or null), as set index and side. */
export function rowPlan(sets, seen) {
  const out = []
  let k = 0
  sets.forEach((s, i) => {
    if (s?.sides && seen[k] && seen[k + 1] && seen[k] !== seen[k + 1]) {
      out.push({ set: i, side: seen[k], row: k }, { set: i, side: seen[k + 1], row: k + 1 })
      k += 2
    } else {
      out.push({ set: i, side: null, row: k })
      k += 1
    }
  })
  return out
}
export const rowOf = (plan, set, side = null) => plan.find(p => p.set === set && p.side === side)?.row ?? null

/** Two key → value maps (S.hvMachines, S.hvCables) as "key.gym: before → after" lines. */
export function mapChanges(before = {}, after = {}) {
  const out = []
  const keys = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])].sort()
  for (const k of keys) {
    const a = before?.[k] || {}, b = after?.[k] || {}
    for (const g of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
      if (a[g] !== b[g]) out.push(`${k}.${g}: ${a[g] ?? '–'} → ${b[g] ?? '–'}`)
    }
  }
  return out
}

/** Differences between two fact trees, one line per value: "path: before → after". */
export function diffFacts(a, b, path = '') {
  const show = v => (v === undefined ? '–' : JSON.stringify(v))
  if (a === b) return []
  const obj = v => v && typeof v === 'object'
  if (!obj(a) || !obj(b) || Array.isArray(a) !== Array.isArray(b)) return [`${path || '(root)'}: ${show(a)} → ${show(b)}`]
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])]
  return keys.flatMap(k => diffFacts(a[k], b[k], path ? path + '.' + k : k))
}

// A check: pushes a problem line when `ok` is false.
const checker = () => {
  const problems = []
  const want = (ok, line) => { if (!ok) problems.push(line); return !!ok }
  return { problems, want }
}
const eqJ = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const lastOf = (S, routineId) => (S.workouts || []).filter(w => w.routineId === routineId).at(-1) || null
const entryOf = (w, id) => (w?.entries || []).find(e => e.id === id) || null
const workIdx = e => (e?.sets || []).map((s, i) => (isWarm(s) ? -1 : i)).filter(i => i >= 0)
const noEffort = s => s.rpe == null && s.rir == null

/**
 * J8, the owner's Upper A. `run`: { S, before: { routine, hvMachines, hvCables, exWeights }, opened:
 * { entries (as opened, entryFacts), warmupsAfterTyping }, ui: { prevBefore, prevAfter, saved, next,
 * nextExpected }, draft (exportFacts), best (bestSetOf of 1299's saved entry), hr (on/off), count }.
 */
export function checkJ8(run) {
  const { problems, want } = checker()
  const { S, before, opened, ui, draft } = run
  const T = J8_TYPED
  const w = lastOf(S, OWNER.UPPER_A)
  if (!want(w && w.start > (run.since || 0), 'J8: no Upper A saved by this run')) return { problems, facts: null }
  want(w.name === 'TBJP Upper A', `J8: the workout is called "${w.name}", not "TBJP Upper A"`)
  want(w.gym?.id === OWNER.GROSTONAS.id, `J8: the workout's gym is ${w.gym?.name ?? 'none'}, not ${OWNER.GROSTONAS.name}`)
  want(ui.saved, 'J8: Finish did not say "Workout saved"')
  const op = id => opened.entries.find(e => e.id === id)

  // Warm-ups as opened, the top set as typed, RPE on working sets only (S.hvWarmupEffort false).
  const press = entryOf(w, '1299'), o1299 = op('1299')
  const top = o1299 ? o1299.sets.findIndex(s => s.kind === 'work') : -1
  const topW = o1299 ? round(o1299.sets[top].w + T.TOP_STEP) : null
  if (want(press && o1299, 'J8: lever incline chest press (1299) missing from the session or the saved workout')) {
    const warmOpened = o1299.sets.filter(s => s.kind === 'warmup').map(s => [s.w, s.r])
    want(warmOpened.length > 0, 'J8: 1299 opened without warm-ups')
    want(eqJ(opened.warmupsAfterTyping, warmOpened), `J8: 1299's warm-ups moved when the top set was retyped: ${JSON.stringify(warmOpened)} → ${JSON.stringify(opened.warmupsAfterTyping)}`)
    const saved = press.sets.map(setFacts)
    want(eqJ(saved.filter(s => s.kind === 'warmup').map(s => [s.w, s.r]), warmOpened), `J8: 1299's warm-ups saved as ${JSON.stringify(saved.filter(s => s.kind === 'warmup').map(s => [s.w, s.r]))}, opened as ${JSON.stringify(warmOpened)}`)
    want(press.sets.filter(isWarm).every(noEffort), 'J8: a 1299 warm-up was saved with an effort rating')
    const [t, b] = workIdx(press)
    want(round(press.sets[t]?.w) === topW, `J8: 1299's top set saved at ${press.sets[t]?.w} kg, typed ${topW}`)
    want(num(press.sets[t]?.rpe) === T.TOP_RPE, `J8: 1299's top set saved with RPE ${press.sets[t]?.rpe ?? 'none'}, picked ${T.TOP_RPE}`)
    want(num(press.sets[b]?.rpe) === T.BACK_RPE, `J8: 1299's back-off set saved with RPE ${press.sets[b]?.rpe ?? 'none'}, picked ${T.BACK_RPE}`)
    want(run.best && round(run.best.w) === topW, `J8: 1299's estimated 1RM comes from ${run.best ? run.best.w + ' × ' + run.best.r : 'no set'}, not the top set (${topW} kg)`)
    want(round(S.exWeights?.['1299']?.w) === topW, `J8: 1299's best weight (S.exWeights) is ${S.exWeights?.['1299']?.w}, not the top set's ${topW}`)
  }

  // Brands and cable setups follow the gym; the brand changed where it shows sticks for this gym.
  const brandOf = id => entryOf(w, id)?.hvBrand ?? null
  want(brandOf('1299') === 'LifeFitness', `J8: 1299 saved with brand ${brandOf('1299') ?? 'none'}, not LifeFitness`)
  want(brandOf('0150') === 'LifeFitness', `J8: 0150 saved with brand ${brandOf('0150') ?? 'none'}, not LifeFitness`)
  want(entryOf(w, '0150')?.hvCable === 'x2', `J8: 0150 saved with cable ${entryOf(w, '0150')?.hvCable ?? 'none'}, not ×2`)
  want(brandOf('0587') === T.PRESS_BRAND, `J8: military press (0587) saved with brand ${brandOf('0587') ?? 'none'}, picked ${T.PRESS_BRAND}`)
  const mil = entryOf(w, '0587')
  want(mil && round(mil.sets[workIdx(mil)[0]]?.w) === T.PRESS_KG, `J8: 0587's top set saved at ${mil?.sets[workIdx(mil)[0]]?.w} kg, typed ${T.PRESS_KG} (kg as typed)`)
  want(ui.prevBefore && ui.prevAfter && ui.prevBefore !== ui.prevAfter, `J8: 0587's PREVIOUS did not follow the brand ("${ui.prevBefore}" → "${ui.prevAfter}")`)
  const machines = mapChanges(before.hvMachines, S.hvMachines)
  const expected = [`0587.${OWNER.GROSTONAS.id}: LifeFitness → ${T.PRESS_BRAND}`]
  want(eqJ(machines, expected), `J8: S.hvMachines changed by ${JSON.stringify(machines)}, expected only ${JSON.stringify(expected)}`)
  const cables = mapChanges(before.hvCables, S.hvCables)
  want(!cables.length, `J8: S.hvCables changed: ${cables.join('; ')}`)

  // Per side with uneven reps, the same weight both sides.
  for (const [id, reps] of [['0592', T.CURL], ['0362', T.TRICEPS]]) {
    const e = entryOf(w, id)
    const s = e?.sets.find(x => x.sides && x.sides.L?.done && x.sides.R?.done)
    if (!want(s, `J8: ${id} has no per-side set ticked on both sides`)) continue
    want(num(s.sides.L.r) === reps.L && num(s.sides.R.r) === reps.R, `J8: ${id} saved L ${s.sides.L.r} / R ${s.sides.R.r}, typed L ${reps.L} / R ${reps.R}`)
    want(round(s.sides.L.w) === round(s.sides.R.w), `J8: ${id} saved L ${s.sides.L.w} kg and R ${s.sides.R.w} kg, logged at one weight`)
  }

  // The routine is left alone after a Finish without the tick.
  want(eqJ(routineFacts(S.routines.find(r => r.id === OWNER.UPPER_A)), before.routine), 'J8: the Upper A routine changed after a Finish without "Update the routine too"')
  want((w.note || '') === T.NOTE, `J8: the workout note saved as "${w.note || ''}", typed "${T.NOTE}"`)

  // The rotation moves on (D124): redoing Upper A starts the pass over from it, so Lower A is the
  // rotation's next; Today names what the calendar and the rotation have next, never Upper A again.
  const pass = S.queue?.ids || []
  want(pass[0] === OWNER.UPPER_A && pass[1] === OWNER.LOWER_A, `J8: the rotation's pass did not start over from Upper A (D124): ${JSON.stringify(pass.slice(0, 2))}`)
  want(ui.next && ui.next !== 'TBJP Upper A', `J8: Today still names ${ui.next ?? 'nothing'} next after Upper A was done`)
  want(ui.next === ui.nextExpected, `J8: Today names "${ui.next}" next, the plan says "${ui.nextExpected}"`)

  // The Hevy export, built here and never sent.
  if (want(draft, 'J8: the workout gives no Hevy export draft')) {
    const ex = id => draft.exercises.find(e => e.ex === id)
    const first = id => (ex(id)?.notes || '').split('\n')[0]
    want(first('1299') === 'LifeFitness', `J8: export note for 1299 starts "${first('1299')}", not "LifeFitness"`)
    want(ex('1299')?.template === 'FBF92739', `J8: 1299 exports as template ${ex('1299')?.template}, not Incline Chest Press (Machine) FBF92739 (D138)`)
    want(first('0150') === 'LifeFitness · cable ×2', `J8: export note for 0150 starts "${first('0150')}", not "LifeFitness · cable ×2"`)
    want(first('0587') === T.PRESS_BRAND, `J8: export note for 0587 starts "${first('0587')}", not "${T.PRESS_BRAND}"`)
    const pressSets = ex('1299')?.sets || []
    want(pressSets.filter(s => s.type === 'warmup').every(s => s.rpe == null), 'J8: a warm-up exports with an RPE')
    want(pressSets.some(s => s.type === 'normal' && s.rpe === T.TOP_RPE && s.weight_kg === topW), `J8: 1299's top set does not export as ${topW} kg at RPE ${T.TOP_RPE}`)
    for (const [id, reps] of [['0592', T.CURL], ['0362', T.TRICEPS]]) {
      want(new RegExp(`^Set 1: L [\\d.]+ kg × ${reps.L}, R [\\d.]+ kg × ${reps.R}$`, 'm').test(ex(id)?.notes || ''), `J8: export note for ${id} has no "Set 1: L … × ${reps.L}, R … × ${reps.R}" line: ${JSON.stringify(ex(id)?.notes)}`)
    }
    want(draft.description?.split('\n')[0] === T.NOTE, `J8: export description starts ${JSON.stringify(draft.description?.split('\n')[0])}, not the note`)
    want(/^At Lemon Gym$/m.test(draft.description || ''), `J8: export description has no "At Lemon Gym" line: ${JSON.stringify(draft.description)}`)
  }
  hrChecks(run, w, want, 'J8')

  const facts = {
    gym: w.gym?.id ?? null, name: w.name, note: w.note ?? null,
    opened: opened.entries, warmupsAfterTyping: opened.warmupsAfterTyping,
    saved: w.entries.map(entryFacts), prs: [...(w.prs || [])].sort(),
    best1299: run.best ? { w: round(run.best.w), r: run.best.r } : null,
    machines, cables, routine: routineFacts(S.routines.find(r => r.id === OWNER.UPPER_A)), pass,
    previous0587: { before: ui.prevBefore, after: ui.prevAfter },
    export: draft,
  }
  return { problems, facts }
}

/**
 * J8b, the owner's rehab on Lower A: the calf raise (1178) at Saharova, its two 75 s holds (left,
 * then right) at a set weight, then a per-side rep set. `run`: as checkJ8's, plus `prompts`, the
 * confirm sheets that came up on a tick.
 */
export function checkJ8b(run) {
  const { problems, want } = checker()
  const { S, before, opened, ui, draft } = run
  const w = lastOf(S, OWNER.LOWER_A)
  if (!want(w && w.start > (run.since || 0), 'J8b: no Lower A saved by this run')) return { problems, facts: null }
  want(w.gym?.id === OWNER.SAHAROVA.id, `J8b: the workout's gym is ${w.gym?.name ?? 'none'}, not ${OWNER.SAHAROVA.name}`)
  want(ui.saved, 'J8b: Finish did not say "Workout saved"')
  want(!(run.prompts || []).length, `J8b: a prompt came up on a tick: ${(run.prompts || []).join(' | ')}`)
  const o = opened.entries.find(e => e.id === '1178')
  const calf = entryOf(w, '1178')
  if (want(o && calf, 'J8b: calf raise (1178) missing from the session or the saved workout')) {
    const holdsOpened = o.sets.filter(s => s.mode === 'time')
    want(eqJ(holdsOpened.map(s => [s.side, s.sec]), [['L', 75], ['R', 75]]), `J8b: 1178 opened with holds ${JSON.stringify(holdsOpened.map(s => [s.side, s.sec]))}, not 75 s left then right`)
    const holds = calf.sets.filter(isHold)
    want(eqJ(holds.map(s => [s.side, num(s.sec), round(s.w), !!s.done]), holdsOpened.map(s => [s.side, s.sec, s.w, true])),
      `J8b: 1178's holds saved as ${JSON.stringify(holds.map(s => [s.side, s.sec, s.w, !!s.done]))}, opened as ${JSON.stringify(holdsOpened.map(s => [s.side, s.sec, s.w]))}`)
    want(holds.every(s => round(s.w) > 0), 'J8b: a hold saved without its weight')
    const reps = calf.sets.find(s => !isWarm(s) && s.sides && s.sides.L?.done && s.sides.R?.done)
    want(reps, 'J8b: 1178 has no per-side rep set ticked on both sides')
    want(calf.hvBrand === 'Achilles Rehab', `J8b: 1178 saved with brand ${calf.hvBrand ?? 'none'}, not Achilles Rehab`)
  }
  want(eqJ(routineFacts(S.routines.find(r => r.id === OWNER.LOWER_A)), before.routine), 'J8b: the Lower A routine changed after a Finish without "Update the routine too"')
  const machines = mapChanges(before.hvMachines, S.hvMachines)
  want(!machines.length, `J8b: S.hvMachines changed: ${machines.join('; ')}`)
  if (want(draft, 'J8b: the workout gives no Hevy export draft')) {
    const ex = draft.exercises.find(e => e.ex === '1178')
    const lines = (ex?.notes || '').split('\n')
    want(lines[0] === 'Achilles Rehab', `J8b: export note for 1178 starts "${lines[0]}", not "Achilles Rehab"`)
    want(lines.some(l => /^(Set|Warm-up) \d+: hold 75 s L, 75 s R at [\d.]+ kg$/.test(l)), `J8b: export note for 1178 has no "hold 75 s L, 75 s R at … kg" line: ${JSON.stringify(ex?.notes)}`)
    want((ex?.sets || []).every(s => s.duration_seconds == null), 'J8b: a hold exports as a timed set in a reps exercise (it belongs in the note, D137)')
  }
  hrChecks(run, w, want, 'J8b')
  const facts = {
    gym: w.gym?.id ?? null, name: w.name, opened: opened.entries,
    saved: w.entries.map(entryFacts), machines, routine: routineFacts(S.routines.find(r => r.id === OWNER.LOWER_A)),
    export: draft,
  }
  return { problems, facts }
}

/**
 * J1, the routine lifter on the test profile. The routine is the one Today plans, so it moves with
 * the date: the facts are the rules' outcomes only, and the numbers go to `info`.
 * `run`: { S, since, started, opened, typed: { idx, set, w }, prefilled: { idx, set }, rest:
 * { before, after, skipped }, swap: { idx, from, to }, routine (routineFacts before), ui: { saved,
 * inHistory, detailShowsWeight } }.
 */
export function checkJ1(run, J = 'J1') {
  const { problems, want } = checker()
  const { S, opened } = run
  const w = (S.workouts || []).filter(x => x.start > (run.since || 0)).at(-1)
  const checks = {}
  const rule = (name, ok, line) => { checks[name] = want(ok, J + ': ' + line) }
  rule('started from Today', !!run.started, 'Today had no Start button for the next session')
  if (!want(w, J + ': no workout saved by this run')) return { problems, facts: { checks } }
  rule('named as Today said', w.name === run.started, `the workout is "${w.name}", Today said "${run.started}"`)
  rule('saved toast', run.ui.saved, 'Finish did not say "Workout saved"')
  const p = run.prefilled, t = run.typed
  const pe = w.entries[p.idx], po = opened[p.idx]
  rule('prefilled set saved as opened', pe && eqJ([round(pe.sets[p.set]?.w), num(pe.sets[p.set]?.r)], [po.sets[p.set].w, po.sets[p.set].r]),
    `the set ticked as opened saved as ${pe?.sets[p.set]?.w} × ${pe?.sets[p.set]?.r}, opened ${po.sets[p.set].w} × ${po.sets[p.set].r}`)
  rule('typed weight saved', round(w.entries[t.idx]?.sets[t.set]?.w) === round(t.w), `the retyped set saved at ${w.entries[t.idx]?.sets[t.set]?.w}, typed ${t.w}`)
  rule('rest timer ran', run.rest.before != null, 'no rest timer ran after the tick')
  rule('+1 min added a minute', run.rest.before != null && run.rest.after - run.rest.before >= 50, `+1 min took the rest from ${run.rest.before} s to ${run.rest.after} s`)
  rule('skip ended the rest', run.rest.skipped, 'Skip left the rest running')
  if (run.swap) {
    rule('swap changed the exercise', run.swap.to && run.swap.to !== run.swap.from, `Swap left ${run.swap.from} in place`)
    rule('swap saved', w.entries.some(e => e.id === run.swap.to), `the swapped-in ${run.swap.to} is not in the saved workout`)
  }
  const routine = S.routines.find(r => r.name === run.started)
  rule('routine unchanged', eqJ(routineFacts(routine), run.routine), 'the routine changed after a Finish without "Update the routine too"')
  rule('listed in History', run.ui.inHistory, `History does not list "${w.name}"`)
  rule('detail shows the typed weight', run.ui.detailShowsWeight, `the workout's detail does not show ${t.w}`)
  return {
    problems, facts: { checks },
    info: { routine: run.started, saved: w.entries.map(entryFacts) },
  }
}

/** --hr: every ticked set of the saved workout carries a heart rate, and the workout an average. */
function hrChecks(run, w, want, J) {
  if (!run.hr) return
  // shortcut: the strap is paired by hand (hevier/tools/fake-strap on a second emulator); script the pairing when D79 is checked here often.
  const sets = w.entries.flatMap(e => e.sets.filter(s => s.done))
  want(Number(w.hr?.avg) > 0, `${J}: --hr, but the workout has no average heart rate`)
  want(sets.every(s => Number(s.hr?.avg) > 0), `${J}: --hr, but ${sets.filter(s => !(Number(s.hr?.avg) > 0)).length} ticked sets have no heart rate`)
}

/* ------------------------------------------- the test profile's journeys, J2 to J7 -- */

const hashOf = v => createHash('sha1').update(JSON.stringify(v ?? null)).digest('hex').slice(0, 12)
const gymNames = S => Object.fromEntries((S?.equipProfiles || []).filter(p => p?.id != null).map(p => [p.id, p.name || String(p.id)]))
const asList = v => (Array.isArray(v) ? [...v] : [])

/**
 * What J2 to J7 compare before and after: the log, the routines and the plan as hashes and counts,
 * the per-gym maps keyed by gym name (no ids in the facts), and the fork's layout fields as they are.
 */
export function snapOf(S) {
  const g = gymNames(S)
  const byName = m => Object.fromEntries(Object.entries(m || {}).sort().map(([ex, by]) => [ex, Object.fromEntries(Object.entries(by || {}).map(([k, v]) => [g[k] ?? k, v]).sort())]))
  return {
    workouts: hashOf(S.workouts), nWorkouts: (S.workouts || []).length, active: !!S.active,
    routines: hashOf(S.routines), nRoutines: (S.routines || []).length,
    gyms: Object.values(g).sort(),
    machines: byName(S.hvMachines), cables: byName(S.hvCables),
    missing: Object.fromEntries(Object.entries(S.hvGymMissing || {}).sort().map(([ex, ids]) => [ex, asList(ids).map(i => g[i] ?? i).sort()])),
    sideOrder: { ...(S.hvSideOrder || {}) }, strength: hashOf(S.hvStrength || {}), layout: S.hvStatsLayout ?? null,
    week: S.week || {}, dayPlan: S.dayPlan || {}, rotation: hashOf(S.rotation ?? null),
    folders: asList(S.hvFolders), foldersClosed: asList(S.hvFoldersClosed),
  }
}

// A journey's named rules, as J1 keeps them: each one's outcome goes to the facts, a failure to the problems.
const rules = J => {
  const { problems, want } = checker()
  const checks = {}
  const rule = (name, ok, line) => { checks[name] = want(ok, J + ': ' + line) }
  return { problems, checks, rule }
}
const same = (rule, a, b, field, name, line) => rule(name, eqJ(a?.[field], b?.[field]), `${line}: ${JSON.stringify(a?.[field])} → ${JSON.stringify(b?.[field])}`)

/**
 * J2, the Hevy switcher: reads the import, finds the leg press by its brand, edits a routine's sets
 * and puts them back. `run`: { before, after (snapOf), routine: { name, before, after (routineFacts),
 * sets: { before, added, removed } }, ui: { importShown, liftFound, liftOpened, labels, routinePage,
 * editor } }.
 */
export function checkJ2(run) {
  const { problems, checks, rule } = rules('J2')
  const { before, after, routine: r, ui } = run
  rule('nothing imported', before.workouts === after.workouts && before.nWorkouts === after.nWorkouts, `S.workouts changed (${before.nWorkouts} → ${after.nWorkouts} workouts): something was imported or edited`)
  rule('import section shown', ui.importShown, 'step 1: Settings → Data shows no "Import backup" and "Import from another app"')
  rule('leg press found by its brand', ui.liftFound, 'step 2: Lifts\' search for "life fitness" does not list the leg press (0739)')
  rule('leg press page opened', ui.liftOpened, 'step 2: the leg press\'s page did not open')
  rule('routine page opened', ui.routinePage, `step 3: a tap on ${r.name}'s row did not open its page`)
  rule('editor opened', ui.editor, `step 3: ${r.name}'s Edit did not open the editor`)
  rule('a set added', r.sets.added === r.sets.before + 1, `step 3: + Set took ${r.name}'s first exercise from ${r.sets.before} to ${r.sets.added} sets`)
  rule('the set removed again', r.sets.removed === r.sets.before, `step 3: removing the added set left ${r.sets.removed} sets, not ${r.sets.before}`)
  rule('routine as before', eqJ(r.before, r.after), `${r.name} is not as before after its set was added and removed: ${diffFacts(r.before, r.after).join('; ')}`)
  same(rule, before.machines, after.machines, UX.LEG_PRESS, 'leg press brands unchanged', 'the leg press\'s brands changed')
  return { problems, facts: { checks, workouts: after.nWorkouts, routine: r.after, legPress: after.machines[UX.LEG_PRESS] ?? null, labels: !!ui.labels } }
}

/**
 * J3, the two-gym lifter: an empty workout at the other gym, the leg press's brand changed, the
 * cable on ×2, a search the gym narrows, then Discard. `run`: { before, after (snapOf), gym, other,
 * ui: { brandShown, picked, prevBefore, prevAfter, logged: { before, after }, header, hidden,
 * discardAsked } }.
 */
export function checkJ3(run) {
  const { problems, checks, rule } = rules('J3')
  const { before, after, gym, other, ui } = run
  const LP = UX.LEG_PRESS, C = UX.CABLE
  rule('no workout saved', !after.active && before.workouts === after.workouts, `the workout was saved or left open (active ${after.active}, ${before.nWorkouts} → ${after.nWorkouts} workouts)`)
  rule('no gym added', eqJ(before.gyms, after.gyms), `the gyms changed: ${JSON.stringify(before.gyms)} → ${JSON.stringify(after.gyms)} (was Find gyms nearby or Custom gym tapped?)`)
  rule('brand follows the gym', ui.brandShown === (before.machines[LP]?.[gym] ?? null), `step 2: the leg press shows brand ${ui.brandShown ?? 'none'} at ${gym}, which has ${before.machines[LP]?.[gym] ?? 'none'}`)
  rule('picked brand kept for this gym', after.machines[LP]?.[gym] === ui.picked, `step 2: S.hvMachines has ${after.machines[LP]?.[gym] ?? 'none'} for the leg press at ${gym}, picked ${ui.picked}`)
  rule('other gym keeps its brand', (after.machines[LP]?.[other] ?? null) === (before.machines[LP]?.[other] ?? null), `step 2: the leg press at ${other} went from ${before.machines[LP]?.[other] ?? 'none'} to ${after.machines[LP]?.[other] ?? 'none'}`)
  const moved = mapChanges(before.machines, after.machines)
  rule('only that brand changed', moved.length <= 1 && moved.every(l => l.startsWith(`${LP}.${gym}:`)), `S.hvMachines changed by ${JSON.stringify(moved)}, expected only the leg press at ${gym}`)
  // PREVIOUS reads last time on the same machine (D82): with either brand ever logged it must change.
  if (ui.logged.before || ui.logged.after) rule('PREVIOUS follows the brand', ui.prevBefore !== ui.prevAfter, `step 2: PREVIOUS stayed "${ui.prevBefore}" when the brand went to ${ui.picked}`)
  rule('cable ×2 kept for this gym', after.cables[C]?.[gym] === 'x2', `step 3: S.hvCables has ${after.cables[C]?.[gym] ?? 'none'} for ${C} at ${gym}, not ×2`)
  const cables = mapChanges(before.cables, after.cables)
  rule('only that cable changed', cables.every(l => l.startsWith(`${C}.${gym}:`)), `S.hvCables changed by ${JSON.stringify(cables)}`)
  rule('weight header says ×2', /×2/.test(ui.header || ''), `step 3: the cable's weight column reads "${ui.header}", not "… ×2"`)
  rule('hidden line names the gym', new RegExp(`^\\d+ hidden at ${(ui.hiddenGym || gym).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`).test(ui.hidden || ''), `step 4: the picker's line reads "${ui.hidden}", not "N hidden at ${ui.hiddenGym || gym}"`)
  rule('discard asks first', ui.discardAsked === 'Discard workout?', `step 5: Discard asked "${ui.discardAsked}", not "Discard workout?"`)
  return { problems, facts: { checks, gym, picked: ui.picked, header: ui.header, machines: moved, cables } }
}

/**
 * J4, the per-side and timer user. `run`: { before, after (snapOf), ui: { perSide, firstSide, ticked:
 * { R, L }, plank: { afterStop, afterTick, done }, bike: { shown, min }, away: { shown, expected },
 * discardAsked } }.
 */
export function checkJ4(run) {
  const { problems, checks, rule } = rules('J4')
  const { before, after, ui } = run
  rule('no workout saved', !after.active && before.workouts === after.workouts, `the workout was saved or left open (active ${after.active}, ${before.nWorkouts} → ${after.nWorkouts} workouts)`)
  rule('one-limb starts per side', ui.perSide, `step 1: ${UX.ONE_LEG} did not start per side (D75)`)
  rule('side order saved right first', after.sideOrder[UX.ONE_LEG] === 'RL', `step 1: S.hvSideOrder has ${after.sideOrder[UX.ONE_LEG] ?? 'nothing'} for ${UX.ONE_LEG}, not RL`)
  rule('right row first', ui.firstSide === 'R', `step 1: the per-side set's first row is ${ui.firstSide ?? 'no side'}, not R, after Right first`)
  rule('set ticked both sides', ui.ticked.R && ui.ticked.L, `step 1: the per-side set is ticked R ${ui.ticked.R}, L ${ui.ticked.L}`)
  const p = ui.plank
  rule('plank hold stopped with its time', p.afterStop >= 1 && p.afterStop <= 60, `step 2: the plank's Stop wrote ${p.afterStop} s`)
  rule('tick kept the stopped time', p.done && p.afterTick === p.afterStop, `step 2: the plank's set ticked ${p.done} at ${p.afterTick} s, stopped at ${p.afterStop} s`)
  rule('bike reads 12:34', ui.bike.shown === UX.BIKE_SHOWN, `step 3: ${UX.BIKE_DIGITS} on the number pad reads "${ui.bike.shown}", not ${UX.BIKE_SHOWN}`)
  rule('bike time stored', Math.abs(Number(ui.bike.min) - UX.BIKE_SEC / 60) < 0.01, `step 3: the bike's set holds ${ui.bike.min} min, not ${round(UX.BIKE_SEC / 60)}`)
  const a = ui.away
  rule('timer counted while away', a.shown != null && a.shown >= 20 && Math.abs(a.shown - a.expected) <= 3, `step 4: after 20 s away the set timer showed ${a.shown} s, ${a.expected} s since ▶`)
  rule('discard asks first', ui.discardAsked === 'Discard workout?', `step 5: Discard asked "${ui.discardAsked}", not "Discard workout?"`)
  return { problems, facts: { checks, firstSide: ui.firstSide, sideOrder: after.sideOrder[UX.ONE_LEG] ?? null, bike: ui.bike.shown, bikeMin: round(ui.bike.min) } }
}

/**
 * J5, the numbers person: read only, with Arrange Statistics put back by Reset. `run`: { before,
 * after (snapOf), layoutDefault, ui: { chart: { reps, week, setsSheet }, arrange: { hidden, moved,
 * reset }, report: { opened }, lift: { opened, last, reps, chart, all }, detail: { opened, trends,
 * named }, calendar: { before, after, planned } }, pins }.
 */
export function checkJ5(run) {
  const { problems, checks, rule } = rules('J5')
  const { before, after, ui } = run
  rule('workouts as before', before.workouts === after.workouts, `S.workouts changed (${before.nWorkouts} → ${after.nWorkouts})`)
  rule('routines as before', before.routines === after.routines, 'S.routines changed')
  rule('strength levels as before', before.strength === after.strength, 'S.hvStrength changed: were strength levels saved?')
  rule('layout default after Reset', eqJ(after.layout, run.layoutDefault), `after Reset S.hvStatsLayout is ${JSON.stringify(after.layout)}, not the default`)
  rule('chart switched to reps', ui.chart.reps === 'Weekly reps', `step 1: the chart's head reads "${ui.chart.reps}" after Reps`)
  rule('a week tapped', /^Week of /.test(ui.chart.week || ''), `step 1: a tap on a week left the head "${ui.chart.week}"`)
  rule('a week\'s sets opened', ui.chart.setsSheet, 'step 1: a week tapped on Sets opened no sheet of its sets per muscle')
  rule('a card hidden', ui.arrange.hidden, 'step 2: the Weekly chart card\'s switch did not hide it')
  rule('a tile moved', ui.arrange.moved, 'step 2: Move down did not move the first tile')
  rule('reset said so', ui.arrange.reset, 'step 2: Reset gave no "Layout reset" toast')
  rule('a record opened', ui.report.opened, 'step 3: no row of the monthly report opened its exercise, 12 months back')
  rule('lift page opened', ui.lift.opened, 'step 4: the leg press\'s page did not open from Lifts')
  rule('lift page has its parts', ui.lift.last && ui.lift.reps > 0 && ui.lift.chart, `step 4: the lift's page lacks a part (last sessions ${ui.lift.last}, rep counts ${ui.lift.reps}, chart ${ui.lift.chart})`)
  rule('all history listed', ui.lift.all > 0, 'step 4: All history listed no session')
  rule('detail opened', ui.detail.opened, 'step 5: the first History card did not open its Workout Detail')
  rule('trend marks named', ui.detail.named === ui.detail.trends, `step 5: ${ui.detail.trends - ui.detail.named} of ${ui.detail.trends} ↑ = ↓ marks have no name (D66)`)
  rule('earlier months shown', ui.calendar.after > ui.calendar.before, `step 6: Show earlier months went from ${ui.calendar.before} to ${ui.calendar.after} months`)
  if (ui.calendar.planned != null) rule('planned day opened', ui.calendar.planned, 'step 6: a tap on a planned day opened no sheet')
  return { problems, facts: { checks, pins: run.pins } }
}

/**
 * J6, the planner: a weekday changed and put back, a routine made in a new folder and deleted with
 * it. `run`: { before, after (snapOf), mid: { ex, linked, warmups, orderBefore, orderAfter, backup,
 * missingMarked, missingCleared }, ui: { day, dayChanged, folderMade, toasts } }.
 */
export function checkJ6(run) {
  const { problems, checks, rule } = rules('J6')
  const { before, after, mid, ui } = run
  for (const f of ['week', 'dayPlan', 'rotation']) same(rule, before, after, f, `S.${f} as before`, `S.${f} is not as before`)
  rule('routines as before', before.routines === after.routines && before.nRoutines === after.nRoutines, `S.routines is not as before (${before.nRoutines} → ${after.nRoutines})`)
  same(rule, before, after, 'folders', 'S.hvFolders as before', 'S.hvFolders is not as before')
  same(rule, before, after, 'missing', 'S.hvGymMissing as before', 'S.hvGymMissing is not as before')
  rule('a day changed', ui.dayChanged, `step 1: a tap on ${ui.day ?? 'a day'}'s routine did not change S.week`)
  rule('folder made', ui.folderMade, `step 2: + Folder did not list "${UX.FOLDER}"`)
  rule('three exercises', eqJ(mid.ex, UX.NEW_ROUTINE), `step 2: the new routine holds ${JSON.stringify(mid.ex)}, not ${JSON.stringify(UX.NEW_ROUTINE)}`)
  rule('superset linked', mid.linked, 'step 2: Make superset with previous did not link the first two')
  rule('warm-up added', mid.warmups > 0, 'step 2: + Warm-up added no warm-up to the first exercise')
  rule('reordered by tap', !eqJ(mid.orderBefore, mid.orderAfter), `step 2: Move up left the order ${JSON.stringify(mid.orderAfter)}`)
  rule('backup added', mid.backup === UX.BACKUP, `step 3: the slot's backups are ${JSON.stringify(mid.backup)}, not ${UX.BACKUP}`)
  rule('backup marked missing', mid.missingMarked, 'step 3: the backup\'s gym chip did not mark it missing (S.hvGymMissing)')
  rule('missing mark taken back', mid.missingCleared, 'step 3: a second tap on the chip did not take the mark back')
  rule('deletes are undoable', (ui.toasts || []).some(x => /gone\.$/.test(x)), `step 4: no "… gone." toast with Undo came: ${JSON.stringify(ui.toasts)}`)
  return { problems, facts: { checks, ex: mid.ex, order: mid.orderAfter, warmups: mid.warmups } }
}

/**
 * J7, J1 at font_scale 2.0. `run`: J1's run, plus `font`: { during, after } (`settings get system
 * font_scale`) and `ax`: { fields, setType, tick, rest }, each { role, name } as the DOM gives them.
 */
export function checkJ7(run) {
  const base = checkJ1(run, 'J7')
  const problems = [...base.problems]
  const checks = { ...base.facts.checks }
  const rule = (name, ok, line) => { checks[name] = !!ok; if (!ok) problems.push('J7: ' + line) }
  rule('font scale 2.0 during', Number(run.font?.during) === 2, `font_scale read ${run.font?.during} while J1 ran, not 2.0`)
  rule('font scale back to 1.0', Number(run.font?.after) === 1, `font_scale is ${run.font?.after} afterwards, not 1.0`)
  const ax = run.ax || {}
  const named = x => !!x && !!String(x.name || '').trim() && !!x.role
  rule('set row fields named', (ax.fields || []).length > 0 && ax.fields.every(named), `a set row's fields have no name: ${JSON.stringify(ax.fields)}`)
  rule('set type named', named(ax.setType), `the set-type letter has no name: ${JSON.stringify(ax.setType)}`)
  rule('tick named', named(ax.tick), `the tick has no name: ${JSON.stringify(ax.tick)}`)
  rule('rest buttons named', (ax.rest || []).length >= 2 && ax.rest.every(named), `the rest timer's buttons have no name: ${JSON.stringify(ax.rest)}`)
  return { problems, facts: { checks }, info: { ...(base.info || {}), ax } }
}

export const CHECKS = { J1: checkJ1, J2: checkJ2, J3: checkJ3, J4: checkJ4, J5: checkJ5, J6: checkJ6, J7: checkJ7, J8: checkJ8, J8b: checkJ8b }

/** The report on one journey: its problems, then its differences from the baseline. 0 when clean. */
export function report(J, result, base) {
  const lines = [], diffs = base ? diffFacts(base, result.facts) : []
  for (const p of result.problems) lines.push('  FAIL ' + p)
  if (base) for (const d of diffs) lines.push('  DIFF ' + d)
  const head = result.problems.length || diffs.length
    ? `${J}: ${result.problems.length} failed check${result.problems.length === 1 ? '' : 's'}, ${diffs.length} difference${diffs.length === 1 ? '' : 's'} from the baseline`
    : `${J}: every check passed${base ? ', no difference from the baseline' : ''}`
  return { code: lines.length ? 1 : 0, text: [head, ...lines].join('\n') }
}
