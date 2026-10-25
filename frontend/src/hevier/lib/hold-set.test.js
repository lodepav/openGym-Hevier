import { describe, it, expect, afterEach } from 'vitest'
import { isHoldRow, canBeHold, toHold, toReps, rowMode } from './hold-set.js'
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
    expect(canBeHold(makeSideSet({ w: 20, r: 16 }), 'reps')).toBe(false)
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
