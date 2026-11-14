// The send to Hevy around one pass (hevier/DECISIONS.md D34): the API call, and sendToHevy reading
// the key and the phone's export file and keeping what went. The pass itself is in hevy-export.test.js.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HEVY_API } from '../../lib/import-hevy.js'

let file = null
const saved = []
vi.mock('../../lib/mobile.js', async orig => ({
  ...(await orig()), MOBILE: true,
  readJsonFile: async () => file,
  writeJsonFile: async (name, v) => { saved.push([name, JSON.parse(JSON.stringify(v))]) },
}))
vi.mock('./secret.js', () => ({ getSecret: async () => 'k1', putSecret: async () => true, removeSecret: async () => {} }))

const T0 = Date.parse('2026-10-15T16:00:00Z')
const squat = '0043'
const S = {
  unit: 'kg', workouts: [{ id: 'a', d: '2026-10-15', start: T0, end: T0 + 3600e3, name: 'Legs', entries: [{ id: squat, sets: [{ w: 100, r: 5, done: true }] }] }],
  routines: [], hvModuleParts: {},
}
const getState = () => S
let calls, status, mod

// A reply as fetch gives it.
const reply = (code, body = {}) => ({ status: code, ok: code >= 200 && code < 300, json: async () => body })
beforeEach(async () => {
  file = {
    on: true, since: T0 - 1, base: { workouts: [], routines: {} }, out: { w: {}, r: {} }, failed: {}, unsure: {},
    tpl: { [squat]: { id: 'HT', type: 'weight_reps' } }, folders: {}, last: null,
  }
  saved.length = 0
  calls = []
  status = 200
  vi.stubGlobal('fetch', async (url, init) => {
    calls.push({ method: init.method, path: url.pathname, key: init.headers['api-key'], body: init.body && JSON.parse(init.body) })
    return reply(status, { workout: [{ id: 'HW1' }] })
  })
  vi.resetModules()   // the export state and the retry clock are the module's own
  mod = await import('./hevy-export-sync.js')
})
afterEach(() => vi.unstubAllGlobals())

describe('hevyCall', () => {
  it('sends the key and the JSON body to Hevy, and names what went wrong', async () => {
    const seen = []
    const get = async (url, init) => { seen.push([String(url), init]); return reply(201, { id: 1 }) }
    expect(await mod.hevyCall('k1', 'POST', '/v1/workouts', { workout: { title: 'Legs' } }, get)).toEqual({ id: 1 })
    expect(seen[0][0]).toBe(new URL('/v1/workouts', HEVY_API).href)
    expect(seen[0][1]).toEqual({ method: 'POST', headers: { 'api-key': 'k1', 'content-type': 'application/json' }, body: '{"workout":{"title":"Legs"}}' })
    expect(await mod.hevyCall('k1', 'DELETE', '/v1/x', null, async () => reply(204))).toBe(null)
    const fails = async get => mod.hevyCall('k1', 'GET', '/v1/x', null, get).then(() => null, e => [e.status, e.message])
    expect(await fails(async () => reply(401))).toEqual([401, 'auth'])
    expect(await fails(async () => reply(429))).toEqual([429, 'rate-limit'])
    expect(await fails(async () => reply(500))).toEqual([500, 'http 500'])
    expect(await fails(async () => { throw new TypeError('no network') })).toEqual([0, 'offline'])
  })
})

describe('sendToHevy: the ordinary pass', () => {
  it('posts a finished workout once with the key, and keeps it in the export file as sent', async () => {
    const st = await mod.sendToHevy(getState, { now: T0 + 4000e3 })
    expect(calls.map(c => [c.method, c.path, c.key])).toEqual([['POST', '/v1/workouts', 'k1']])
    expect(calls[0].body.workout).toMatchObject({ title: 'Legs', start_time: new Date(T0).toISOString() })
    expect(calls[0].body.workout.exercises.map(e => e.exercise_template_id)).toEqual(['HT'])
    expect(st.out.w.a.id).toBe('HW1')
    expect(st.last).toEqual({ at: T0 + 4000e3, sent: 1, refused: 0, error: null })
    const [name, last] = saved.at(-1)
    expect(name).toBe(mod.EXPORT_FILE)
    expect(last.out.w.a).toEqual(st.out.w.a)
    // The next pass finds nothing new and calls Hevy for nothing.
    await mod.sendToHevy(getState, { now: T0 + 5000e3 })
    expect(calls).toHaveLength(1)
  })

  it('a refused key is shown and nothing is kept as sent; it is not tried again for a minute unless forced', async () => {
    status = 401
    const st = await mod.sendToHevy(getState, { now: T0 + 4000e3 })
    expect(st.last).toMatchObject({ sent: 0, error: 'auth' })
    expect(st.out.w).toEqual({})
    await mod.sendToHevy(getState, { now: T0 + 4030e3 })
    expect(calls).toHaveLength(1)
    status = 200
    await mod.sendToHevy(getState, { now: T0 + 4031e3, force: true })
    expect(calls).toHaveLength(2)
    expect(st.out.w.a.id).toBe('HW1')
  })

  it('at Hevy\'s rate limit it stops, and goes again after the minute', async () => {
    status = 429
    const st = await mod.sendToHevy(getState, { now: T0 + 4000e3 })
    expect(st.last.error).toBe('rate')
    expect(st.out.w).toEqual({})
    status = 200
    await mod.sendToHevy(getState, { now: T0 + 4061e3 })
    expect(calls).toHaveLength(2)
    expect(st.last).toMatchObject({ sent: 1, error: null })
  })
})
