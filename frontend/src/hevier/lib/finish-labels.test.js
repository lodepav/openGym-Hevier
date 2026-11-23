// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { finishLabels, labelFinished } from './finish-labels.js'
import { initFinishLabels } from './finish-labels-run.js'
import { storeAdapter } from './store-watch.js'
import { buildCompletedWorkout } from '../../lib/finish-workout.js'
import { DEF, useStore } from '../../store/useStore.js'
import { finishWorkoutNow } from '../../sheets.jsx'

vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

const CABLE = '8878'      // cable 45 degrees reverse fly
const gyms = [{ id: 'g1', name: 'City Gym', equipment: [] }]
const before = extra => ({
  equipProfiles: gyms, activeEquipId: 'g1', hvMachines: { [CABLE]: { g1: 'Life Fitness' } }, workouts: [],
  active: { id: 'a1', d: '2026-10-17', start: 1, entries: [{ id: CABLE, sets: [{ w: 15, r: 12, done: true }] }], ...extra },
})
const after = prev => ({ ...prev, active: null, workouts: [...prev.workouts, buildCompletedWorkout(prev.active, { end: 2 })] })

describe('hevier: a finish by any path keeps the gym and the brand (D28)', () => {
  it('labels the workout a finish without the sheet just saved (the watch, a forgotten workout)', () => {
    const prev = before()
    const next = after(prev)
    const found = finishLabels(prev, next)
    expect(found.labels).toEqual([{ hvGym: 'g1', hvBrand: 'Life Fitness', hvCable: '1:1' }])
    const saved = labelFinished(next.workouts, found)
    expect(saved.at(-1).entries[0]).toMatchObject({ hvGym: 'g1', hvBrand: 'Life Fitness' })
  })

  it('leaves a discard, a running session and an edit of a saved workout alone', () => {
    const prev = before()
    expect(finishLabels(prev, { ...prev, active: null })).toBeNull()                  // discarded
    expect(finishLabels(prev, { ...prev, active: { ...prev.active, name: 'x' } })).toBeNull()   // still on
    const saved = buildCompletedWorkout(prev.active, { end: 2 })
    const edit = before({ editingWorkoutId: saved.id })
    edit.workouts = [saved]
    expect(finishLabels(edit, { ...edit, active: null })).toBeNull()
  })

  it('writes nothing again on a workout already labelled', () => {
    const prev = before()
    const next = after(prev)
    const found = finishLabels(prev, next)
    const once = labelFinished(next.workouts, found)
    expect(finishLabels(prev, { ...next, workouts: once })).toBeNull()
  })

  it('the watch\'s Finish, straight into upstream\'s finish, saves the labels', () => {
    useStore.setState({ S: { ...JSON.parse(JSON.stringify(DEF)), ...before() }, user: null })
    const stop = initFinishLabels(storeAdapter(useStore))
    try { finishWorkoutNow() } finally { stop() }
    expect(useStore.getState().S.workouts.at(-1).entries[0]).toMatchObject({ hvGym: 'g1', hvBrand: 'Life Fitness' })
  })
})
