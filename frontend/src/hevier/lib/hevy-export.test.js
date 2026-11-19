import { describe, expect, it } from 'vitest'
import { rpeOf, workoutDraft, routineDraft, fingerprint, baseline, pending, templateFinder, newTemplate, finish, bare, isImported, EXPORT_FIXES, builtinTemplates, webWorkout, v2Workout, v2Update, repairMarks } from './hevy-export.js'
import { exportOnce } from './hevy-export-sync.js'
import { HevyApiError, HEVY_ID_MAP } from '../../lib/import-hevy.js'
import { HEVY_TITLE_MAP } from '../../lib/hevy-id-map.js'
import { importId } from '../../lib/import-csv.js'
import { EXIDX } from '../../lib/exercises.js'
import { makeSideSet } from '../../lib/workout-model.js'

const T0 = Date.parse('2026-10-15T16:00:00Z')
const squat = '0043'
const legCurl = '0599'
const workout = (over = {}) => ({
  id: 'w1', d: '2026-10-15', start: T0, end: T0 + 3600e3, name: 'Legs', note: 'good day', routineId: 'R',
  entries: [
    { id: squat, sg: 'a', note: 'belt', sets: [
      { phase: 'warmup', w: 60, r: 5, done: true },
      { w: 100, r: 5, done: true, rpe: 8.2 },
      { w: 100, r: 5, done: true, failure: true, rir: 0 },
      { w: 100, r: 5, done: false },
    ] },
    { id: legCurl, sg: 'a', sets: [{ w: 40, r: 12, done: true, type: 'dropset', drops: [{ w: 30, r: 8 }] }] },
    { id: '0599x', sets: [{ w: 1, r: 1, done: false }] },
  ],
  ...over,
})

describe('hevier export to Hevy: the bodies (D34)', () => {
  it('rounds effort to Hevy\'s RPE steps, RIR read as 10 − RIR, nothing below 6', () => {
    expect(rpeOf({ rpe: 8.2 })).toBe(8)
    expect(rpeOf({ rpe: 9.3 })).toBe(9.5)
    expect(rpeOf({ rir: 2 })).toBe(8)
    expect(rpeOf({ rir: 0 })).toBe(10)
    expect(rpeOf({ rpe: 5 })).toBe(null)
    expect(rpeOf({})).toBe(null)
  })

  it('sends a workout\'s ticked sets with Hevy\'s set types, supersets, notes and times', () => {
    const d = workoutDraft(workout())
    expect(d).toMatchObject({ title: 'Legs', description: 'good day', start_time: '2026-10-15T16:00:00.000Z', end_time: '2026-10-15T17:00:00.000Z' })
    expect(d.exercises.map(e => [e.ex, e.superset_id, e.notes])).toEqual([[squat, 0, 'belt'], [legCurl, 0, null]])
    expect(d.exercises[0].sets.map(s => [s.type, s.weight_kg, s.reps, s.rpe])).toEqual([
      ['warmup', 60, 5, undefined], ['normal', 100, 5, 8], ['failure', 100, 5, 10]])
    expect(d.exercises[1].sets.map(s => [s.type, s.weight_kg, s.reps])).toEqual([['normal', 40, 12], ['dropset', 30, 8]])
    expect(workoutDraft(workout({ entries: [] }))).toBe(null)
  })

  it('converts lb, splits rest-pause bursts, sends one side of a per-side set, and times and distances', () => {
    const d = workoutDraft(workout({ entries: [
      { id: squat, sets: [{ w: 225, r: 12, done: true, type: 'restpause', clusters: [{ r: 3 }, { r: 2 }] }] },
      { id: legCurl, sets: [{ w: 40, r: 18, done: true, sides: { L: { w: 40, r: 9, done: true }, R: { w: 42.5, r: 9, done: true } } }] },
      { id: '0463', sets: [{ w: 0, sec: 60, done: true }] },
      { id: '2258', sets: [{ min: 30, speed: 6, done: true }] },
    ] }), 'lb')
    const [rp, side, plank, walk] = d.exercises.map(e => e.sets)
    expect(rp.map(s => [s.type, s.weight_kg, s.reps])).toEqual([['normal', 102.06, 7], ['dropset', 102.06, 3], ['dropset', 102.06, 2]])
    expect(side.map(s => [s.weight_kg, s.reps])).toEqual([[19.28, 9]])
    expect(plank[0]).toMatchObject({ duration_seconds: 60, reps: null })
    expect(walk[0]).toMatchObject({ duration_seconds: 1800, distance_meters: 3000, weight_kg: null })
  })

  it('sends a per-side set as the side with more reps, not the heavier one', () => {
    const d = workoutDraft(workout({ entries: [
      { id: legCurl, sets: [{ w: 40, r: 18, done: true, sides: { L: { w: 40, r: 10, done: true }, R: { w: 45, r: 8, done: true } } }] },
    ] }), 'kg')
    expect(d.exercises[0].sets.map(s => [s.weight_kg, s.reps])).toEqual([[40, 10]])
  })

  it('draws a routine as D15\'s table: warm-ups, a rep range, rest, last set to failure, its folder', () => {
    const r = { id: 'R', name: 'Legs', folder: 'PPL', ex: [
      { id: squat, sets: 3, reps: 5, weight: 100, mode: 'reps', warmupSets: 1, restSec: 180, lastToFailure: true, note: 'deep' },
      { id: legCurl, sets: 2, reps: 12, repsMin: 8, prog: 'double', weight: 40, mode: 'reps' },
    ] }
    const d = routineDraft(r)
    expect(d).toMatchObject({ title: 'Legs', folder: 'PPL' })
    expect(d.exercises[0]).toMatchObject({ ex: squat, rest_seconds: 180, notes: 'deep' })
    expect(d.exercises[0].sets.map(s => [s.type, s.weight_kg, s.reps])).toEqual([['warmup', null, null], ['normal', 100, 5], ['normal', 100, 5], ['failure', 100, 5]])
    expect(d.exercises[1].sets[0]).toMatchObject({ type: 'normal', weight_kg: 40, reps: null, rep_range: { start: 8, end: 12 } })
  })

  it('a fingerprint changes with what Hevy would show, not with a sync stamp; a heart rate shows now (D137)', () => {
    const a = fingerprint(workoutDraft(workout()))
    expect(fingerprint(workoutDraft(workout({ _ts: 9 })))).toBe(a)
    expect(fingerprint(workoutDraft(workout({ hr: { avg: 120 } })))).not.toBe(a)
    expect(fingerprint(workoutDraft(workout({ name: 'Leg day' })))).not.toBe(a)
  })
})

