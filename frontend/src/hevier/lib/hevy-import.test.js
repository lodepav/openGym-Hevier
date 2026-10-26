import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FIXES, splitBrand, splitCable, bareBrand, oneLimbOf, importHooks, readKey, upstreamMatch } from './hevy-import.js'
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
let choices = null
const useChoices = next => { choices = next || null }
const { importExercise, importDone } = importHooks(() => choices)

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
    expect(importExercise('Clamshell', 'Hevy')).toBe('2461')
    expect(importExercise('Seated Leg Curl (Machine)', 'Strong')).toBe(null)
    expect(importExercise('Squat (Barbell)', 'Hevy')).toBe(null)   // upstream's match stands
  })

  // The fix table's ids are checked against the catalogue above; these cases test the parsing
  // around a row (review 5.1), not the row itself.
  it('a fix row marked one arm at a time is per side; spacing before a bracket does not matter', () => {
    expect(readKey(importExercise('Behind the Back Curl (Cable)', 'Hevy'))).toEqual({ id: '4838', side: true, brand: '' })   // one arm at a time
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

  it('the belt squat and the deficit Smith split squat land on their own exercises', () => {
    const match = t => importExercise(t, 'Hevy') || upstreamMatch(t, 'Hevy')
    expect(match('Belt Squat (Machine)')).toBe('2950')
    // A unilateral exercise, so per side (D75).
    expect(readKey(match('Deficit Bulgarian Split Squat (Smith Machine)'))).toMatchObject({ id: '11568', side: true })
    expect(readKey(importExercise('Deficit Bulgarian Split Squat (Smith Machine) (brand: LifeFitness)', 'Hevy'))).toMatchObject({ id: '11568', side: true, brand: 'LifeFitness' })
  })

  it('takes a one-limb title to its machine or cable exercise, per side; free weights stay upstream\'s', () => {
    expect(oneLimbOf('Single Leg Press (Machine)')).toBe('0739')
    expect(readKey(importExercise('Single Leg Extensions', 'Hevy'))).toEqual({ id: '7108', side: true, brand: '' })
    expect(oneLimbOf('Single Leg Standing Calf Raise (Dumbbell)')).toBe(null)
    expect(oneLimbOf('Leg Press (Machine)')).toBe(null)
  })

  it('a one-arm cable row is the horizontal row, per side; with two stacks it is not also per stack', () => {
    const p = parseImport(csv([
      row('Single Arm Cable Row', 0, 'normal', 20, 10),
      row('Single Arm Cable Row (x2)', 0, 'normal', 15, 10, '15 Oct 2026, 16:27'),
    ]), { unit: 'kg', customEx: [] })
    const [plain, x2] = entriesOf(p)
    expect(plain.id).toBe('7564')
    expect(isSideSet(plain.sets[0])).toBe(true)
    expect(plain.sets[0].sides.L).toMatchObject({ w: 20, r: 10 })
    expect(x2).toMatchObject({ id: '7564', hvCable: 'x2' })
    expect(x2.target?.dbLoad).toBeUndefined()
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
    expect(ext.id).toBe('7108')
    expect(ext.sets.every(isSideSet)).toBe(true)
    expect(ext.sets[1]).toMatchObject({ w: 48.75, r: 20, sides: { L: { w: 48.75, r: 10 }, R: { w: 48.75, r: 10 } } })
    expect(ext.sets[0].phase).toBe('warmup')
    expect(press).toMatchObject({ id: '0739', hvBrand: 'LifeFitness' })
    expect(dip.id).toBe('0814')
    expect(wdip.id).toBe('1755')
    expect(calf).toMatchObject({ id: '2315', hvBrand: 'Achilles Rehab' })
    // unmatched with a brand: one custom exercise, named without the brand
    expect(curl).toMatchObject({ id: '4838', hvBrand: 'LifeFitness' })
    expect(curl.sets.every(isSideSet)).toBe(true)
    expect(odd.hvBrand).toBe('LifeFitness')
    expect(p.customEx.find(c => c.id === odd.id)?.n).toBe('qwerty zorb')
    expect(p.unmatchedNames).toContain('qwerty zorb')
    // volume counts both sides, warm-ups out
    expect(p.workouts[0].vol).toBe(48.75 * 20 + 100 * 8 + 20 * 8 + 40 * 15 + 10 * 24 + 10 * 12)
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
    expect(ext.id).toBe('7108')
    expect(ext.sets[0]).toMatchObject({ r: 20, sides: { L: { r: 10 }, R: { r: 10 } } })
    expect(curl).toMatchObject({ id: '0599', hvBrand: 'Hammer' })
    expect(p.customEx).toEqual([])

    const routines = [{ id: 'r1', title: 'Lower', exercises: [
      { exercise_template_id: 't1', title: 'Single Leg Extensions', sets: [{ type: 'normal', weight_kg: 40, reps: 10 }] },
    ] }]
    const r = importDone(parseHevyRoutines(routines, templates, { unit: 'kg' }))
    expect(r.routines[0].ex[0]).toMatchObject({ id: '7108', side: true, reps: 20 })   // 10 a side (D75)
  })

  it('turns Hevy\'s escaped line breaks in notes back into line breaks (D54)', () => {
    const p = parseImport(csv([
      `"Lower A","14 Oct 2026, 16:27","14 Oct 2026, 17:44","Tired\\nNext week","Squat (Barbell)",,"Deep\\nslow",0,"normal",60,5,,,`,
    ]), { unit: 'kg', customEx: [] })
    expect(p.workouts[0].note).toBe('Tired\nNext week')
    expect(entriesOf(p)[0].note).toBe('Deep\nslow')
  })

  it('changes nothing with the hooks empty, as in upstream\'s build', () => {
    Object.assign(hooks, { importExercise: null, importDone: null })
    const p = parseImport(csv([row('Seated Leg Curl (Machine)', 0, 'normal', 40, 10)]), { unit: 'kg', customEx: [] })
    expect(entriesOf(p)[0].id).toBe('0599')
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

  it('a reviewed title keeps its brand, setup and one arm whatever the brackets', () => {
    const id = t => { const a = importExercise(t, 'Hevy'); return readKey(a) || { id: a } }
    expect(id('Lat Pulldown (Cable) (x2) (brand:LifeFitness)')).toMatchObject({ id: '0150', brand: 'LifeFitness', cable: 'x2' })
    expect(id('Lat Pulldown (Cable) (LifeFitness)')).toMatchObject({ id: '0150', brand: 'LifeFitness' })
    expect(id('Face Pull (brand:LifeFitness)')).toMatchObject({ id: '7744', brand: 'LifeFitness' })
    expect(id('Single Arm Curl (Cable)')).toMatchObject({ id: '0190', side: true })
    expect(id('Single Arm Triceps Extension (Cable) (brand:LifeFitness)')).toMatchObject({ id: '0149', side: true })
    expect(id('Standing Calf Raise (Smith) (brand:Achilles Rehab)')).toMatchObject({ brand: 'Achilles Rehab' })
    expect(id('Iso-Lateral High Row (Machine)')).toMatchObject({ id: '0581', side: true })
    expect(id('Rear Delt Reverse Fly (Cable) (brand:LifeFitness)')).toMatchObject({ id: '0225', brand: 'LifeFitness' })
    for (const [, f] of Object.entries(FIXES)) expect(EXIDX[typeof f === 'string' ? f : f.id]).toBeTruthy()
  })

  it('reads a Hevy title’s second bracket as the brand, as it was written before "(brand: X)"', () => {
    expect(bareBrand('Lat Pulldown (Cable) (LifeFitness)')).toEqual({ name: 'Lat Pulldown (Cable)', brand: 'LifeFitness' })
    expect(bareBrand('Lat Pulldown (Cable)')).toBeNull()
    expect(bareBrand('Lat Pulldown (Cable) (LifeFitness) extra')).toBeNull()
    const p = parseImport(csv([
      row('Lat Pulldown (Cable) (LifeFitness)', 0, 'normal', 30, 10),
      row('Lat Pulldown (Cable)', 0, 'normal', 60, 10, '16 Oct 2026, 16:27'),
      row('Reverse Fly Single Arm (Cable) (LifeFitness)', 0, 'normal', 5, 12, '17 Oct 2026, 16:27'),
    ]), { unit: 'kg', customEx: [] })
    const [branded, plain, fly] = entriesOf(p)
    expect(branded).toMatchObject({ id: plain.id, hvBrand: 'LifeFitness' })
    expect(plain.hvBrand).toBeUndefined()
    expect(fly).toMatchObject({ id: '9868', hvBrand: 'LifeFitness' })
    expect(isSideSet(fly.sets[0])).toBe(true)
    expect(p.customEx).toEqual([])
    // Only Hevy's titles: another app's second bracket is its own name.
    expect(readKey(importExercise('Lat Pulldown (Cable) (LifeFitness)', 'Strong'))).toBeNull()
  })

  it('a parse that never finished leaves no titles for the next import’s review', async () => {
    importExercise('Qwerty Zorb', 'Hevy')
    await Promise.resolve()
    const p = parseImport(csv([row('Seated Leg Curl (Machine)', 0, 'normal', 40, 10)]), { unit: 'kg', customEx: [] })
    expect(p.hvTitles.map(x => x.title)).toEqual(['Seated Leg Curl (Machine)'])
  })

  it('your own exercise from an earlier import stays yours over a fix row, unless the review chose', () => {
    const customEx = [{ id: 'imOld', n: 'seated leg curl (machine)', custom: true, eq: 'custom', tg: '' }]
    const rows = csv([row('Seated Leg Curl (Machine)', 0, 'normal', 40, 10)])
    useChoices({ map: null, cables: null, known: new Set(['imOld']), customEx })
    expect(entriesOf(parseImport(rows, { unit: 'kg', customEx }))[0].id).toBe('imOld')
    useChoices({ map: { 'Hevy|seated leg curl (machine)': '0599' }, cables: null, known: new Set(['imOld']), customEx })
    expect(entriesOf(parseImport(rows, { unit: 'kg', customEx }))[0].id).toBe('0599')
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

describe('hevier: a single bracket that is your own brand (review T12)', () => {
  afterEach(() => useChoices(null))
  it('is cut out as that brand, in your spelling, from any app; anything else stays in the title', () => {
    useChoices({ map: null, cables: null, known: new Set(), customEx: [], brands: new Map([['lifefitness', 'LifeFitness']]) })
    expect(readKey(importExercise('Face Pull (Lifefitness)', 'Hevy'))).toMatchObject({ brand: 'LifeFitness' })
    expect(readKey(importExercise('Leg Press (Life Fitness)', 'Strong'))).toMatchObject({ brand: 'LifeFitness' })
    expect(readKey(importExercise('Hip Thrust (Paused)', 'Strong'))?.brand || '').toBe('')
  })
})

describe('hevier: a brand the same file names counts for its single brackets (D29)', () => {
  beforeEach(() => Object.assign(hooks, { importExercise, importDone }))
  afterEach(() => { Object.assign(hooks, { importExercise: null, importDone: null }); useChoices(null) })
  it('on a fresh install, "Face Pull (LifeFitness)" is the face pull with that brand, not your own exercise', () => {
    useChoices({ map: null, cables: null, known: new Set(), customEx: [], brands: new Map() })
    const p = parseImport(csv([
      row('Lat Pulldown (Cable) (brand: LifeFitness)', 0, 'normal', 50, 10),
      row('Face Pull (LifeFitness)', 0, 'normal', 20, 15),
      row('Hip Thrust (Paused)', 0, 'normal', 60, 8, '13 Oct 2026, 16:27'),
      row('Lying Neck Rotation', 0, 'normal', 0, 20),
    ]), { unit: 'kg', customEx: [] })
    const face = entriesOf(p).find(e => /face pull/i.test(EXIDX[e.id]?.n || ''))
    expect(face).toBeTruthy()
    expect(face.hvBrand).toBe('LifeFitness')
    expect(p.customEx.map(c => c.n).sort()).toEqual(['hip thrust (paused)', 'lying neck rotation'])
    expect(p.unmatchedNames.map(n => n.toLowerCase()).sort()).toEqual(['hip thrust (paused)', 'lying neck rotation'])
    expect(p.hvTitles.find(t => t.title === 'Face Pull')).toMatchObject({ brand: 'LifeFitness' })
  })
})
