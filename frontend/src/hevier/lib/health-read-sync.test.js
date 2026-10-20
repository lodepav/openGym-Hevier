// [hevier] Ported from upstream's v1.4.3 lib/health-sync.read.test.js (commit f9c03474) for
// hevier/DECISIONS.md D27, for the fork's own plugin (requestRead in place of requestPermissions)
// and file; the two iPhone cases are left out, as the fork reads on Android only.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// v1.4.3 (#544, #127): reading heart rate and weigh-ins back from Health Connect / Apple Health.
// The native plugin and the app's data directory are played in memory, the store by a plain
// object and an `apply` that runs the change on it (as useStore's update does).
const h = vi.hoisted(() => {
  vi.stubEnv('VITE_MOBILE', '1')
  return { files: new Map(), calls: [], platform: 'android', granted: { heartRate: true, weight: true }, hr: [], weights: [], fail: null, writes: 0 }
})

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Data: 'DATA' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: {
    readFile: async ({ path }) => {
      if (!h.files.has(path)) throw new Error('File does not exist')
      return { data: h.files.get(path) }
    },
    writeFile: async ({ path, data }) => { h.writes++; h.files.set(path, data) },
  },
}))
vi.mock('@capacitor/app', () => ({ App: { addListener: () => ({ remove() {} }) } }))
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => h.platform },
  registerPlugin: () => ({
    status: async () => ({ status: 'available', read: { ...h.granted } }),
    requestRead: async arg => {
      h.calls.push(['request', arg])
      return { read: { ...h.granted } }
    },
    readHeartRate: async arg => {
      h.calls.push(['readHeartRate', arg])
      if (h.fail) throw Object.assign(new Error('no'), { code: h.fail })
      return { samples: h.hr.filter(([t]) => t >= arg.from && t <= arg.to), origins: ['com.garmin.android.apps.connectmobile'] }
    },
    readWeights: async arg => {
      h.calls.push(['readWeights', arg])
      if (h.fail) throw Object.assign(new Error('no'), { code: h.fail })
      return { records: h.weights.filter(r => r.t >= arg.since) }
    },
  }),
}))

// Local time, so the days the weigh-ins fall on are the same in every timezone.
const NOW = new Date(2026, 9, 15, 20, 0, 0).getTime()
const s = sec => NOW - 3600e3 + sec * 1000
const dense = (from, to, bpm) => { const out = []; for (let x = from; x <= to; x++) out.push([s(x), bpm]); return out }
const workout = (id, endSec = 600, extra = {}) => ({ id, d: '2026-10-15', name: 'Push', start: s(0), end: s(endSec), entries: [{ id: '0025', target: { mode: 'reps' }, sets: [{ w: 60, r: 8, done: true, at: s(100) }] }], ...extra })
const reads = kind => h.calls.filter(c => c[0] === kind)
const file = () => JSON.parse(h.files.get('hevier-health-read.json') || 'null')

let hs, S, applied
const getState = () => S
const apply = fn => { applied++; const next = JSON.parse(JSON.stringify(S)); fn(next); S = next }
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  vi.resetModules()
  h.files.clear(); h.calls = []; h.platform = 'android'; h.granted = { heartRate: true, weight: true }; h.hr = []; h.weights = []; h.fail = null; h.writes = 0
  S = { unit: 'kg', workouts: [workout('w1')], bodyweight: [] }
  applied = 0
  hs = await import('./health-read-sync.js')
})

afterEach(() => { vi.useRealTimers() })

describe('switched off (the default)', () => {
  it('reads nothing at all', async () => {
    await hs.loadRead()
    h.hr = dense(0, 600, 130)
    await hs.readHealth(getState, { force: true, now: NOW, apply })
    expect(h.calls).toEqual([])
    expect(applied).toBe(0)
  })
})

describe('the fork reads on Android only', () => {
  it('on the iPhone build the switch stays off and nothing is read', async () => {
    vi.resetModules(); h.platform = 'ios'; hs = await import('./health-read-sync.js')
    h.weights = [{ t: NOW - 3600e3, kg: 80, id: 'r', origin: 'com.withings.wiscale2', clientId: null }]
    expect(await hs.enableRead('weight', getState, { apply })).toEqual({ ok: false, reason: 'unsupported' })
    expect(h.calls).toEqual([])
    expect(file()).toBeNull()
  })
})