// A workout with tick times, a per-side set, a drop, a rest-pause burst and a gym with a place.
const GS = { unit: 'kg', equipProfiles: [{ id: 'g1', name: 'Lemon Gym · Grostonas iela 1' }], hvGymPlaces: { g1: { lat: 56.9646269, lng: 24.1186412, name: 'Lemon Gym' } } }
const ticked = () => workout({ entries: [
  { id: squat, hvGym: 'g1', note: 'belt', sets: [
    { phase: 'warmup', w: 60, r: 5, done: true, at: T0 + 60e3 },
    { w: 100, r: 12, done: true, at: T0 + 180e3, type: 'restpause', clusters: [{ r: 3 }] },
    { w: 100, r: 5, done: true, at: T0 + 300e3, type: 'dropset', drops: [{ w: 80, r: 4 }] },
  ] },
  { id: legCurl, hvGym: 'g1', sets: [{ w: 40, r: 18, done: true, sides: { L: { w: 40, r: 9, done: true, at: T0 + 600e3 }, R: { w: 42.5, r: 9, done: true, at: T0 + 620e3 } } }] },
] })

describe('hevier export to Hevy: set times and the gym (D143)', () => {
  // Taken from the code before D143: a workout already sent must keep its print, and the key-only body its bytes.
  const PRINT = '10riq8m.nr'
  const BODY = '{"workout":{"title":"Legs","description":"good day\\nAt Lemon Gym","start_time":"2026-10-15T16:00:00.000Z","end_time":"2026-10-15T17:00:00.000Z","exercises":[{"exercise_template_id":"SQ","superset_id":null,"notes":"belt\\nTime 5 min","sets":[{"type":"warmup","weight_kg":60,"reps":5,"distance_meters":null,"duration_seconds":null},{"type":"normal","weight_kg":100,"reps":9,"distance_meters":null,"duration_seconds":null},{"type":"dropset","weight_kg":100,"reps":3,"distance_meters":null,"duration_seconds":null},{"type":"normal","weight_kg":100,"reps":5,"distance_meters":null,"duration_seconds":null},{"type":"dropset","weight_kg":80,"reps":4,"distance_meters":null,"duration_seconds":null}]},{"exercise_template_id":"LC","superset_id":null,"notes":"Time 5 min\\nSet 1: L 40 kg × 9, R 42.5 kg × 9","sets":[{"type":"normal","weight_kg":42.5,"reps":9,"distance_meters":null,"duration_seconds":null}]}]}}'
  const tpl = ex => ({ id: ex === squat ? 'SQ' : 'LC', type: 'weight_reps' })

  it('leaves the fingerprint of a workout as it was before set times and the gym went', () => {
    expect(pending({ ...GS, workouts: [{ ...ticked(), id: 'x' }] }, { base: {}, out: { w: {} } }).workouts[0].h).toBe(PRINT)
    const d = workoutDraft(ticked(), 'kg', GS)
    expect(d.gym).toBeTruthy()
    expect(fingerprint(bare(d))).toBe(PRINT)
    // bare() takes off only what D143 added.
    expect(JSON.stringify(bare(d))).toBe(JSON.stringify(d, (k, v) => (k === 'gym' || k === 'completed_at' ? undefined : v)))
  })

  it('gives every row of a set that set\'s tick time, and the workout its gym and place', () => {
    const d = workoutDraft(ticked(), 'kg', GS)
    const iso = ms => new Date(T0 + ms).toISOString()
    expect(d.exercises[0].sets.map(s => s.completed_at)).toEqual([iso(60e3), iso(180e3), iso(180e3), iso(300e3), iso(300e3)])
    expect(d.exercises[1].sets.map(s => s.completed_at)).toEqual([iso(620e3)])
    expect(d.gym).toEqual({ id: 'g1', name: 'Lemon Gym', lat: 56.9646269, lng: 24.1186412 })
    expect(workoutDraft(ticked(), 'kg', { ...GS, hvGymPlaces: {} }).gym).toEqual({ id: 'g1', name: 'Lemon Gym' })
    expect(workoutDraft(workout(), 'kg', GS).gym).toBeUndefined()
    expect(workoutDraft(workout(), 'kg', GS).exercises[0].sets[0].completed_at).toBeUndefined()
  })

  it('sends the key-only body byte for byte as before', async () => {
    const S = { ...GS, workouts: [{ ...ticked(), id: 'a' }], routines: [] }
    const st = { base: {}, out: { w: {}, r: {} }, failed: {}, tpl: { [squat]: tpl(squat), [legCurl]: tpl(legCurl) }, folders: {} }
    const calls = []
    await exportOnce(S, st, { call: async (m, p, b) => { calls.push([m, p, b]); return { workout: [{ id: 'H1' }] } }, pages: async () => [] })
    expect(calls.map(c => c[0] + ' ' + c[1])).toEqual(['POST /v1/workouts'])
    expect(JSON.stringify(calls[0][2])).toBe(BODY)
  })

  it('writes the v2 body: the note pinned, each set\'s time, the gym only when there is one, nothing shown on a gym\'s page', () => {
    const body = finish(workoutDraft(workout({ entries: [...ticked().entries, ...workout().entries] }), 'kg', GS), tpl)
    const now = Date.parse('2026-11-19T10:00:00Z')
    const v = v2Workout(body, { titleOf: id => ({ SQ: 'Squat (Barbell)' })[id], workoutId: 'u-1', gymId: 'HG', now })
    expect(v.share_to_strava).toBe(false)
    expect(v.workout).toMatchObject({
      workout_id: 'u-1', title: 'Legs', description: 'good day\nAt Lemon Gym', media: [], start_time: T0 / 1e3, end_time: T0 / 1e3 + 3600,
      apple_watch: false, wearos_watch: false, is_private: false, is_biometrics_public: false, show_on_gym_profile: false,
      gym: { type: 'commercial', gym_id: 'HG' },
    })
    const [sq, lc] = v.workout.exercises
    expect(sq).toMatchObject({ title: 'Squat (Barbell)', exercise_template_id: 'SQ', rest_timer_seconds: null, notes: '', volume_doubling_enabled: false, superset_id: null })
    expect(sq.pinned_notes).toEqual([{ id: expect.stringMatching(/^[0-9a-f-]{36}$/), content: 'belt\nTime 5 min', createdAt: '2026-11-19T10:00:00.000Z' }])
    expect(sq.sets[0]).toEqual({ index: 0, type: 'warmup', weight_kg: 60, reps: 5, distance_meters: null, duration_seconds: null, rpe: null, completed_at: new Date(T0 + 60e3).toISOString() })
    expect(sq.sets.map(s => s.type)).toEqual(['warmup', 'normal', 'dropset', 'normal', 'dropset'])
    expect(lc.title).toBe('')
    // The plain workout's superset and an exercise without a note.
    const [, , sq2, lc2] = v.workout.exercises
    expect([sq2.superset_id, lc2.superset_id]).toEqual([0, 0])
    expect(lc2.pinned_notes).toEqual([])
    expect(sq2.sets[1]).toMatchObject({ type: 'normal', rpe: 8, completed_at: null })
    expect(sq2.sets[2].type).toBe('failure')
    expect('gym' in v2Workout(body, { workoutId: 'u-1' }).workout).toBe(false)
  })

  it('makes the edit\'s body the v2 body less its id', () => {
    const v = v2Workout(finish(workoutDraft(ticked(), 'kg', GS), tpl), { workoutId: 'u-1' })
    const { workout_id, ...rest } = v.workout
    expect(v2Update(v)).toEqual({ workoutUpdate: rest })
    expect('gym' in v2Update(v).workoutUpdate).toBe(false)
  })
})

