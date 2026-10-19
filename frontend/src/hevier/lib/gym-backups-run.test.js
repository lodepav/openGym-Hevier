// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { EXDB } from '../../lib/exercises.js'
import { initGymBackups, armSwap } from './gym-backups-run.js'
import { storeAdapter } from './store-watch.js'

vi.mock('../../lib/api.js', async orig => ({ ...(await orig()), api: vi.fn(() => Promise.resolve({})), beacon: vi.fn() }))

const clone = v => JSON.parse(JSON.stringify(v))
const PRESS = EXDB.find(e => /leg press/i.test(e.n)).id
const HACK = EXDB.find(e => e.id !== PRESS && /hack squat/i.test(e.n)).id
const tick = () => new Promise(r => setTimeout(r, 5))

const toast = vi.fn()
const getState = () => useStore.getState().S
initGymBackups(storeAdapter(useStore, toast))

function base(swaps) {
  const S = clone(DEF)
  S.equipProfiles = [{ id: 'g1', name: 'City Gym' }]
  S.activeEquipId = 'g1'
  S.routines = [{ id: 'r', name: 'Legs', ex: [{ id: PRESS, mode: 'reps', sets: 3, reps: 10, weight: 100, subs: [HACK] }] }]
  S.hvGymSwaps = swaps
  S.active = null
  useStore.setState({ S, user: null })
}
const start = at => useStore.getState().update(s => {
  s.active = { start: at, routineIds: ['r'], entries: [{ id: PRESS, rid: 'r', target: { id: PRESS }, sets: [{ w: 100, r: 10 }] }] }
})

describe('a gym’s backups at run time (D46)', () => {
  it('a routine started at the gym swaps in what it took last time, and says so with Undo', async () => {
    base({ [PRESS]: { g1: HACK } })
    start(10)
    await tick()
    expect(getState().active.entries[0].id).toBe(HACK)
    expect(toast).toHaveBeenCalled()
    const [msg, opts] = toast.mock.calls.at(-1)
    expect(msg).toContain('City Gym')
    opts.onAction()
    expect(getState().active.entries[0].id).toBe(PRESS)
    expect(getState().hvGymSwaps).toEqual({})
  })

  it('a swap through the fork’s picker is learned once the session shows it', async () => {
    base({})
    start(20)
    await tick()
    const pick = armSwap(getState, PRESS, () => useStore.getState().update(s => { s.active.entries[0] = { ...s.active.entries[0], id: HACK } }))
    pick({ id: HACK }, true)
    await tick()
    expect(getState().hvGymSwaps).toEqual({ [PRESS]: { g1: HACK } })
  })
})
