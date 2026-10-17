import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FIXES, splitBrand, splitCable, oneLimbOf, importExercise, importDone, importWeight, readKey, upstreamMatch, useChoices } from './hevy-import.js'
import { workoutVolume } from '../../lib/history.js'
import { hooks } from '../hooks.js'
import { EXIDX } from '../../lib/exercises.js'
import { parseImport, mergeImport, importId } from '../../lib/import-csv.js'
import { parseHevyWorkouts, parseHevyRoutines, parseHevyBodyweight } from '../../lib/import-hevy.js'
import { isSideSet } from '../../lib/workout-model.js'

const HEAD = '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"'
const row = (ex, i, type, w, r, start = '14 Oct 2026, 16:27') =>
  `"Lower A","${start}","${start.replace('16:27', '17:44')}","","${ex}",,"",${i},"${type}",${w},${r},,,`
const csv = rows => [HEAD, ...rows].join('\n')
const entriesOf = p => p.workouts.flatMap(w => w.entries)

describe('hevier Hevy import (D29)', () => {
  beforeEach(() => Object.assign(hooks, { importExercise, importDone }))
  afterEach(() => Object.assign(hooks, { importExercise: null, importDone: null }))

  it('points every fix at an exercise the catalogue has', () => {
    for (const [title, f] of Object.entries(FIXES)) {
      const id = typeof f === 'string' ? f : f.id
      expect(EXIDX[id], title).toBeTruthy()
    }
  })

  it('reads "(brand: X)" anywhere in a title, and nothing else as a brand', () => {
    expect(splitBrand('Leg Press (Machine) (brand: LifeFitness)')).toEqual({ name: 'Leg Press (Machine)', brand: 'LifeFitness' })
    expect(splitBrand('Calf Extension (Brand:Achilles Rehab) (Machine)')).toEqual({ name: 'Calf Extension (Machine)', brand: 'Achilles Rehab' })
    expect(splitBrand('Leg Press (Machine) (LifeFitness)')).toEqual({ name: 'Leg Press (Machine) (LifeFitness)', brand: '' })
  })

  it('fixes what upstream matches wrongly, Hevy only', () => {
    expect(importExercise('Seated Leg Curl (Machine)', 'Hevy')).toBe('0599')
    expect(importExercise('Air Bike', 'Hevy')).toBe('3893')
    expect(importExercise('Seated Leg Curl (Machine)', 'Strong')).toBe(null)
    expect(importExercise('Squat (Barbell)', 'Hevy')).toBe(null)   // upstream's match stands
  })

  it('the user’s own matches: Nordic curls, deficit push ups, the behind-the-back cable curl', () => {
    expect(importExercise('Nordic Hamstrings Curls', 'Hevy')).toBe('7746')
    expect(importExercise('Deficit Push Up', 'Hevy')).toBe('1486')
    expect(importExercise('Behind the Back Curl (Cable)', 'Hevy')).toBe('2656')
    expect(importExercise('Seated Cable Row - Bar Wide Grip', 'Hevy')).toBe('0218')
    expect(importExercise('Seated Cable Row - Bar Wide Grip(Cable)', 'Hevy')).toBe('0218')
    expect(importExercise('Seated Cable Row - Bar Wide Grip (Cable)', 'Hevy')).toBe('0218')
  })

  it('the API import finds by name what its template map lacks, and keeps your own exercises', () => {
    const T = [{ id: 'x1', title: 'Belt Squat (Machine)', type: 'weight_reps', primary_muscle_group: 'quadriceps' },
      { id: 'x2', title: 'Lying Neck Rotation', type: 'reps_only', primary_muscle_group: 'neck' },
      { id: 'x3', title: 'Hip Thrust (Machine)', type: 'weight_reps', primary_muscle_group: 'glutes' }]
    const ex = (id, title) => ({ exercise_template_id: id, title, sets: [{ type: 'normal', weight_kg: 50, reps: 10 }] })
    const w = { id: 'h1', title: 'Legs', start_time: '2026-10-14T16:00:00Z', end_time: '2026-10-14T17:00:00Z',
      exercises: [ex('x1', 'Belt Squat (Machine)'), ex('x2', 'Lying Neck Rotation'), ex('x3', 'Hip Thrust (Machine)')] }
    // An earlier import made Hip Thrust (Machine) your own: it stays so.
    const mine = { id: importId('im', 'Hevy|x3'), n: 'my hip thrust', custom: true, eq: 'custom' }
    const p = importDone(parseHevyWorkouts([w], T, { unit: 'kg', customEx: [mine] }))
    expect(p.workouts[0].entries.map(e => e.id)).toEqual(['2950', importId('im', 'Hevy|x2'), mine.id])
    expect(p.unmatchedNames).toEqual(['Lying Neck Rotation'])
    expect(p.customEx.map(c => c.n)).toEqual(['lying neck rotation'])
    const r = importDone(parseHevyRoutines([{ id: 'r1', title: 'Legs', exercises: [ex('x1', 'Belt Squat (Machine)')] }], T, { unit: 'kg' }))
    expect(r.routines[0].ex[0].id).toBe('2950')
    expect(r.customEx).toEqual([])
  })

  it('the belt squat and the deficit Smith split squat land on their own exercises (PLAN item 22)', () => {
    const match = t => importExercise(t, 'Hevy') || upstreamMatch(t, 'Hevy')
    expect(match('Belt Squat (Machine)')).toBe('2950')
    expect(match('Deficit Bulgarian Split Squat (Smith Machine)')).toBe('11568')
    expect(readKey(importExercise('Deficit Bulgarian Split Squat (Smith Machine) (brand: LifeFitness)', 'Hevy'))).toMatchObject({ id: '11568', brand: 'LifeFitness' })
  })

  it('takes a one-limb title to its machine or cable exercise, per side; free weights stay upstream\'s', () => {
    expect(oneLimbOf('Single Leg Press (Machine)')).toBe('0739')
    expect(readKey(importExercise('Single Leg Extensions', 'Hevy'))).toEqual({ id: '0585', side: true, brand: '' })
    expect(oneLimbOf('Single Leg Standing Calf Raise (Dumbbell)')).toBe(null)
    expect(oneLimbOf('Leg Press (Machine)')).toBe(null)
  })

  it('imports a Hevy CSV with per-side sets, brands and its own title for each weighted variant', () => {
    const p = parseImport(csv([
      row('Single Leg Extensions', 0, 'warmup', 30, 4),
      row('Single Leg Extensions', 1, 'normal', 48.75, 10),
      row('Leg Press (Machine) (brand: LifeFitness)', 0, 'normal', 100, 8),
      row('Triceps Dip', 0, 'normal', 0, 12),
      row('Triceps Dip (Weighted)', 0, 'normal', 20, 8),
      row('Calf Extension (Machine) (brand: Achilles Rehab)', 0, 'normal', 40, 15),
      row('Behind the Back Curl (Cable) (brand: LifeFitness)', 0, 'normal', 10, 12),
      row('Qwerty Zorb (brand: LifeFitness)', 0, 'normal', 10, 12),
    ]), { unit: 'kg', customEx: [] })
    const [ext, press, dip, wdip, calf, curl, odd] = entriesOf(p)
    expect(ext.id).toBe('0585')
    expect(ext.sets.every(isSideSet)).toBe(true)
    expect(ext.sets[1]).toMatchObject({ w: 48.75, r: 20, sides: { L: { w: 48.75, r: 10 }, R: { w: 48.75, r: 10 } } })
    expect(ext.sets[0].phase).toBe('warmup')
    expect(press).toMatchObject({ id: '0739', hvBrand: 'LifeFitness' })
    expect(dip.id).toBe('0814')
    expect(wdip.id).toBe('1767')
    expect(calf).toMatchObject({ id: '2289', hvBrand: 'Achilles Rehab' })
    // unmatched with a brand: one custom exercise, named without the brand
    expect(curl).toMatchObject({ id: '2656', hvBrand: 'LifeFitness' })
    expect(odd.hvBrand).toBe('LifeFitness')
    expect(p.customEx.find(c => c.id === odd.id)?.n).toBe('qwerty zorb')
    expect(p.unmatchedNames).toContain('qwerty zorb')
    // volume counts both sides, warm-ups out
    expect(p.workouts[0].vol).toBe(48.75 * 20 + 100 * 8 + 20 * 8 + 40 * 15 + 10 * 12 + 10 * 12)
    // upstream's merge keeps it all
    const S = { workouts: [], customEx: [], bodyweight: [], exWeights: {} }
    mergeImport(S, p)
    expect(S.workouts[0].entries[1].hvBrand).toBe('LifeFitness')
    expect(S.customEx.map(c => c.n)).toEqual(['qwerty zorb'])
  })

  it('leaves a file from another app to upstream, brands aside', () => {
    const strong = 'Date,Workout Name,Exercise Name,Set Order,Weight,Reps\n2026-10-14,A,Seated Leg Curl (Machine),1,40,10\n2026-10-14,A,Leg Press (brand: Hammer),1,100,10'
    const p = parseImport(strong, { unit: 'kg', customEx: [] })
    const [curl, press] = entriesOf(p)
    expect(curl.hvBrand).toBeUndefined()
    expect(curl.sets[0].sides).toBeUndefined()
    expect(press.hvBrand).toBe('Hammer')
  })

  it('does the same for the Hevy API, and a routine\'s one-limb exercise is per side', () => {
    const templates = [
      { id: 't1', title: 'Single Leg Extensions', type: 'weight_reps', primary_muscle_group: 'quadriceps' },
      { id: 't2', title: 'Seated Leg Curl (Machine) (brand: Hammer)', type: 'weight_reps', primary_muscle_group: 'hamstrings' },
    ]
    const workouts = [{
      id: 'w1', title: 'Lower', start_time: '2026-10-14T16:27:00Z', end_time: '2026-10-14T17:40:00Z',
      exercises: [
        { exercise_template_id: 't1', title: 'Single Leg Extensions', sets: [{ type: 'normal', weight_kg: 40, reps: 10 }] },
        { exercise_template_id: 't2', title: 'Seated Leg Curl (Machine) (brand: Hammer)', sets: [{ type: 'normal', weight_kg: 50, reps: 8 }] },
      ],
    }]
    const p = importDone(parseHevyWorkouts(workouts, templates, { unit: 'kg' }))
    const [ext, curl] = entriesOf(p)
    expect(ext.id).toBe('0585')
    expect(ext.sets[0]).toMatchObject({ r: 20, sides: { L: { r: 10 }, R: { r: 10 } } })
    expect(curl).toMatchObject({ id: '0599', hvBrand: 'Hammer' })
    expect(p.customEx).toEqual([])

    const routines = [{ id: 'r1', title: 'Lower', exercises: [
      { exercise_template_id: 't1', title: 'Single Leg Extensions', sets: [{ type: 'normal', weight_kg: 40, reps: 10 }] },
    ] }]
    const r = importDone(parseHevyRoutines(routines, templates, { unit: 'kg' }))
    expect(r.routines[0].ex[0]).toMatchObject({ id: '0585', side: true })
  })

  it('changes nothing with the hooks empty, as in upstream\'s build', () => {
    Object.assign(hooks, { importExercise: null, importDone: null })
    const p = parseImport(csv([row('Seated Leg Curl (Machine)', 0, 'normal', 40, 10)]), { unit: 'kg', customEx: [] })
    expect(entriesOf(p)[0].id).toBe('0586')
  })
})

