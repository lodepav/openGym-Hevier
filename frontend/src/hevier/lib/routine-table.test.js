import { describe, it, expect } from 'vitest'
import {
  routineRows, tableShape, setWorkField, setRange, addRow, removeRow, makeWarmup, makeWork,
  setFailure, setMax, canWarmUp, workCount,
} from './routine-table.js'
import { EXDB } from '../../lib/exercises.js'
import { buildSets, modeOf } from '../../lib/history.js'

const BAR = EXDB.find(e => /barbell/i.test(e.eq || '')).id
const RUN = EXDB.find(e => modeOf({ id: e.id }) === 'cardio').id
const flat = (extra = {}) => ({ id: BAR, mode: 'reps', sets: 3, reps: 8, weight: 60, ...extra })
const routine = { id: 'r', name: 'R', prog: 'linear', ex: [] }
const work = rows => rows.filter(r => r.kind === 'work')

describe('hevier routine table (D15)', () => {
  it('draws warm-ups, then one row per work set at the plan’s weight and reps', () => {
    const rows = routineRows(flat({ warmupSets: 2 }), routine, 'kg')
    expect(rows.map(r => r.kind)).toEqual(['warm', 'warm', 'work', 'work', 'work'])
    expect(work(rows).map(r => [r.w, r.reps])).toEqual([[60, 8], [60, 8], [60, 8]])
  })

  it('typing in any row of a flat plan sets it for every row', () => {
    const next = setWorkField(flat(), routine, 2, 'w', 62.5)
    expect(next.weight).toBe(62.5)
    expect(work(routineRows(next, routine, 'kg')).every(r => r.w === 62.5)).toBe(true)
    expect(setWorkField(flat(), routine, 0, 'r', 10).reps).toBe(10)
  })

  it('keeps per-side reps even, as upstream’s settings save them', () => {
    expect(setWorkField(flat({ side: true, reps: 16 }), routine, 0, 'r', 15).reps).toBe(16)
  })

  it('back-off rows show their derived weights and do not take a typed one', () => {
    const cfg = flat({ backoff: true, inc: 2, weight: 26 })
    expect(work(routineRows(cfg, routine, 'kg')).map(r => [r.w, r.fixed])).toEqual([[26, false], [24, true], [22, true]])
    expect(setWorkField(cfg, routine, 1, 'w', 50)).toBe(cfg)
    expect(setWorkField(cfg, routine, 0, 'w', 30).weight).toBe(30)
  })

  it('a double-progression plan reads as a rep range and edits as one', () => {
    const cfg = flat({ prog: 'double', reps: 12, repsMin: 8 })
    expect(tableShape(cfg, routine).ranged).toBe(true)
    expect(work(routineRows(cfg, routine, 'kg'))[0]).toMatchObject({ repsMin: 8, reps: 12 })
    expect(setRange(cfg, 10, 10)).toMatchObject({ repsMin: 10, reps: 11 })
  })

  it('a pyramid’s rows are its own, and its flat sets and reps follow the list', () => {
    const cfg = flat({ pyramid: [12, 10, 8], sets: 3, reps: 12 })
    const next = setWorkField(setWorkField(cfg, routine, 1, 'r', 9), routine, 2, 'w', 70)
    expect(next.pyramid).toEqual([12, 9, 8])
    expect(next.pyramidWeight).toEqual([0, 0, 70])
    expect(next).toMatchObject({ sets: 3, reps: 12 })
    const maxed = setMax(next, 2, true)
    expect(work(routineRows(maxed, routine, 'kg'))[2]).toMatchObject({ max: true, reps: null })
    expect(setMax(maxed, 2, false).pyramid[2]).toBe(12)
  })

  it('+ Add Set adds a work set; a pyramid repeats its last one', () => {
    expect(addRow(flat()).sets).toBe(4)
    const p = addRow(flat({ pyramid: [12, 10], pyramidWeight: [40, 50], sets: 2 }))
    expect(p.pyramid).toEqual([12, 10, 10])
    expect(p.pyramidWeight).toEqual([40, 50, 50])
    expect(p.sets).toBe(3)
  })

  it('drops triple progression’s ceiling once the sets reach it', () => {
    expect(addRow(flat({ prog: 'triple', sets: 3, setsMax: 4 }))).not.toHaveProperty('setsMax')
    expect(addRow(flat({ prog: 'triple', sets: 3, setsMax: 5 })).setsMax).toBe(5)
  })

  it('removing keeps one work set, and a pyramid loses that set’s target and weight', () => {
    const one = flat({ sets: 1 })
    expect(removeRow(one, { kind: 'work', k: 0 })).toBe(one)
    expect(removeRow(flat(), { kind: 'work', k: 1 }).sets).toBe(2)
    const p = removeRow(flat({ pyramid: [12, 10, 8], pyramidWeight: [40, 50, 60] }), { kind: 'work', k: 1 })
    expect(p.pyramid).toEqual([12, 8])
    expect(p.pyramidWeight).toEqual([40, 60])
    expect(removeRow(flat({ warmupSets: 1 }), { kind: 'warm', n: 0 })).not.toHaveProperty('warmupSets')
  })

  it('set type W turns a work set into a planned warm-up, and Normal turns it back', () => {
    const cfg = makeWarmup(flat(), { kind: 'work', k: 0 })
    expect(cfg).toMatchObject({ sets: 2, warmupSets: 1 })
    expect(canWarmUp(flat({ sets: 1 }), { kind: 'work', k: 0 })).toBe(false)
    const back = makeWork(cfg)
    expect(back.sets).toBe(3)
    expect(back).not.toHaveProperty('warmupSets')
  })

  it('set type F is the plan’s last-set-to-failure, shown on the last row only', () => {
    const cfg = setFailure(flat(), true)
    expect(cfg.lastToFailure).toBe(true)
    expect(work(routineRows(cfg, routine, 'kg')).map(r => r.failure)).toEqual([false, false, true])
    expect(setFailure(cfg, false)).not.toHaveProperty('lastToFailure')
    const pyr = flat({ pyramid: [10, 8] })
    expect(setFailure(pyr, true)).toBe(pyr)
  })

  it('cardio rows carry minutes and speed, and nothing else', () => {
    const cfg = { id: RUN, sets: 1, min: 20, speed: 8 }
    expect(routineRows(cfg, routine, 'kg')).toEqual([{ kind: 'work', k: 0, min: 20, speed: 8 }])
    expect(setWorkField(cfg, routine, 0, 'min', 0).min).toBe(1)
  })

  it('a session built from an edited plan opens at the table’s numbers', () => {
    let cfg = flat({ sets: 2, reps: 8, weight: 60 })
    cfg = addRow(setWorkField(setWorkField(cfg, routine, 0, 'w', 70), routine, 1, 'r', 6))
    const rows = buildSets({ unit: 'kg', workouts: [], exWeights: {} }, cfg, { useTarget: true, planReps: true })
    expect(workCount(cfg)).toBe(3)
    expect(rows.map(r => [r.w, r.r])).toEqual([[70, 6], [70, 6], [70, 6]])
  })
})
