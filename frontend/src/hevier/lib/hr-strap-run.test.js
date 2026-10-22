// @vitest-environment happy-dom
// The strap at run time (hevier/DECISIONS.md D79): which strap the service records, and what shows
// live. The native plugin is played in memory, the store by a plain object.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ calls: [], listeners: {}, files: new Map() }))
vi.mock('../../lib/mobile.js', () => ({
  MOBILE: true,
  isAndroid: async () => true,
  readJsonFile: async name => (h.files.has(name) ? JSON.parse(h.files.get(name)) : null),
  writeJsonFile: async (name, v) => { h.files.set(name, JSON.stringify(v)) },
}))
vi.mock('@capacitor/core', () => ({
  registerPlugin: () => ({
    addListener: (ev, cb) => { h.listeners[ev] = cb },
    status: async () => ({ state: 'off' }),
    sessions: async () => ({ sessions: [] }),
    start: async arg => { h.calls.push(['start', arg.session, arg.address]) },
    stop: async () => { h.calls.push(['stop']) },
    recording: async () => ({ text: '' }),
    clear: async () => {},
  }),
}))

const flush = () => new Promise(r => setTimeout(r, 0))
const settled = async () => { for (let i = 0; i < 10; i++) await flush() }
let run, S, watchers
const store = {
  get: () => S,
  update: fn => fn(S),
  watch: () => cb => watchers.push(cb),
}
const bump = () => watchers.forEach(cb => cb())

beforeEach(async () => {
  vi.resetModules()
  h.calls = []; h.listeners = {}; h.files.clear()
  h.files.set('hevier-hr-strap.json', JSON.stringify({ address: 'AA:AA:AA:AA:AA:AA', name: 'Helio' }))
  S = { workouts: [], active: { id: 'w1', entries: [] } }
  watchers = []
  run = await import('./hr-strap-run.js')
  run.initHrStrap(store)
  await vi.waitFor(() => expect(h.calls.length).toBe(1), { timeout: 5000 })
  await settled()
})

describe('hevier: the strap at run time (D79)', () => {
  it('records the open workout with the strap picked', () => {
    expect(h.calls).toEqual([['start', 'w1', 'AA:AA:AA:AA:AA:AA']])
  })

  it('another strap picked mid-workout moves the recording to it, same workout', async () => {
    await run.saveStrap({ address: 'BB:BB:BB:BB:BB:BB', name: 'Garmin' })
    await settled()
    expect(h.calls).toEqual([['start', 'w1', 'AA:AA:AA:AA:AA:AA'], ['start', 'w1', 'BB:BB:BB:BB:BB:BB']])
  })

  it('the service finding the strap under a new address does not restart it', async () => {
    h.listeners.state({ state: 'connected', address: 'CC:CC:CC:CC:CC:CC' })
    await settled()
    bump()
    await settled()
    expect((await run.loadStrap()).address).toBe('CC:CC:CC:CC:CC:CC')
    expect(h.calls).toEqual([['start', 'w1', 'AA:AA:AA:AA:AA:AA']])
  })

  it('shows only a reading the workout keeps: off the skin it reads as quiet', () => {
    h.listeners.reading({ t: 1000, hex: '0682', bpm: 130 })      // contact, 130
    expect(run.liveStrap().last).toEqual({ t: 1000, bpm: 130 })
    h.listeners.reading({ t: 2000, hex: '04ff', bpm: 255 })      // contact supported, none
    expect(run.liveStrap().last).toEqual({ t: 1000, bpm: 130 })
  })
})
