import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as more from './hevy-more.js'
import { hooks } from '../hooks.js'
import { parseHevyWorkouts, parseHevyRoutines, mergeHevyRoutines, importHevyData } from '../../lib/import-hevy.js'
import { mergeImport, importId } from '../../lib/import-csv.js'

const T = [
  { id: 't1', title: 'Squat (Barbell)', type: 'weight_reps', primary_muscle_group: 'quadriceps' },
  { id: 'c1', title: 'Grip Crusher (Cable)', type: 'weight_reps', is_custom: true, equipment: 'machine', primary_muscle_group: 'forearms', secondary_muscle_groups: ['biceps', 'other', 'forearms'] },
]
const hevyWorkout = (over = {}) => ({
  id: 'w1', title: 'Lower', routine_id: 'r1', description: '  Felt  strong ',
  start_time: '2026-10-14T16:27:30Z', end_time: '2026-10-14T17:40:00Z',
  exercises: [
    { exercise_template_id: 't1', title: 'Squat (Barbell)', notes: 'belt on', sets: [{ type: 'normal', weight_kg: 100, reps: 5 }] },
    { exercise_template_id: 't1', title: 'Squat (Barbell)', notes: 'paused', sets: [{ type: 'normal', weight_kg: 90, reps: 5 }] },
  ],
  ...over,
})
const hevyRoutine = (sets, over = {}) => ({
  id: 'r1', title: 'Lower', folder_id: null,
  exercises: [{ exercise_template_id: 't1', title: 'Squat (Barbell)', rest_seconds: 150, sets }],
  ...over,
})