describe('hevier export to Hevy: what Hevy has no field for goes into the notes (D137)', () => {
  const min = 60e3
  it('the description: own note, then heart rate, the gym without its street, the phase', () => {
    const d = workoutDraft(workout({ hr: { avg: 106.4, max: 145 }, gym: { id: 'g', name: 'Lemon Gym · Andreja Saharova iela 30' }, hvPhase: { p: 'maintaining' } }))
    expect(d.description).toBe('good day\nHeart rate 106 avg, 145 max\nAt Lemon Gym\nPhase: maintaining')
    expect(workoutDraft(workout({ note: '' })).description).toBe(null)
  })

  it('an exercise note: time from the exercise before, holds out of the sets, uneven sides, heart rate per set', () => {
    const d = workoutDraft(workout({ entries: [
      { id: legCurl, sets: [{ w: 40, r: 12, done: true, at: T0 + 10 * min }] },
      { id: squat, note: 'belt', sets: [
        { w: 100, r: 5, done: true, at: T0 + 15 * min, hr: { avg: 121, max: 130 } },
        { mode: 'time', side: 'L', w: 0, sec: 75, done: true, at: T0 + 18 * min },
        { mode: 'time', side: 'R', w: 0, sec: 70, done: true, at: T0 + 19 * min },
        { w: 100, r: 5, done: true, sides: { L: { w: 100, r: 5, done: true, at: T0 + 22 * min }, R: { w: 102.5, r: 4, done: true, at: T0 + 24 * min } }, hr: { avg: 135 } },
        { w: 100, r: 5, done: true, sides: { L: { w: 100, r: 5, done: true }, R: { w: 100, r: 5, done: true } }, at: T0 + 26 * min },
      ] },
    ] }))
    const sq = d.exercises[1]
    expect(d.exercises[0].notes).toBe('Time 10 min')
    expect(sq.notes).toBe('belt\nTime 16 min\nSet 2: hold 75 s L, 70 s R\nSet 3: L 100 kg × 5, R 102.5 kg × 4\nHR 121, 135')
    expect(sq.sets).toHaveLength(3)
    expect(sq.sets.every(s => s.reps > 0)).toBe(true)
  })

  it('superset partners share their span; an exercise of only holds still sends them', () => {
    const d = workoutDraft(workout({ entries: [
      { id: squat, sg: 'a', sets: [{ w: 100, r: 5, done: true, at: T0 + 5 * min }, { w: 100, r: 5, done: true, at: T0 + 9 * min }] },
      { id: legCurl, sg: 'a', sets: [{ w: 40, r: 12, done: true, at: T0 + 7 * min }] },
      { id: '0043', sets: [{ mode: 'time', sec: 30, w: 0, done: true, at: T0 + 12 * min }] },
    ] }))
    expect(d.exercises[0].notes).toBe('Time 9 min')
    expect(d.exercises[1].notes).toBe('Time 7 min')
    expect(d.exercises[2]).toMatchObject({ notes: 'Time 3 min\nSet 1: hold 30 s' })
    expect(d.exercises[2].sets).toHaveLength(1)
  })

  it('an exercise note starts with its brand and cable setup, a cable\'s 1:1 too', () => {
    const d = workoutDraft(workout({ entries: [
      { id: '0007', hvBrand: 'LifeFitness', hvCable: 'x2', sets: [{ w: 40, r: 10, done: true }] },
      { id: '0007', sets: [{ w: 40, r: 10, done: true }] },
      { id: squat, hvBrand: 'Hammer', sets: [{ w: 100, r: 5, done: true }] },
    ] }))
    expect(d.exercises.map(e => e.notes)).toEqual(['LifeFitness · cable ×2', 'Cable 1:1', 'Hammer'])
  })

  it('the own note stays whole; added lines that would pass 280 characters are left off from the last', () => {
    const own = 'x'.repeat(250)
    const d = workoutDraft(workout({ note: own, hr: { avg: 100, max: 150 }, gym: { name: 'A gym with a long name' } }))
    expect(d.description).toBe(own + '\nHeart rate 100 avg, 150 max')
  })
})

describe('hevier export to Hevy: what is pending (D34)', () => {
  const S = () => ({ unit: 'kg', workouts: [workout({ id: 'old' })], routines: [{ id: 'R', name: 'Legs', ex: [{ id: squat, sets: 3, reps: 5, weight: 100, mode: 'reps' }] }] })

  it('names the gym the exercises were tagged with, when the workout started at another', () => {
    const s = { ...S(), equipProfiles: [{ id: 'g1', name: 'Lemon Gym · Grostonas iela 1' }, { id: 'g2', name: 'myfitness · Tīnūžu iela 2' }] }
    const st = { base: baseline(s), out: { w: {}, r: {} }, failed: {} }
    const e = workout().entries.map(x => ({ ...x, hvGym: 'g2' }))
    s.workouts.push(workout({ id: 'new', note: '', gym: { id: 'g1', name: 'Lemon Gym · Grostonas iela 1' }, entries: e }))
    expect(pending(s, st).workouts[0].draft.description).toBe('At myfitness')
  })

  it('sends only what came after the switch, never an imported workout, and an edit as an update', () => {
    const s = S()
    const st = { base: baseline(s), out: { w: {}, r: {} }, failed: {} }
    expect(pending(s, st)).toEqual({ workouts: [], routines: [] })
    s.workouts.push(workout({ id: 'new' }), workout({ id: 'iwHevy' }))
    expect(isImported({ id: 'iwHevy' })).toBe(true)
    const p = pending(s, st)
    expect(p.workouts.map(i => [i.id, i.hevyId])).toEqual([['new', null]])
    st.out.w.new = { id: 'H1', h: p.workouts[0].h }
    expect(pending(s, st).workouts).toEqual([])
    s.workouts[1].note = 'edited'
    expect(pending(s, st).workouts.map(i => [i.id, i.hevyId])).toEqual([['new', 'H1']])
  })

  it('never sends a workout finished before the switch that reaches the phone later (a sync, a merge)', () => {
    const s = S()
    const st = { since: T0 + 7200e3, base: baseline(s), out: { w: {}, r: {} }, failed: {} }
    s.workouts.push(workout({ id: 'synced' }), workout({ id: 'later', start: T0 + 8000e3, end: T0 + 9000e3 }))
    expect(pending(s, st).workouts.map(i => i.id)).toEqual(['later'])
  })

  it('sends a routine once it changes, to its Hevy twin when it has one; a refused one waits for a change', () => {
    const s = S()
    const st = { base: baseline(s), out: { w: {}, r: {} }, failed: {} }
    s.routines[0].ex[0].reps = 6
    s.routines[0].hevyId = 'hr9'
    const [item] = pending(s, st).routines
    expect(item).toMatchObject({ id: 'R', hevyId: 'hr9' })
    st.failed.R = item.h
    expect(pending(s, st).routines).toEqual([])
    s.routines[0].ex[0].reps = 7
    expect(pending(s, st).routines).toHaveLength(1)
    s.routines.push({ id: 'N', name: 'New', ex: [{ id: squat, sets: 1, reps: 1, weight: 1, mode: 'reps' }] })
    expect(pending(s, st).routines.map(i => [i.id, i.hevyId])).toEqual([['R', 'hr9'], ['N', null]])
  })
})