describe('hevier import weights to the hundredth (D40)', () => {
  beforeEach(() => { hooks.importWeight = importWeight })
  afterEach(() => { hooks.importWeight = null })
  const ws = p => entriesOf(p).flatMap(e => e.sets.map(s => s.w))
  const api = w => [{ id: 'w1', title: 'Push', start_time: '2026-10-14T16:27:00Z', end_time: '2026-10-14T17:40:00Z',
    exercises: [{ exercise_template_id: 'D04AC939', title: 'Bench Press (Barbell)', sets: [{ type: 'normal', weight_kg: w, reps: 5 }] }] }]

  it('keeps the Hevy API\'s hundredths, in kg and converted to lb', () => {
    expect(ws(parseHevyWorkouts(api(20.41), [], { unit: 'kg' }))).toEqual([20.41])
    expect(ws(parseHevyWorkouts(api(20.411845), [], { unit: 'kg' }))).toEqual([20.41])
    expect(ws(parseHevyWorkouts(api(20.41165665), [], { unit: 'lb' }))).toEqual([45])
    expect(parseHevyBodyweight([{ date: '2026-10-14', weight_kg: 80.37 }]).bodyweight[0].w).toBe(80.37)
  })

  it('keeps a CSV weight\'s hundredths, converted or not; without the hook upstream rounds to tenths', () => {
    const lb = csv([row('Squat (Barbell)', 0, 'normal', 45, 5)]).replace('weight_kg', 'weight_lbs')
    expect(ws(parseImport(csv([row('Squat (Barbell)', 0, 'normal', 20.41, 5)]), { unit: 'kg' }))).toEqual([20.41])
    expect(ws(parseImport(lb, { unit: 'kg' }))).toEqual([20.41])
    hooks.importWeight = null
    expect(ws(parseImport(lb, { unit: 'kg' }))).toEqual([20.4])
    expect(ws(parseHevyWorkouts(api(20.41), [], { unit: 'kg' }))).toEqual([20.4])
  })
})