describe('hevier: the rest of the Hevy API (D31)', () => {
  beforeEach(() => { hooks.hevyMore = more })
  afterEach(() => { hooks.hevyMore = null })

  it('brings a workout\'s description, its exercises\' notes and its Hevy routine', () => {
    const p = parseHevyWorkouts([hevyWorkout()], T, { unit: 'kg' })
    const [w] = p.workouts
    expect(w).toMatchObject({ note: 'Felt strong', hvHevyRoutine: 'r1', routineId: null })
    expect(w.entries[0].note).toBe('belt on · paused')
  })

  it('reads a routine exercise\'s rest and rep range; a range of one number is a rep count', () => {
    const ranged = parseHevyRoutines([hevyRoutine([
      { type: 'warmup', weight_kg: 60, reps: 5 },
      { type: 'normal', weight_kg: 100, reps: null, rep_range: { start: 8, end: 12 } },
    ])], T, { unit: 'kg' }).routines[0].ex[0]
    expect(ranged).toMatchObject({ restSec: 150, reps: 12, repsMin: 8, prog: 'double', weight: 100, warmupSets: 1 })
    const flat = parseHevyRoutines([hevyRoutine([{ type: 'normal', weight_kg: 100, reps: null, rep_range: { start: 6, end: 6 } }])], T, { unit: 'kg' }).routines[0].ex[0]
    expect(flat.reps).toBe(6)
    expect(flat.prog).toBeUndefined()
    const none = parseHevyRoutines([hevyRoutine([{ type: 'normal', weight_kg: 100, reps: 5 }], { exercises: [{ exercise_template_id: 't1', sets: [{ type: 'normal', weight_kg: 100, reps: 5 }] }] })], T, { unit: 'kg' }).routines[0].ex[0]
    expect(none.restSec).toBeUndefined()
    expect(none.repsMin).toBeUndefined()
  })

  it('reads Hevy\'s body measurements into openGym\'s fields, in cm', () => {
    const m = more.parseMeasures([
      { date: '2026-10-01', weight_kg: 80, neck_cm: 38, left_bicep_cm: 35, right_bicep_cm: 35.5, waist: 80.04, fat_percent: 18.5, lean_mass_kg: 65 },
      { date: '2026-10-02', weight_kg: 80.2 },                  // a weigh-in only: upstream's
      { date: '2026-10-01', chest_cm: 95, fat_percent: 140 },  // the same day again; a percent over 100 is no reading
      { date: 'nope', neck_cm: 40 },
    ])
    expect(m).toEqual([{ d: '2026-10-01', t: new Date('2026-10-01T12:00:00').getTime(), neck: 38, upperArmLeft: 35, upperArmRight: 35.5, waist: 80, bodyFat: 18.5, chest: 95 }])
  })

  it('merges new measurement days only, and switches on the fields that got values', () => {
    const S = { measurements: [{ d: '2026-10-01', t: 1, neck: 40 }], measurementEnabled: ['neck', 'waist'], customMeasurements: [] }
    const data = { hvMeasures: more.parseMeasures([
      { date: '2026-10-01', neck_cm: 38 },
      { date: '2026-10-05', neck_cm: 39, fat_percent: 18 },
    ]) }
    expect(more.merged(S, data).measures).toBe(1)
    expect(S.measurements.map(e => [e.d, e.neck])).toEqual([['2026-10-01', 40], ['2026-10-05', 39]])
    expect(S.measurements[1].bodyFat).toBe(18)
    expect(S.measurementEnabled).toEqual(['neck', 'waist', 'bodyFat'])
    const off = { measurements: [], customMeasurements: [] }
    expect(more.merged(off, data, { measures: false }).measures).toBe(0)
    expect(off.measurements).toEqual([])
  })

  it('links imported workouts to their routine once the routine is here', () => {
    const p = parseHevyWorkouts([hevyWorkout()], T, { unit: 'kg' })
    const S = { workouts: [], routines: [], customEx: [], bodyweight: [], exWeights: {} }
    mergeImport(S, p)
    const res = mergeHevyRoutines(S, parseHevyRoutines([hevyRoutine([{ type: 'normal', weight_kg: 100, reps: 5 }])], T, { unit: 'kg' }))
    expect(res.added).toBe(1)
    expect(more.linkable(S, p.workouts)).toBe(1)
    expect(S.workouts[0].routineId).toBe(null)               // linkable changes nothing
    expect(more.merged(S, { workouts: p }, {}, 5000).linked).toBe(1)
    expect(S.workouts[0]).toMatchObject({ routineId: S.routines[0].id, _ts: 5000 })
  })

  it('gives an earlier import\'s workout of the same session its routine, and leaves a link set in openGym alone', () => {
    const p = parseHevyWorkouts([hevyWorkout()], T, { unit: 'kg' })
    const api = p.workouts[0]
    const csv = { id: 'iwcsv', d: api.d, start: api.start - 30000, routineId: null, name: 'Lower', entries: [] }   // the CSV has minutes only
    const other = { id: 'iwlate', d: api.d, start: api.start + 3 * 3600000, routineId: null, name: 'Evening', entries: [] }
    const mine = { id: 'mine', d: api.d, start: api.start + 60000, routineId: 'picked', name: 'Lower', entries: [] }
    const S = { workouts: [csv, other, mine], routines: [{ id: 'R', hevyId: 'r1', name: 'Lower', ex: [] }] }
    mergeImport({ ...S, customEx: [], bodyweight: [], exWeights: {} }, p)   // a day already here is not imported
    expect(more.merged(S, { workouts: p }, {}, 7).linked).toBe(1)
    expect(csv).toMatchObject({ routineId: 'R', hvHevyRoutine: 'r1', _ts: 7 })
    expect(other.routineId).toBe(null)
    expect(mine.routineId).toBe('picked')
    // a routine imported later links it then
    const later = { workouts: [{ ...csv, routineId: null }], routines: [] }
    expect(more.merged(later, { workouts: p }).linked).toBe(0)
    later.routines.push({ id: 'R2', hevyId: 'r1', ex: [] })
    expect(more.merged(later, { workouts: { workouts: [] } }).linked).toBe(1)
    expect(later.workouts[0].routineId).toBe('R2')
  })

  it('fills in an imported custom exercise\'s muscles and equipment, not one edited since', () => {
    const p = parseHevyWorkouts([hevyWorkout({ exercises: [{ exercise_template_id: 'c1', title: 'Grip Crusher (Cable)', sets: [{ type: 'normal', weight_kg: 20, reps: 10 }] }] })], T, { unit: 'kg' })
    const S = { workouts: [], routines: [], customEx: [], bodyweight: [], exWeights: {} }
    mergeImport(S, p)
    const c = S.customEx[0]
    expect(c.id).toBe(importId('im', 'Hevy|c1'))
    const edited = { id: importId('im', 'Hevy|t1'), n: 'squat', custom: true, eq: 'barbell', tg: 'quadriceps', primaries: ['quadriceps'] }
    S.customEx.push(edited)
    more.merged(S, { hvTemplates: T, workouts: p })
    expect(c).toMatchObject({ eq: 'cable', tg: 'forearm', primaries: ['forearm'], secondaries: ['biceps'], sm: ['biceps'], muscleGroups: ['forearm', 'biceps'] })
    expect(edited).toMatchObject({ eq: 'barbell', tg: 'quadriceps' })
    expect(more.templateInfo({ equipment: 'none', primary_muscle_group: 'cardio' })).toEqual({ eq: 'body weight', primaries: [], secondaries: [] })
    expect(more.templateInfo({ equipment: 'other', primary_muscle_group: 'lats', title: 'Smith thing' })).toEqual({ eq: null, primaries: ['upper-back'], secondaries: [] })
  })

  it('fetches Hevy\'s weight unit with the key; a failure is no unit', async () => {
    const seen = []
    const get = async (url, opts) => { seen.push([String(url), opts.headers['api-key']]); return { ok: true, json: async () => ({ data: { weight_unit: 'lbs' } }) } }
    const data = { hvRaw: { bodyMeasurements: [{ date: '2026-10-01', neck_cm: 38 }], templates: T } }
    await more.fetched('k', data, get)
    expect(seen).toEqual([['https://api.hevyapp.com/v1/user/info', 'k']])
    expect(data).toMatchObject({ hvUnit: 'lb', hvMeasures: [{ d: '2026-10-01', neck: 38 }] })
    expect(data.hvRaw).toBeUndefined()
    expect(data.hvTemplates.map(t => t.id)).toEqual(['t1', 'c1'])
    expect(await more.fetchUnit('k', async () => { throw new Error('offline') })).toBe(null)
    expect(await more.fetchUnit('k', async () => ({ ok: false }))).toBe(null)
  })

  it('keeps the raw measurements and templates on upstream\'s result only with the hook set', async () => {
    const realFetch = globalThis.fetch
    const pages = { exercise_templates: T, workouts: [hevyWorkout()], routines: [], body_measurements: [{ date: '2026-10-01', weight_kg: 80, neck_cm: 38 }] }
    globalThis.fetch = async url => {
      const key = new URL(url).pathname.split('/').pop()
      return { ok: true, status: 200, json: async () => ({ page_count: 1, [key]: pages[key] }) }
    }
    try {
      const data = await importHevyData('k', { unit: 'kg' })
      expect(data.hvRaw.bodyMeasurements).toHaveLength(1)
      expect(data.bodyweight.bodyweight).toHaveLength(1)
      hooks.hevyMore = null
      const plain = await importHevyData('k', { unit: 'kg' })
      expect(plain.hvRaw).toBeUndefined()
      expect(plain.workouts.workouts[0].note).toBeUndefined()
      expect(plain.workouts.workouts[0].hvHevyRoutine).toBeUndefined()
    } finally { globalThis.fetch = realFetch }
  })
})