describe('hevier export to Hevy: templates (D34)', () => {
  const hevyOf = id => Object.keys(HEVY_ID_MAP).find(k => HEVY_ID_MAP[k] === id)

  it('finds the template each exercise came from, by your pick, the fix table, an import, upstream\'s map or the title', () => {
    const sq = hevyOf(squat)
    expect(sq).toBeTruthy()
    const templates = [
      { id: sq, title: 'Squat (Barbell)', type: 'weight_reps' },
      { id: 'SLC', title: 'Seated Leg Curl (Machine)', type: 'weight_reps' },
      { id: 'C1', title: 'Grip Crusher', type: 'reps_only', is_custom: true },
      { id: 'C2', title: 'My Plank', type: 'duration', is_custom: true },
      { id: 'C3', title: 'Odd Lift', type: 'weight_reps', is_custom: true },
    ]
    const S = {
      customEx: [{ id: importId('im', 'Hevy|C1'), n: 'grip crusher', custom: true }, { id: 'cx1', n: 'my plank', custom: true }],
      exAliases: { '0463': ['Odd Lift'] },
    }
    const find = templateFinder(templates, S)
    expect(find(squat)).toEqual({ id: sq, type: 'weight_reps' })
    expect(find(legCurl)).toEqual({ id: 'SLC', type: 'weight_reps' })
    expect(find(importId('im', 'Hevy|C1'))).toEqual({ id: 'C1', type: 'reps_only' })
    expect(find('cx1')).toEqual({ id: 'C2', type: 'duration' })
    expect(find('0463')).toEqual({ id: 'C3', type: 'weight_reps' })
    expect(find('nope')).toBe(null)
  })

  it('a custom template named like a built-in leaves the title map\'s exercise to the built-in', () => {
    const [title, id] = Object.entries(HEVY_TITLE_MAP).find(([, v]) => hevyOf(v) && EXIDX[v])
    const templates = [
      { id: 'CU', title, type: 'weight_reps', is_custom: true },
      { id: hevyOf(id), title, type: 'weight_reps' },
    ]
    expect(templateFinder(templates, {})(id)?.id).toBe(hevyOf(id))
  })

  it('a template named with a brand goes for that brand only, found as the import finds it', () => {
    const sq = hevyOf(squat)
    const templates = [
      { id: 'B1', title: 'Squat (Barbell) (brand: Eleiko)', type: 'weight_reps', is_custom: true },
      { id: 'B2', title: 'Squat (Barbell) (Rogue)', type: 'weight_reps', is_custom: true },
      { id: sq, title: 'Squat (Barbell)', type: 'weight_reps' },
    ]
    const find = templateFinder(templates, {})
    expect(find(squat)).toEqual({ id: sq, type: 'weight_reps' })
    expect(find(squat, 'Eleiko')).toEqual({ id: 'B1', type: 'weight_reps' })
    expect(find(squat, 'rogue')).toEqual({ id: 'B2', type: 'weight_reps' })
    expect(find(squat, 'Life Fitness')).toEqual({ id: sq, type: 'weight_reps' })
    const d = workoutDraft(workout({ entries: [{ id: squat, hvBrand: 'Eleiko', sets: [{ w: 100, r: 5, done: true }] }] }))
    expect(finish(d, find).exercises[0].exercise_template_id).toBe('B1')
  })

  it('a brand\'s cable setup and one-limb title are labels of their own (the user\'s LifeFitness templates)', () => {
    const titles = ['Lat Pulldown (Cable) (x2) (brand:LifeFitness)', 'Leg Press (Machine) (brand:LifeFitness)', 'Single Leg Press (Machine) (brand:LifeFitness)']
    const find = templateFinder(titles.map((title, i) => ({ id: 'L' + i, title, type: 'weight_reps', is_custom: true })), {})
    const tpl = e => finish(workoutDraft(workout({ entries: [e] })), find).exercises[0].exercise_template_id
    const set = { w: 50, r: 10, done: true }
    const side = makeSideSet({ w: 50, r: 20 })
    side.sides.L.done = side.sides.R.done = true
    expect(tpl({ id: '0150', hvBrand: 'LifeFitness', hvCable: 'x2', sets: [set] })).toBe('L0')
    expect(tpl({ id: '0739', hvBrand: 'LifeFitness', sets: [set] })).toBe('L1')
    expect(tpl({ id: '0739', hvBrand: 'LifeFitness', sets: [{ ...side, done: true }] })).toBe('L2')
  })

  it('makes a custom template from the exercise: its name, equipment, muscles and type', () => {
    expect(newTemplate(EXIDX[legCurl], [{ weight_kg: 40, reps: 10 }])).toEqual({
      title: 'Lever Seated Leg Curl', exercise_type: 'weight_reps', equipment_category: 'machine',
      muscle_group: 'hamstrings', other_muscles: ['calves', 'adductors'],
    })
    expect(newTemplate({ id: 'c', n: 'band thing', eq: 'resistance band', tg: 'upper-back', custom: true }, [{ reps: 10 }]))
      .toMatchObject({ exercise_type: 'bodyweight_reps', equipment_category: 'resistance_band', muscle_group: 'upper_back' })
    expect(newTemplate({ id: 'c', n: 'hold', eq: 'body weight' }, [{ duration_seconds: 30, reps: null }]))
      .toMatchObject({ exercise_type: 'duration', muscle_group: 'other' })
  })

  it('puts the template ids in and leaves out what the template\'s type does not take', () => {
    const d = workoutDraft(workout({ entries: [{ id: squat, sets: [{ w: 100, r: 5, done: true, rpe: 8 }] }] }))
    const body = finish(d, () => ({ id: 'D1', type: 'duration' }))
    expect(body.exercises[0]).toMatchObject({ exercise_template_id: 'D1' })
    expect(body.exercises[0].ex).toBeUndefined()
    expect(body.exercises[0].sets[0]).toEqual({ type: 'normal', weight_kg: null, reps: null, distance_meters: null, duration_seconds: null })
    const r = finish(routineDraft({ id: 'R', name: 'X', folder: 'F', ex: [{ id: squat, sets: 1, reps: 12, repsMin: 8, prog: 'double', weight: 50, mode: 'reps' }] }), () => ({ id: 'D2', type: 'weight_reps' }))
    expect(r.folder).toBeUndefined()
    expect(r.exercises[0].sets[0]).toMatchObject({ reps: null, rep_range: { start: 8, end: 12 } })
  })
})