describe('heart rate', () => {
  it('asks for that read permission only, then fills the workout just finished', async () => {
    h.hr = dense(0, 600, 130)
    const r = await hs.enableRead('hr', getState, { apply })
    expect(r.ok).toBe(true)
    expect(h.calls[0]).toEqual(['request', { read: ['heartRate'] }])
    expect(reads('readHeartRate')).toHaveLength(1)
    expect(S.workouts[0].entries[0].sets[0].hr).toEqual({ avg: 130, max: 130 })
    expect(S.workouts[0].hr).toMatchObject({ src: 'hc', avg: 130 })
    expect(file()).toMatchObject({ readHr: true, readWeight: false })
  })

  it('stays off when the permission is not granted', async () => {
    h.granted.heartRate = false
    expect(await hs.enableRead('hr', getState, { apply })).toEqual({ ok: false, reason: 'denied' })
    expect(reads('readHeartRate')).toEqual([])
    expect(file()).toBeNull()
  })

  it('looks only at workouts of the last 24 hours, and not more than every few minutes', async () => {
    S.workouts.push({ ...workout('old'), start: NOW - 30 * 3600e3, end: NOW - 29 * 3600e3 })
    await hs.enableRead('hr', getState, { apply })
    expect(reads('readHeartRate').map(c => c[1].from)).toEqual([s(0)])
    // Nothing yet (the watch has not synced): tried again later, not right away.
    await hs.readHealth(getState, { now: NOW + 60e3, apply })
    expect(reads('readHeartRate')).toHaveLength(1)
    h.hr = dense(0, 600, 125)
    await hs.readHealth(getState, { now: NOW + 11 * 60e3, apply })
    expect(reads('readHeartRate')).toHaveLength(2)
    expect(S.workouts[0].hr.avg).toBe(125)
    // A day later it stops looking.
    await hs.readHealth(getState, { force: true, now: NOW + 25 * 3600e3, apply })
    expect(reads('readHeartRate')).toHaveLength(2)
  })


  it('a withdrawn permission is remembered, for Settings to offer asking again', async () => {
    await hs.enableRead('hr', getState, { apply })
    h.fail = 'permission'
    await hs.readHealth(getState, { force: true, now: NOW + 3 * 60e3, apply })
    expect(file().readError).toBe('permission')
  })

  it('turning it off stops the reads and keeps what came in', async () => {
    h.hr = dense(0, 600, 130)
    await hs.enableRead('hr', getState, { apply })
    await hs.disableRead('hr')
    S.workouts.push(workout('w2'))
    await hs.readHealth(getState, { force: true, now: NOW + 3 * 60e3, apply })
    expect(reads('readHeartRate')).toHaveLength(1)
    expect(S.workouts[0].hr.src).toBe('hc')
  })
})

describe('weigh-ins', () => {
  const rec = (hAgo, kg, extra = {}) => ({ t: NOW - hAgo * 3600e3, kg, id: 'r' + hAgo, origin: 'com.withings.wiscale2', clientId: null, ...extra })

  it('reads the last 30 days the first time, then from the newest seen', async () => {
    h.weights = [rec(2, 80.4), rec(26, 81, { clientId: 'opengym-bw-2026-10-14' })]
    await hs.enableRead('weight', getState, { apply })
    expect(h.calls[0]).toEqual(['request', { read: ['weight'] }])
    expect(reads('readWeights')[0][1].since).toBe(NOW - 30 * 24 * 3600e3)
    expect(S.bodyweight).toEqual([{ d: '2026-10-15', w: 80.4, t: NOW - 2 * 3600e3, src: 'hc' }])
    expect(file().wCursor).toBe(NOW - 2 * 3600e3)
    await hs.readHealth(getState, { force: true, now: NOW + 3 * 60e3, apply })
    expect(reads('readWeights')[1][1].since).toBe(NOW - 2 * 3600e3 - 2 * 24 * 3600e3)
  })

  it('changes nothing on a second read of the same records', async () => {
    h.weights = [rec(2, 80.4)]
    await hs.enableRead('weight', getState, { apply })
    expect(applied).toBe(1)
    await hs.readHealth(getState, { force: true, now: NOW + 3 * 60e3, apply })
    expect(applied).toBe(1)
  })

  it('a pass that brings nothing new writes no file (battery, item 29)', async () => {
    h.weights = [rec(2, 80.4)]
    await hs.enableRead('weight', getState, { apply })
    const writes = h.writes
    await hs.readHealth(getState, { now: NOW + 60e3, apply })
    await hs.readHealth(getState, { now: NOW + 90e3, apply })
    expect(h.writes).toBe(writes)
  })

  it('leaves a day with a weigh-in typed into openGym alone', async () => {
    S.bodyweight = [{ d: '2026-10-15', w: 82, t: NOW - 10 * 3600e3 }]
    h.weights = [rec(2, 80.4)]
    await hs.enableRead('weight', getState, { apply })
    expect(applied).toBe(0)
    expect(S.bodyweight).toEqual([{ d: '2026-10-15', w: 82, t: NOW - 10 * 3600e3 }])
  })

})
