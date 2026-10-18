import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { importExercise, importDone, useChoices } from './hevy-import.js'
import { titlesOf, reviewList, cableList, chooseCable, choose, rerun, keep, choicesFor } from './import-review.js'
import { nameFolders, importHevyFolders } from './hevy-folders.js'
import { hooks } from '../hooks.js'
import { parseImport, mergeImport } from '../../lib/import-csv.js'
import { parseHevyWorkouts, parseHevyRoutines } from '../../lib/import-hevy.js'

const HEAD = '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"'
const row = (ex, i, w, r) => `"Lower A","14 Oct 2026, 16:27","14 Oct 2026, 17:44","","${ex}",,"",${i},"normal",${w},${r},,,`
const CSV = [HEAD, row('Seated Leg Curl (Machine)', 0, 40, 10), row('Qwerty Zorb (Cable)', 0, 10, 12),
  row('Single Leg Extensions', 0, 30, 10), row('Leg Press (Machine) (brand: Hammer)', 0, 100, 8)].join('\n')
const entries = p => p.workouts.flatMap(w => w.entries)

// What the app does: the hook reads the choices in S before each title (hevier/index.js).
let S
const parse = () => {
  const p = parseImport(CSV, { unit: 'kg', customEx: S.customEx })
  keep(p, () => parseImport(CSV, { unit: 'kg', customEx: S.customEx }))
  return p
}

describe('hevier import review (D33)', () => {
  beforeEach(() => {
    S = { unit: 'kg', customEx: [{ id: 'cMine', n: 'my curl', custom: true }], workouts: [], bodyweight: [], exWeights: {} }
    hooks.importExercise = (title, source) => { useChoices(choicesFor(S)); return importExercise(title, source) }
    hooks.importDone = importDone
  })
  afterEach(() => { Object.assign(hooks, { importExercise: null, importDone: null }); useChoices(null) })

  it('lists every title once, own exercises first, with what each becomes', () => {
    const p = parse()
    const list = reviewList(titlesOf(p), S)
    expect(list.map(x => [x.title, x.id])).toEqual([
      ['Qwerty Zorb (Cable)', null],
      ['Leg Press (Machine)', '0739'],
      ['Seated Leg Curl (Machine)', '0599'],
      ['Single Leg Extensions', '7108'],
    ])
    expect(list.every(x => !x.chosen)).toBe(true)
  })

  it('reads the file again with a choice: a library exercise, one\'s own, or back to automatic', () => {
    const p = parse()
    choose(S, 'Hevy|seated leg curl (machine)', '0586')
    choose(S, 'Hevy|qwerty zorb (cable)', 'cMine')
    choose(S, 'Hevy|leg press (machine)', 'custom')
    choose(S, 'Hevy|single leg extensions', '0599')         // a machine: still per side
    rerun(p, S)
    const [curl, back, ext, press] = entries(p)
    expect(curl.id).toBe('0586')
    expect(back.id).toBe('cMine')
    expect(ext).toMatchObject({ id: '0599', sets: [{ r: 20, sides: { L: { r: 10 }, R: { r: 10 } } }] })
    expect(press.hvBrand).toBe('Hammer')
    expect(p.customEx.find(c => c.id === press.id)?.n).toBe('leg press (machine)')
    expect(p.customEx.some(c => c.n === 'qwerty zorb (cable)')).toBe(false)
    expect(reviewList(titlesOf(p), S).find(x => x.title === 'Seated Leg Curl (Machine)')).toMatchObject({ id: '0586', chosen: true })
    // what the import writes follows it
    mergeImport(S, p)
    expect(S.workouts[0].entries[0].id).toBe('0586')

    choose(S, 'Hevy|seated leg curl (machine)', null)
    rerun(p, S)
    expect(entries(p)[0].id).toBe('0599')
  })

  it('ignores a choice of an exercise that no longer exists', () => {
    S.hvImportMap = { 'Hevy|seated leg curl (machine)': 'cGone' }
    expect(entries(parse())[0].id).toBe('0599')
  })

  it('reads the Hevy API import again, routines and their folders included', async () => {
    const T = [{ id: 't1', title: 'Seated Leg Curl (Machine)', type: 'weight_reps', primary_muscle_group: 'hamstrings' }]
    const ex = [{ exercise_template_id: 't1', title: 'Seated Leg Curl (Machine)', sets: [{ type: 'normal', weight_kg: 40, reps: 10 }] }]
    const src = {
      workouts: [{ id: 'w1', title: 'Legs', start_time: '2026-10-14T16:00:00Z', end_time: '2026-10-14T17:00:00Z', exercises: ex }],
      routines: [{ id: 'r1', title: 'Legs', folder_id: 7, exercises: ex }],
      templates: T,
    }
    hooks.hevyFolders = {}
    try {
      const data = {
        workouts: importDone(parseHevyWorkouts(src.workouts, T, { unit: 'kg', customEx: S.customEx })),
        routines: parseHevyRoutines(src.routines, T, { unit: 'kg', customEx: S.customEx }),
        hvSource: src,
      }
      data.routines = importDone(data.routines)
      await importHevyFolders('k', data, async () => [{ id: 7, title: 'Lower', index: 0 }])
      expect(titlesOf(data).map(x => x.title)).toEqual(['Seated Leg Curl (Machine)'])
      choose(S, 'Hevy|seated leg curl (machine)', '0586')
      rerun(data, S)
      expect(data.workouts.workouts[0].entries[0].id).toBe('0586')
      expect(data.routines.routines[0]).toMatchObject({ hvFolder: 'Lower', ex: [{ id: '0586' }] })
    } finally { hooks.hevyFolders = null }
  })
})

describe('hevier cable review per brand (D43)', () => {
  const CABLES = [HEAD, row('Lat Pulldown (Cable)', 0, 60, 10), row('Lat Pulldown (Cable) (LifeFitness)', 0, 30, 10)].join('\n')
  beforeEach(() => {
    S = { unit: 'kg', customEx: [], workouts: [], bodyweight: [], exWeights: {} }
    hooks.importExercise = (title, source) => { useChoices(choicesFor(S)); return importExercise(title, source) }
    hooks.importDone = importDone
  })
  afterEach(() => { Object.assign(hooks, { importExercise: null, importDone: null }); useChoices(null) })

  it('lists a brand’s setup on its own, and a choice for it leaves the plain title 1:1', () => {
    const read = () => parseImport(CABLES, { unit: 'kg', customEx: S.customEx })
    const list = cableList(titlesOf(read()), S)
    expect(list.map(x => [x.title, x.brand, x.cable])).toEqual([['Lat Pulldown (Cable)', '', '1:1'], ['Lat Pulldown (Cable)', 'LifeFitness', '1:1']])
    expect(reviewList(titlesOf(read()), S)).toHaveLength(1)
    chooseCable(S, list[1].cableKey, 'x2')
    const [plain, branded] = entries(read())
    expect(plain.hvCable).toBeUndefined()
    expect(branded).toMatchObject({ hvBrand: 'LifeFitness', hvCable: 'x2', target: { dbLoad: 'each' } })
  })

  it('a choice kept before brands had their own still covers the branded title', () => {
    S.hvImportCable = { 'Hevy|lat pulldown (cable)': '2:1' }
    const [plain, branded] = entries(parseImport(CABLES, { unit: 'kg', customEx: S.customEx }))
    expect(plain.hvCable).toBe('2:1')
    expect(branded.hvCable).toBe('2:1')
  })
})
