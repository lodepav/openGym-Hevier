import { describe, it, expect, afterEach } from 'vitest'
import { isHoldRow, canBeHold, toHold, toReps, rowMode, toSideHold, fromSideHold, setNumberOf, setUnits } from './hold-set.js'
import { previousSetsFor } from './previous-sets.js'
import { plainRows } from './plain-routine.js'
import { workSets } from './volume.js'
import { fill } from './plain-routine.js'
import { previousText } from './set-text.js'
import { hooks } from '../hooks.js'
import { setLabel, metricModeForEntry, metricRowsForEntry } from '../../lib/history.js'
import { completedVolumeOf, makeSideSet } from '../../lib/workout-model.js'
import { setTrend } from './set-trend.js'
import { workoutDraft } from './hevy-export.js'

const S = (w, r, extra = {}) => ({ w, r, done: false, ...extra })

describe('hevier: a timed hold in a reps exercise (D89)', () => {
  afterEach(() => { hooks.setMode = null })

  it('turns a rep set into a hold and back, keeping its weight', () => {
    const hold = toHold(S(20, 8, { done: true, max: true }), 30)
    expect(hold).toEqual({ w: 20, done: true, mode: 'time', sec: 30 })
    expect(isHoldRow(hold)).toBe(true)
    expect(toReps({ ...hold, hvRun: 5 }, 8)).toEqual({ w: 20, done: true, r: 8 })
  })

  it('only a plain work set of a reps exercise can be one', () => {
    expect(canBeHold(S(20, 8), 'reps')).toBe(true)
    expect(canBeHold(S(20, 8), 'time')).toBe(false)
    expect(canBeHold(S(20, 8, { phase: 'warmup', warmup: true }), 'reps')).toBe(false)
    expect(canBeHold(S(20, 8, { type: 'dropset', drops: [] }), 'reps')).toBe(false)
    expect(canBeHold(makeSideSet({ w: 20, r: 16 }), 'reps')).toBe(true)
  })

  it('upstream counts it as a hold: no volume, no reps row, read as seconds', () => {
    const e = { id: 'x', target: { reps: 8 }, sets: [S(60, 8, { done: true }), { ...toHold(S(60, 8), 40), done: true }] }
    expect(completedVolumeOf(e.sets[1])).toBe(0)
    expect(metricModeForEntry(e)).toBe('reps')
    expect(metricRowsForEntry(e, 'reps')).toHaveLength(1)
    hooks.setMode = rowMode
    expect(setLabel('x', e.sets[1], e.target)).toBe('0:40 · 60')
    expect(setLabel('x', e.sets[0], e.target)).toBe('60×8')
  })

  it('PREVIOUS reads last time’s hold as a hold', () => {
    hooks.setMode = rowMode
    const p = { ...toHold(S(0, 0), 40), done: true }
    expect(previousText(p, { mode: 'reps', unit: 'kg', id: 'x', target: { reps: 8 } })).toBe('0:40')
  })

  it('a routine without progression opens a hold where last time had one', () => {
    const out = fill(S(60, 8), { ...toHold(S(10, 0), 40), done: true }, 'reps')
    expect(out).toMatchObject({ mode: 'time', sec: 40, w: 10, hvLast: 1 })
    expect(out.r).toBeUndefined()
  })

  it('Workout Detail’s arrows compare a hold with a hold only', () => {
    const h = x => ({ ...toHold(S(0, 0), x), done: true })
    expect(setTrend(h(40), h(30))).toBe(1)
    expect(setTrend(h(40), S(60, 8, { done: true }))).toBe(null)
  })

  it('goes to Hevy as a duration', () => {
    const w = { name: 'W', start: 1, entries: [{ id: '0025', sets: [{ ...toHold(S(10, 0), 40), done: true }] }] }
    expect(workoutDraft(w).exercises[0].sets[0]).toMatchObject({ duration_seconds: 40, reps: null, weight_kg: 10 })
  })
})

describe('hevier: a per-side set as a hold on each side (D89)', () => {
  const side = (wL, rL, wR = wL, rR = rL) => ({ w: Math.max(wL, wR), r: rL + rR, done: false,
    sides: { L: { w: wL, r: rL, done: false }, R: { w: wR, r: rR, done: false } } })
  const tick = s => (s.sides ? { ...s, done: true, sides: { L: { ...s.sides.L, done: true }, R: { ...s.sides.R, done: true } } } : { ...s, done: true })

  it('becomes an L and an R hold, each with its weight, and back to the reps given', () => {
    const [L, R] = toSideHold(side(20, 10, 22, 9), 40, 35)
    expect(L).toEqual({ side: 'L', mode: 'time', w: 20, sec: 40, done: false })
    expect(R).toEqual({ side: 'R', mode: 'time', w: 22, sec: 35, done: false })
    expect(isHoldRow(L) && isHoldRow(R)).toBe(true)
    const back = fromSideHold({ ...L, hvRun: 5 }, R, 10, 8)
    expect(back.sides).toEqual({ L: { w: 20, r: 10, done: false }, R: { w: 22, r: 8, done: false } })
    expect(back.r).toBe(18)
    expect(back.mode).toBeUndefined()
  })

  it('a pair is one set: numbered once and counted once', () => {
    const rows = [side(20, 10), ...toSideHold(side(20, 10)), side(20, 10)]
    expect(rows.map((_, i) => setNumberOf(rows, i))).toEqual([1, 2, 2, 3])
    const done = [tick(rows[0]), tick(rows[1]), rows[2], rows[3]]
    expect(setUnits(done, s => s.done)).toHaveLength(2)
    expect(workSets([{ id: 'x', sets: done }])).toBe(2)
  })

  it('PREVIOUS reads a pair as one set, each half its own side', () => {
    const past = [tick(side(20, 10)), ...toSideHold(side(20, 10), 40, 30).map(tick), tick(side(20, 8))]
    const H = { workouts: [{ id: 'w1', d: '2026-10-20', entries: [{ id: 'x', sets: past }] }] }
    // Now: three per-side sets.
    const now = previousSetsFor(H, { id: 'x', sets: [side(0, 0), side(0, 0), side(0, 0)] }, 'any')
    expect(now[0].sides.L.r).toBe(10)
    expect(now[1]).toMatchObject({ side: 'L', sec: 40, hvPairR: { side: 'R', sec: 30 } })
    expect(now[2].sides.L.r).toBe(8)
    // Now the hold is in the first set: its halves read set 1, the next set reads set 2.
    const rows = [...toSideHold(side(0, 0)), side(0, 0)]
    const p = previousSetsFor(H, { id: 'x', sets: rows }, 'any')
    expect(p[0].sides.L.r).toBe(10)
    expect(p[1].sides.R.r).toBe(10)
    expect(p[2]).toMatchObject({ side: 'L', sec: 40 })
    expect(previousText(p[2], { side: 'R', mode: 'reps', unit: 'kg', id: 'x' })).toBe(setLabel('x', past[2]))
  })

  it('a routine without progression opens it as a hold on each side again', () => {
    const past = [...toSideHold(side(20, 10), 40, 30).map(tick)]
    past[1].w = 22
    const H = { workouts: [{ id: 'w1', d: '2026-10-20', entries: [{ id: 'x', sets: past }] }] }
    const rows = plainRows(H, {}, { id: 'x', reps: 20, side: true }, null, [side(15, 10), side(15, 10)])
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({ side: 'L', mode: 'time', sec: 40, w: 20 })
    expect(rows[1]).toMatchObject({ side: 'R', mode: 'time', sec: 30, w: 22 })
    expect(rows[2].sides.L).toMatchObject({ w: 15, r: 10 })
  })
})