describe('hevier export to Hevy: one pass (D34)', () => {
  const setup = () => {
    const S = { unit: 'kg', customEx: [{ id: 'cx', n: 'my thing', eq: 'cable', tg: 'chest', custom: true }], workouts: [], routines: [] }
    const st = { base: baseline(S), out: { w: {}, r: {} }, failed: {}, tpl: {}, folders: {} }
    const calls = []
    let n = 0
    const replies = {}
    const call = async (m, p, b) => {
      calls.push([m, p, b])
      const r = replies[m + ' ' + p]
      if (r instanceof Error) throw r
      if (r) return r
      if (p === '/v1/exercise_templates') return { id: 77 }
      if (p === '/v1/workouts') return { workout: [{ id: 'HW' + (++n) }] }
      if (p === '/v1/routines') return { routine: { id: 'HR' + (++n) } }
      if (p === '/v1/routine_folders') return { routine_folder: { id: 5, title: b.routine_folder.title } }
      return {}
    }
    const pages = async p => (p === '/v1/routine_folders' ? [{ id: 3, title: 'PPL' }] : [{ id: hevyOf(squat), title: 'Squat (Barbell)', type: 'weight_reps' }])
    return { S, st, calls, call, pages, replies }
  }
  const hevyOf = id => Object.keys(HEVY_ID_MAP).find(k => HEVY_ID_MAP[k] === id)

  it('creates a missing template once, posts a new workout and then updates it', async () => {
    const { S, st, calls, call, pages } = setup()
    S.workouts.push(workout({ id: 'a', entries: [{ id: squat, sets: [{ w: 100, r: 5, done: true }] }, { id: 'cx', sets: [{ w: 20, r: 10, done: true }] }] }))
    expect(await exportOnce(S, st, { call, pages })).toEqual({ sent: 1, refused: 0, error: null })
    expect(calls.map(c => c[0] + ' ' + c[1])).toEqual(['POST /v1/exercise_templates', 'POST /v1/workouts'])
    expect(calls[0][2].exercise).toMatchObject({ title: 'My Thing', equipment_category: 'machine', muscle_group: 'chest' })
    expect(calls[1][2].workout.exercises.map(e => e.exercise_template_id)).toEqual([hevyOf(squat), '77'])
    expect(st.out.w.a.id).toBe('HW1')
    S.workouts[0].name = 'Renamed'
    calls.length = 0
    await exportOnce(S, st, { call, pages })
    expect(calls.map(c => c[0] + ' ' + c[1])).toEqual(['PUT /v1/workouts/HW1'])
    expect(await exportOnce(S, st, { call, pages })).toEqual({ sent: 0, refused: 0, error: null })
  })

  it('sends a branded set as the brand\'s own template, and the plain one while Hevy has none', async () => {
    const { S, st, calls, call } = setup()
    let titles = [{ id: hevyOf(squat), title: 'Squat (Barbell)', type: 'weight_reps' }]
    const pages = async () => titles
    S.workouts.push(workout({ id: 'a', entries: [{ id: squat, hvBrand: 'Eleiko', sets: [{ w: 100, r: 5, done: true }] }] }))
    await exportOnce(S, st, { call, pages })
    expect(calls.at(-1)[2].workout.exercises[0].exercise_template_id).toBe(hevyOf(squat))
    titles = [...titles, { id: 'B1', title: 'Squat (Barbell) (brand: Eleiko)', type: 'weight_reps', is_custom: true }]
    S.workouts.push(workout({ id: 'b', start: T0 + 86400e3, end: T0 + 90000e3, entries: [{ id: squat, hvBrand: 'Eleiko', sets: [{ w: 100, r: 5, done: true }] }] }))
    await exportOnce(S, st, { call, pages })
    expect(calls.at(-1)[2].workout.exercises[0].exercise_template_id).toBe('B1')
  })

  it('creates a new routine in its folder and gives it its Hevy id; a refused one is set aside', async () => {
    const { S, st, calls, call, pages, replies } = setup()
    S.routines.push({ id: 'R', name: 'Push', folder: 'PPL', ex: [{ id: squat, sets: 1, reps: 5, weight: 100, mode: 'reps' }] },
      { id: 'Q', name: 'Pull', folder: 'Back', ex: [{ id: squat, sets: 1, reps: 5, weight: 90, mode: 'reps' }] })
    replies['POST /v1/routines'] = null
    let made = 0
    const call2 = async (m, p, b) => {
      if (p === '/v1/routines' && made++ === 1) { calls.push([m, p, b]); throw new HevyApiError(403, 'http 403') }
      return call(m, p, b)
    }
    const applied = []
    const apply = fn => { fn(S); applied.push(1) }
    expect(await exportOnce(S, st, { call: call2, pages, apply })).toEqual({ sent: 1, refused: 1, error: null })
    expect(calls.find(c => c[1] === '/v1/routine_folders')[2]).toEqual({ routine_folder: { title: 'Back' } })
    const posts = calls.filter(c => c[1] === '/v1/routines').map(c => c[2].routine.folder_id)
    expect(posts).toEqual([3, 5])
    expect(S.routines[0]).toMatchObject({ hevyId: 'HR1', hvHevyFolder: 'PPL' })
    expect(S.routines[1].hevyId).toBeUndefined()
    expect(st.failed.Q).toBeTruthy()
    expect(pending(S, st).routines).toEqual([])
  })

  it('turned off while a pass runs, it makes no further call and its saves keep it off', async () => {
    const { S, st, calls, call, pages } = setup()
    st.on = true
    S.workouts.push(workout({ id: 'a', entries: [{ id: squat, sets: [{ w: 100, r: 5, done: true }] }] }),
      workout({ id: 'b', start: T0 + 86400e3, end: T0 + 90000e3, entries: [{ id: squat, sets: [{ w: 100, r: 5, done: true }] }] }))
    const saved = []
    const res = await exportOnce(S, st, { call: async (...a) => { const r = await call(...a); st.on = false; return r }, pages, save: async s => saved.push(s.on) })
    expect(calls.filter(([m, p]) => m === 'POST' && p === '/v1/workouts')).toHaveLength(1)
    expect(res.sent).toBe(1)
    expect(saved.at(-1)).toBe(false)
  })

  it('a workout whose POST timed out is looked for in Hevy before it is posted again', async () => {
    const { S, st, calls, call, pages, replies } = setup()
    S.workouts.push(workout({ id: 'a', entries: [{ id: squat, sets: [{ w: 100, r: 5, done: true }] }] }),
      workout({ id: 'b', start: T0 + 86400e3, end: T0 + 90000e3, entries: [{ id: squat, sets: [{ w: 100, r: 5, done: true }] }] }))
    replies['POST /v1/workouts'] = new HevyApiError(0, 'offline')
    expect((await exportOnce(S, st, { call, pages })).error).toBe('offline')
    const start = calls.find(c => c[1] === '/v1/workouts')[2].workout.start_time
    delete replies['POST /v1/workouts']
    // The first one reached Hevy after all; the second was never tried.
    replies['GET /v1/workouts?page=1&pageSize=10'] = { workouts: [{ id: 'HX', start_time: start.replace('.000Z', 'Z') }] }
    calls.length = 0
    expect(await exportOnce(S, st, { call, pages })).toEqual({ sent: 2, refused: 0, error: null })
    expect(calls.map(c => c[0] + ' ' + c[1])).toEqual(['GET /v1/workouts?page=1&pageSize=10', 'PUT /v1/workouts/HX', 'POST /v1/workouts'])
    expect(st.out.w.a.id).toBe('HX')
    expect(st.unsure).toEqual({})
  })

  it('a timed-out workout is found in Hevy, which keeps its start to the second', async () => {
    const { S, st, calls, call, pages, replies } = setup()
    S.workouts.push(workout({ id: 'a', start: T0 + 897, entries: [{ id: squat, sets: [{ w: 100, r: 5, done: true }] }] }))
    replies['POST /v1/workouts'] = new HevyApiError(0, 'offline')
    await exportOnce(S, st, { call, pages })
    delete replies['POST /v1/workouts']
    replies['GET /v1/workouts?page=1&pageSize=10'] = { workouts: [{ id: 'HX', start_time: new Date(T0).toISOString().replace('.000Z', '+00:00') }] }
    calls.length = 0
    await exportOnce(S, st, { call, pages })
    expect(calls.map(c => c[0] + ' ' + c[1])).toEqual(['GET /v1/workouts?page=1&pageSize=10', 'PUT /v1/workouts/HX'])
  })

  it('a timed-out workout Hevy does not have is posted again', async () => {
    const { S, st, calls, call, pages, replies } = setup()
    S.workouts.push(workout({ id: 'a', entries: [{ id: squat, sets: [{ w: 100, r: 5, done: true }] }] }))
    replies['POST /v1/workouts'] = new HevyApiError(0, 'offline')
    await exportOnce(S, st, { call, pages })
    delete replies['POST /v1/workouts']
    replies['GET /v1/workouts?page=1&pageSize=10'] = { workouts: [{ id: 'OTHER', start_time: '2020-01-01T00:00:00Z' }] }
    calls.length = 0
    await exportOnce(S, st, { call, pages })
    expect(calls.map(c => c[0] + ' ' + c[1])).toEqual(['GET /v1/workouts?page=1&pageSize=10', 'POST /v1/workouts'])
    expect(st.out.w.a.id).toMatch(/^HW/)
  })

  it('stops at a refused key or the rate limit, keeping what was sent', async () => {
    const { S, st, call, pages, replies } = setup()
    S.workouts.push(workout({ id: 'a', entries: [{ id: squat, sets: [{ w: 100, r: 5, done: true }] }] }),
      workout({ id: 'b', start: T0 + 86400e3, end: T0 + 90000e3, entries: [{ id: squat, sets: [{ w: 100, r: 5, done: true }] }] }))
    let k = 0
    const call2 = async (m, p, b) => { if (p === '/v1/workouts' && k++) throw new HevyApiError(429, 'rate-limit'); return call(m, p, b) }
    expect(await exportOnce(S, st, { call: call2, pages })).toEqual({ sent: 1, refused: 0, error: 'rate' })
    expect(Object.keys(st.out.w)).toEqual(['a'])
    expect(pending(S, st).workouts.map(i => i.id)).toEqual(['b'])
    replies['POST /v1/workouts'] = new HevyApiError(401, 'auth')
    expect((await exportOnce(S, st, { call, pages })).error).toBe('auth')
  })

  it('a create answered without an id is refused, not kept as sent with no id', async () => {
    const { S, st, call, pages, replies } = setup()
    S.workouts.push(workout({ id: 'a', entries: [{ id: squat, sets: [{ w: 100, r: 5, done: true }] }] }))
    replies['POST /v1/workouts'] = { workout: [{}] }
    expect(await exportOnce(S, st, { call, pages })).toEqual({ sent: 0, refused: 1, error: null })
    expect(st.out.w.a).toBeUndefined()
    expect(pending(S, st).workouts).toEqual([])
  })

  it('sends a workout again as new when Hevy no longer has it', async () => {
    const { S, st, calls, call, pages, replies } = setup()
    S.workouts.push(workout({ id: 'a', entries: [{ id: squat, sets: [{ w: 100, r: 5, done: true }] }] }))
    st.out.w.a = { id: 'GONE', h: 'x' }
    st.tpl[squat] = { id: 'T', type: 'weight_reps' }
    replies['PUT /v1/workouts/GONE'] = new HevyApiError(404, 'http 404')
    await exportOnce(S, st, { call, pages })
    expect(calls.map(c => c[0] + ' ' + c[1])).toEqual(['PUT /v1/workouts/GONE', 'POST /v1/workouts'])
    expect(st.out.w.a.id).toBe('HW1')
  })
})

