import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FIXES, splitBrand, oneLimbOf, importExercise, importDone, readKey } from './hevy-import.js'
import { hooks } from '../hooks.js'
import { EXIDX } from '../../lib/exercises.js'
import { parseImport, mergeImport } from '../../lib/import-csv.js'
import { parseHevyWorkouts, parseHevyRoutines } from '../../lib/import-hevy.js'
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
    ]), { unit: 'kg', customEx: [] })
    const [ext, press, dip, wdip, calf] = entriesOf(p)
    expect(ext.id).toBe('0585')
    expect(ext.sets.every(isSideSet)).toBe(true)
    expect(ext.sets[1]).toMatchObject({ w: 48.75, r: 20, sides: { L: { w: 48.75, r: 10 }, R: { w: 48.75, r: 10 } } })
    expect(ext.sets[0].phase).toBe('warmup')
    expect(press).toMatchObject({ id: '0739', hvBrand: 'LifeFitness' })
    expect(dip.id).toBe('0814')
    expect(wdip.id).toBe('1767')
    // unmatched with a brand: one custom exercise, named without the brand
    expect(calf.hvBrand).toBe('Achilles Rehab')
    expect(p.customEx.find(c => c.id === calf.id)?.n).toBe('calf extension (machine)')
    expect(p.unmatchedNames).toContain('calf extension (machine)')
    // volume counts both sides, warm-ups out
    expect(p.workouts[0].vol).toBe(48.75 * 20 + 100 * 8 + 20 * 8 + 40 * 15)
    // upstream's merge keeps it all
    const S = { workouts: [], customEx: [], bodyweight: [], exWeights: {} }
    mergeImport(S, p)
    expect(S.workouts[0].entries[1].hvBrand).toBe('LifeFitness')
    expect(S.customEx.map(c => c.n)).toEqual(['calf extension (machine)'])
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
