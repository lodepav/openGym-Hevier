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
const toast = vi.hoisted(() => vi.fn())
vi.mock('../../store/useUI.js', () => ({ useUI: { getState: () => ({ toast }) } }))
const secrets = vi.hoisted(() => ({ 'hevy-api-key': 'k1' }))
vi.mock('./secret.js', () => ({ getSecret: async n => secrets[n] ?? null, putSecret: async (n, v) => { secrets[n] = v; return true }, removeSecret: async n => { delete secrets[n] } }))

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
  toast.mockClear()
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

describe('sendToHevy: telling that it has stopped', () => {
  it('a refused key on a pass with a workout shows one toast, not again until a pass gets through', async () => {
    status = 401
    await mod.sendToHevy(getState, { now: T0 + 4000e3 })
    await vi.waitFor(() => expect(toast).toHaveBeenCalledTimes(1))
    expect(toast).toHaveBeenCalledWith('Send to Hevy stopped: Hevy refused the key. Check Settings → Integrations')
    await mod.sendToHevy(getState, { now: T0 + 4100e3 })
    // Send now's own line says it: no toast either.
    await mod.sendToHevy(getState, { now: T0 + 4110e3, force: true })
    expect(calls).toHaveLength(3)
    // A pass that gets through lets the next stop tell again.
    status = 200
    await mod.sendToHevy(getState, { now: T0 + 4200e3, force: true })
    S.workouts.push({ ...S.workouts[0], id: 'b', start: T0 + 1, end: T0 + 7200e3 })
    status = 401
    await mod.sendToHevy(getState, { now: T0 + 4300e3 })
    S.workouts.pop()
    await vi.waitFor(() => expect(toast).toHaveBeenCalledTimes(2))
  })
})

describe('sendToHevy over the private web API (D138)', () => {
  const session = { access_token: 'a1', refresh_token: 'r1', expires_at: null }
  let web
  beforeEach(() => {
    secrets['hevy-web-session'] = JSON.stringify(session)
    delete secrets['hevy-api-key']
    file.tpl = {}
    web = []
    vi.stubGlobal('fetch', async (url, init) => {
      const path = String(url).replace('https://api.hevyapp.com', '')
      web.push({ key: init.method + ' ' + path, auth: init.headers.authorization, body: init.body && JSON.parse(init.body) })
      const body = path === '/custom_exercise_templates' ? [{ id: 'OLD', title: 'Squat (Barbell) (brand: Eleiko)', is_archived: false }]
        : path === '/workout' && init.method === 'POST' ? { id: 'PW1' } : null
      return { ok: true, status: 200, text: async () => (body ? JSON.stringify(body) : '') }
    })
  })
  afterEach(() => { delete secrets['hevy-web-session']; secrets['hevy-api-key'] = 'k1' })

  it('posts the workout to the private API with the login, a branded set as Hevy\'s own exercise', async () => {
    S.workouts[0].entries[0].hvBrand = 'Eleiko'
    try {
      const st = await mod.sendToHevy(getState, { force: true })
      expect(st.last).toMatchObject({ sent: 1, error: null })
      expect(web.map(c => c.key)).toEqual(['GET /custom_exercise_templates', 'POST /workout'])
      expect(web[1].auth).toBe('Bearer a1')
      const ex = web[1].body.workout.exercises[0]
      expect(ex.id).toBe('D04AC939')            // Squat (Barbell), not the Eleiko custom
      expect(ex.title).toBe('Squat (Barbell)')
      expect(ex.notes).toMatch(/^Eleiko/)
      expect(st.out.w.a.id).toBe('PW1')
    } finally { delete S.workouts[0].entries[0].hvBrand }
  })

  it('lists as unused only the customs no workout, routine or export template uses, reading every page', async () => {
    const asked = []
    const w = id => ({ exercises: [{ exercise_template_id: id }] })
    vi.stubGlobal('fetch', async (url, init) => {
      const path = String(url).replace('https://api.hevyapp.com', '')
      asked.push(init.method + ' ' + path + (init.body ? ' ' + init.body : ''))
      const off = Number(/offset=(\d+)/.exec(path)?.[1])
      const body = path === '/account' ? { username: 'me' }
        : path.startsWith('/user_workouts_paged') ? { workouts: off === 0 ? [w('C1'), w('B'), w('B'), w('B'), w('B')] : off === 5 ? [w('C2')] : [] }
        : path === '/routines_sync_batch' ? (init.body === '{}' ? { updated: [{ id: 'R1', updated_at: 't1', exercises: [{ exercise_template_id: 'C3' }] }], deleted: [], isMore: true }
          : { updated: [{ id: 'R2', updated_at: 't2', exercises: [{ exercise_template_id: 'C4' }] }], deleted: [], isMore: false })
        : path === '/custom_exercise_templates' ? ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'GONE'].map(id => ({ id, title: 'T ' + id, is_archived: id === 'GONE' }))
        : null
      return { ok: true, status: 200, text: async () => (body ? JSON.stringify(body) : '') }
    })
    file.tpl = { 2950: { id: 'C5' } }
    delete file.user
    expect(await mod.unusedCustoms()).toEqual([{ id: 'C6', title: 'T C6' }])
    expect(asked.filter(a => a.includes('offset=')).map(a => /limit=(\d+)&offset=(\d+)/.exec(a).slice(1).join('/'))).toEqual(['5/0', '5/5'])
    expect(asked.filter(a => a.includes('routines_sync_batch'))).toEqual(['POST /routines_sync_batch {}', 'POST /routines_sync_batch {"R1":"t1"}'])
  })

  it('lists nothing when it cannot tell whose workouts to read', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: true, status: 200, text: async () => '{}' }))
    delete file.user
    await expect(mod.unusedCustoms()).rejects.toThrow()
  })

  it('without a key, routines wait and nothing goes to the official API', async () => {
    S.routines.push({ id: 'R', name: 'Push', ex: [{ id: squat, sets: 1, reps: 5, weight: 100, mode: 'reps' }] })
    try {
      await mod.sendToHevy(getState, { force: true })
      expect(web.every(c => !c.key.includes('/v1/'))).toBe(true)
      expect(web.filter(c => c.key.includes('routine'))).toEqual([])
    } finally { S.routines.length = 0 }
  })
})