describe('hevier export to Hevy: the private web API and the repair (D138)', () => {
  const find = S => templateFinder(builtinTemplates(), S)

  it('sends an exercise the import never gives as the Hevy exercise of the export table', () => {
    const f = find({})
    for (const [ex, hevy] of Object.entries(EXPORT_FIXES)) expect(f(ex)?.id).toBe(hevy)
    // the reverse import mapping still comes first: the built-ins carry every mapped template
    expect(HEVY_ID_MAP[f(squat)?.id]).toBe(squat)
  })

  it('writes the old PUT /workout body an edit still makes: camelCase, seconds, every measure, the type as indicator', () => {
    const body = finish(workoutDraft(workout()), ex => ({ id: ex === squat ? 'SQ' : 'LC', type: 'weight_reps' }))
    const w = webWorkout(body, { titleOf: id => ({ SQ: 'Squat (Barbell)' })[id], clientId: 'c-1' })
    expect(w.emptyResponse).toBe(false)
    expect(w.workout).toMatchObject({ clientId: 'c-1', name: 'Legs', isPrivate: false, startTime: T0 / 1e3, endTime: T0 / 1e3 + 3600, imageUrls: [] })
    const [sq, lc] = w.workout.exercises
    expect(sq).toMatchObject({ id: 'SQ', title: 'Squat (Barbell)', supersetId: 0, notes: 'belt' })
    expect(lc).toMatchObject({ id: 'LC', title: '', supersetId: 0 })
    expect(sq.sets[0]).toEqual({ index: 0, completed: true, indicator: 'warmup', weight: 60, reps: 5, distance: null, duration: null, rpe: null })
    expect(sq.sets[1]).toMatchObject({ index: 1, indicator: 'normal', weight: 100, reps: 5, rpe: 8 })
    expect(sq.sets[2]).toMatchObject({ indicator: 'failure', rpe: 10 })
    expect(lc.sets.map(s => [s.indicator, s.weight, s.reps])).toEqual([['normal', 40, 12], ['dropset', 30, 8]])
    for (const s of [...sq.sets, ...lc.sets]) expect(Object.keys(s).sort()).toEqual(['completed', 'distance', 'duration', 'index', 'indicator', 'reps', 'rpe', 'weight'])
  })

  it('marks for rewriting the sent workouts with a branded template or a template that changed', () => {
    const S = { unit: 'kg', workouts: [
      workout({ id: 'plain', entries: [{ id: squat, sets: [{ w: 100, r: 5, done: true }] }] }),
      workout({ id: 'brand', entries: [{ id: squat, hvBrand: 'Eleiko', sets: [{ w: 100, r: 5, done: true }] }] }),
      workout({ id: 'table', entries: [{ id: '2950', sets: [{ w: 80, r: 8, done: true }] }] }),
      workout({ id: 'unsent', entries: [{ id: '2950', sets: [{ w: 80, r: 8, done: true }] }] }),
    ] }
    const st = {
      out: { w: { plain: { id: 'H1', h: 'x' }, brand: { id: 'H2', h: 'x' }, table: { id: 'H3', h: 'x' } } },
      tpl: { [squat]: { id: find(S)(squat).id }, [squat + '|eleiko']: { id: 'B1' }, 2950: { id: 'CUSTOM' } },
    }
    const marks = repairMarks(S, st, find(S))
    expect(marks.tpl).toEqual({ 2950: expect.objectContaining({ id: EXPORT_FIXES[2950] }) })
    expect(marks.workouts.sort()).toEqual(['brand', 'table'])
  })

  it('leaves a workout on the Hevy exercise it went as, when Hevy has several for one exercise', () => {
    const f = find({})
    const now = f(squat).id
    const other = Object.keys(HEVY_ID_MAP).find(k => HEVY_ID_MAP[k] === squat && k !== now && builtinTemplates().some(t => t.id === k))
    expect(other).toBeTruthy()
    const S = { unit: 'kg', workouts: [workout({ id: 'sq', entries: [{ id: squat, sets: [{ w: 100, r: 5, done: true }] }] })] }
    const st = { out: { w: { sq: { id: 'H1', h: 'x' } } }, tpl: { [squat]: { id: other } } }
    expect(repairMarks(S, st, f)).toEqual({ tpl: {}, workouts: [] })
  })
})

