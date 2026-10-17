import { describe, expect, it } from 'vitest'
import { rpeOf, workoutDraft, routineDraft, fingerprint, baseline, pending, templateFinder, newTemplate, finish, isImported } from './hevy-export.js'
import { exportOnce } from './hevy-export-sync.js'
import { HevyApiError, HEVY_ID_MAP } from '../../lib/import-hevy.js'
import { importId } from '../../lib/import-csv.js'
import { EXIDX } from '../../lib/exercises.js'

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

  it('a fingerprint changes with what Hevy would show, not with a sync stamp or a heart rate', () => {
    const a = fingerprint(workoutDraft(workout()))
    expect(fingerprint(workoutDraft(workout({ _ts: 9, hr: { avg: 120 } })))).toBe(a)
    expect(fingerprint(workoutDraft(workout({ name: 'Leg day' })))).not.toBe(a)
  })
})

describe('hevier export to Hevy: what is pending (D34)', () => {
  const S = () => ({ unit: 'kg', workouts: [workout({ id: 'old' })], routines: [{ id: 'R', name: 'Legs', ex: [{ id: squat, sets: 3, reps: 5, weight: 100, mode: 'reps' }] }] })

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

  it('finds the template each exercise came from, by the review, the fix table, an import, upstream\'s map or the title', () => {
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
      hvImportMap: { 'Hevy|odd lift': '0463' },
    }
    const find = templateFinder(templates, S)
    expect(find(squat)).toEqual({ id: sq, type: 'weight_reps' })
    expect(find(legCurl)).toEqual({ id: 'SLC', type: 'weight_reps' })
    expect(find(importId('im', 'Hevy|C1'))).toEqual({ id: 'C1', type: 'reps_only' })
    expect(find('cx1')).toEqual({ id: 'C2', type: 'duration' })
    expect(find('0463')).toEqual({ id: 'C3', type: 'weight_reps' })
    expect(find('nope')).toBe(null)
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