describe('hevier cable setup from the title (D43)', () => {
  beforeEach(() => Object.assign(hooks, { importExercise, importDone }))
  afterEach(() => { Object.assign(hooks, { importExercise: null, importDone: null }); useChoices(null) })

  it('reads a bare (1:1), (2:1) or (x2), before or after other brackets, and cuts it out', () => {
    expect(splitCable('Lat Pulldown (Cable)(x2)')).toEqual({ name: 'Lat Pulldown (Cable)', cable: 'x2' })
    expect(splitCable('Lat Pulldown ( 2 : 1 ) (Cable)')).toEqual({ name: 'Lat Pulldown (Cable)', cable: '2:1' })
    expect(splitCable('Cable Fly (X2)')).toEqual({ name: 'Cable Fly', cable: 'x2' })
    expect(splitCable('Lat Pulldown (Cable) (x3)')).toEqual({ name: 'Lat Pulldown (Cable) (x3)', cable: '' })
  })

  it('imports the setup on the entry, two stacks per stack with volume counted twice', () => {
    const p = parseImport(csv([
      row('Lat Pulldown (Cable)(x2)', 0, 'normal', 30, 10),
      row('Lat Pulldown (Cable) (brand: Matrix) (2:1)', 0, 'normal', 50, 10, '15 Oct 2026, 16:27'),
      row('Lat Pulldown (Cable)', 0, 'normal', 60, 10, '16 Oct 2026, 16:27'),
    ]), { unit: 'kg', customEx: [] })
    const [x2, ratio, plain] = entriesOf(p)
    expect(EXIDX[x2.id].eq).toBe('cable')
    expect(ratio.id).toBe(x2.id)
    expect(plain.id).toBe(x2.id)
    expect(x2).toMatchObject({ hvCable: 'x2', target: { dbLoad: 'each' } })
    expect(ratio).toMatchObject({ hvCable: '2:1', hvBrand: 'Matrix' })
    expect(ratio.target?.dbLoad).toBeUndefined()
    expect(plain.hvCable).toBeUndefined()      // 1:1, unless the review says otherwise
    expect(p.workouts[0].vol).toBe(2 * 30 * 10)
    expect(workoutVolume(p.workouts[0])).toBe(2 * 30 * 10)   // upstream's own count agrees
    expect(p.workouts[1].vol).toBe(50 * 10)
  })

  it('a cable the review set is imported with that setup; the title’s own tag wins', () => {
    useChoices({ map: null, cables: { 'Hevy|lat pulldown (cable)': '2:1' }, known: new Set() })
    const p = parseImport(csv([
      row('Lat Pulldown (Cable)', 0, 'normal', 60, 10),
      row('Lat Pulldown (Cable) (x2)', 0, 'normal', 30, 10, '15 Oct 2026, 16:27'),
    ]), { unit: 'kg', customEx: [] })
    expect(entriesOf(p).map(e => e.hvCable)).toEqual(['2:1', 'x2'])
  })
})