describe('hevier export to Hevy: the v2 routes and the gym (D143)', () => {
  const tpl = { [squat]: { id: 'SQ', type: 'weight_reps' }, [legCurl]: { id: 'LC', type: 'weight_reps' } }
  const setup = (w = ticked()) => {
    const S = { ...GS, workouts: [{ ...w, id: 'a' }], routines: [] }
    const st = { base: {}, out: { w: {}, r: {} }, failed: {}, tpl: { ...tpl }, folders: {} }
    const calls = []
    const replies = {}
    const web = async (m, p, b) => {
      calls.push([m, p, b])
      const r = replies[m + ' ' + p]
      if (r instanceof Error) throw r
      if (r !== undefined) return r
      if (m === 'POST' && p === '/v2/workout') return { id: b.workout.workout_id }
      if (p === '/custom_exercise_templates') return []
      return null
    }
    return { S, st, calls, replies, web, keys: () => calls.map(c => c[0] + ' ' + c[1]).filter(k => !k.includes('custom_exercise')) }
  }
  const lemon = { id: 77, name: 'Lemon Gym', full_address: 'Grostonas iela 1', city: 'Riga', latitude: 56.9645, longitude: 24.1180 }
  const pla = { id: 78, name: 'Lemon Gym Pļavnieki', latitude: 56.9455, longitude: 24.2094 }

  it('creates with a uuid it makes, at the Hevy gym near the gym\'s place, and asks for gyms no more once found', async () => {
    const { S, st, calls, replies, web, keys } = setup()
    replies['GET /gyms/visited'] = [pla, lemon]
    expect(await exportOnce(S, st, { web })).toEqual({ sent: 1, refused: 0, error: null })
    expect(keys()).toEqual(['GET /gyms/visited', 'POST /v2/workout'])
    const sent = calls.find(c => c[1] === '/v2/workout')[2]
    expect(sent.workout.gym).toEqual({ type: 'commercial', gym_id: 77 })
    expect(sent.workout.workout_id).toMatch(/^[0-9a-f-]{36}$/)
    expect(st.out.w.a.id).toBe(sent.workout.workout_id)
    expect(st.gyms).toEqual({ g1: 77 })
    S.workouts.push({ ...ticked(), id: 'b', start: T0 + 86400e3, end: T0 + 90000e3 })
    calls.length = 0
    await exportOnce(S, st, { web })
    expect(keys()).toEqual(['POST /v2/workout'])
    expect(calls.at(-1)[2].workout.gym.gym_id).toBe(77)
  })

  it('looks among the gyms near the place when the account has none there, once a pass for each gym', async () => {
    const { S, st, calls, replies, web, keys } = setup()
    S.workouts.push({ ...ticked(), id: 'b', start: T0 + 86400e3, end: T0 + 90000e3 })
    replies['GET /gyms/visited'] = { gyms: [pla] }
    replies['GET /gyms/popular?latitude=56.9646269&longitude=24.1186412'] = []
    await exportOnce(S, st, { web })
    expect(keys()).toEqual(['GET /gyms/visited', 'GET /gyms/popular?latitude=56.9646269&longitude=24.1186412', 'POST /v2/workout', 'POST /v2/workout'])
    expect(calls.filter(c => c[1] === '/v2/workout').every(c => !('gym' in c[2].workout))).toBe(true)
    expect(st.gyms).toBeUndefined()
    // A miss is not kept: the next pass asks again, and finds it.
    S.workouts[0].name = 'Renamed'
    replies['GET /gyms/popular?latitude=56.9646269&longitude=24.1186412'] = [lemon]
    calls.length = 0
    await exportOnce(S, st, { web })
    expect(st.gyms).toEqual({ g1: 77 })
  })

  it('a gym without a place goes only by a single name among the visited gyms', async () => {
    const { S, st, calls, replies, web, keys } = setup()
    S.hvGymPlaces = {}
    replies['GET /gyms/visited'] = [lemon, pla]       // "Lemon Gym" is in both names: not clear
    await exportOnce(S, st, { web })
    expect(keys()).toEqual(['GET /gyms/visited', 'POST /v2/workout'])
    expect('gym' in calls.at(-1)[2].workout).toBe(false)
  })

  it('a gym list answering 500 still sends the workout, with no gym', async () => {
    const { S, st, calls, replies, web, keys } = setup()
    replies['GET /gyms/visited'] = new HevyApiError(500, 'http 500')
    expect(await exportOnce(S, st, { web })).toEqual({ sent: 1, refused: 0, error: null })
    expect(keys()).toEqual(['GET /gyms/visited', 'POST /v2/workout'])
    expect('gym' in calls.at(-1)[2].workout).toBe(false)
  })

  it('a failed gym lookup sends the workout without a gym; one that stops the pass stops it', async () => {
    const { S, st, calls, replies, web } = setup()
    replies['GET /gyms/visited'] = new HevyApiError(403, 'http 403')
    replies['GET /gyms/popular?latitude=56.9646269&longitude=24.1186412'] = new HevyApiError(404, 'http 404')
    expect(await exportOnce(S, st, { web })).toEqual({ sent: 1, refused: 0, error: null })
    expect('gym' in calls.at(-1)[2].workout).toBe(false)
    const b = setup()
    b.replies['GET /gyms/visited'] = new HevyApiError(429, 'rate-limit')
    expect(await exportOnce(b.S, b.st, { web: b.web })).toEqual({ sent: 0, refused: 0, error: 'rate' })
    expect(b.st.failed).toEqual({})
  })

  it('a create with no answer goes again with the same uuid, and a 409 then means it landed', async () => {
    const { S, st, calls, replies, web, keys } = setup(workout({ entries: [{ id: squat, sets: [{ w: 100, r: 5, done: true }] }] }))
    replies['POST /v2/workout'] = new HevyApiError(0, 'offline')
    expect((await exportOnce(S, st, { web })).error).toBe('offline')
    const wid = calls.at(-1)[2].workout.workout_id
    expect(st.unsure).toEqual({ a: wid })
    replies['POST /v2/workout'] = new HevyApiError(409, 'http 409')
    calls.length = 0
    expect(await exportOnce(S, st, { web })).toEqual({ sent: 1, refused: 0, error: null })
    // Then edited to what the workout is now, as an edit is.
    expect(keys()).toEqual(['POST /v2/workout', 'PUT /workout', 'PUT /v2/workout/' + wid])
    expect(calls.find(c => c[1] === '/v2/workout')[2].workout.workout_id).toBe(wid)
    expect(st.out.w.a.id).toBe(wid)
    expect(st.unsure).toEqual({})
  })

  it('a 409 on a fresh uuid is refused, not taken as sent', async () => {
    const { S, st, replies, web } = setup(workout({ entries: [{ id: squat, sets: [{ w: 100, r: 5, done: true }] }] }))
    replies['POST /v2/workout'] = new HevyApiError(409, 'http 409')
    expect(await exportOnce(S, st, { web })).toEqual({ sent: 0, refused: 1, error: null })
    expect(st.out.w.a).toBeUndefined()
  })

  it('an edit makes the old PUT (start and end) then the v2 one (set times), and leaves the gym alone when none matches', async () => {
    const { S, st, calls, replies, web, keys } = setup()
    st.out.w.a = { id: 'HW', h: 'old' }
    replies['GET /gyms/visited'] = []
    replies['GET /gyms/popular?latitude=56.9646269&longitude=24.1186412'] = []
    await exportOnce(S, st, { web })
    expect(keys()).toEqual(['GET /gyms/visited', 'GET /gyms/popular?latitude=56.9646269&longitude=24.1186412', 'PUT /workout', 'PUT /v2/workout/HW'])
    const [old, v2] = calls.filter(c => c[0] === 'PUT').map(c => c[2])
    expect(old.workout_id).toBe('HW')
    expect(old.workout.startTime).toBe(T0 / 1e3)
    expect(Object.keys(v2)).toEqual(['workoutUpdate'])
    expect('gym' in v2.workoutUpdate).toBe(false)
    expect('workout_id' in v2.workoutUpdate).toBe(false)
    expect(v2.workoutUpdate.exercises[0].sets[0].completed_at).toBe(new Date(T0 + 60e3).toISOString())
    expect(st.out.w.a.h).not.toBe('old')
  })

  it('an edit is kept as sent only once both calls went', async () => {
    const { S, st, replies, web } = setup()
    st.out.w.a = { id: 'HW', h: 'old' }
    st.gyms = { g1: 77 }
    replies['PUT /v2/workout/HW'] = new HevyApiError(500, 'http 500')
    expect((await exportOnce(S, st, { web })).error).toBe('failed')
    expect(st.out.w.a.h).toBe('old')
  })

  it('a timed-out send from before D143 is still looked for by its start, in seconds', async () => {
    const { S, st, replies, web, keys } = setup(workout({ start: T0 + 897, entries: [{ id: squat, sets: [{ w: 100, r: 5, done: true }] }] }))
    st.unsure = { a: 1 }
    replies['GET /account'] = { username: 'me' }
    replies['GET /user_workouts_paged?username=me&limit=5&offset=0'] = { workouts: [{ id: 'TW', start_time: T0 / 1e3 }] }
    await exportOnce(S, st, { web })
    expect(keys()).toEqual(['GET /account', 'GET /user_workouts_paged?username=me&limit=5&offset=0', 'PUT /workout', 'PUT /v2/workout/TW'])
    expect(st.out.w.a.id).toBe('TW')
  })

  it('the repair rewrites a workout through both calls', async () => {
    const { S, st, web, keys } = setup()
    st.out.w.a = { id: 'HW', h: 'repair' }
    st.gyms = { g1: 77 }
    expect(await exportOnce(S, st, { web })).toEqual({ sent: 1, refused: 0, error: null })
    expect(keys()).toEqual(['PUT /workout', 'PUT /v2/workout/HW'])
    expect(st.out.w.a).toEqual({ id: 'HW', h: pending(S, { base: {}, out: { w: {} } }).workouts[0].h })
  })
})
