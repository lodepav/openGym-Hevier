import { describe, it, expect } from 'vitest'
import { sessionOf, expired, webClient, WEB_API } from './hevy-web.js'

const S1 = { access_token: 'a1', refresh_token: 'r1', expires_at: '2026-11-19T08:00:00.000Z' }
const S2 = { access_token: 'a2', refresh_token: 'r2', expires_at: '2026-11-19T08:15:00.000Z' }
const T = Date.parse('2026-11-19T07:50:00.000Z')

const res = (status, body) => ({ ok: status >= 200 && status < 300, status, text: async () => (body == null ? '' : JSON.stringify(body)) })

// A fake Hevy: answers by "METHOD path" and the bearer token, and records each call.
function fake(routes) {
  const calls = []
  const get = async (url, init) => {
    const path = url.replace(WEB_API, '')
    const auth = (init.headers.authorization || '').replace('Bearer ', '')
    calls.push({ key: init.method + ' ' + path, auth, body: init.body ? JSON.parse(init.body) : null, headers: init.headers })
    const r = routes[init.method + ' ' + path]
    return typeof r === 'function' ? r(auth, init) : r || res(404)
  }
  return { get, calls }
}
const store = (first) => {
  const box = { s: first, saved: [] }
  return { box, load: async () => box.s, save: async v => { box.s = v; box.saved.push(v) } }
}

describe('sessionOf', () => {
  it('reads hevy.com\'s URL-encoded cookie', () => {
    const raw = '{%22access_token%22:%22pq/4%22%2C%22refresh_token%22:%22n8D%22%2C%22expires_at%22:%222026-11-19T07:54:07.536Z%22}'
    expect(sessionOf(raw)).toEqual({ access_token: 'pq/4', refresh_token: 'n8D', expires_at: '2026-11-19T07:54:07.536Z' })
  })
  it('refuses what is not a session', () => {
    expect(sessionOf('nonsense')).toBeNull()
    expect(sessionOf({ access_token: 'x' })).toBeNull()
    expect(sessionOf(null)).toBeNull()
  })
})

describe('expired', () => {
  it('counts a minute early, and a session with no expiry as live', () => {
    expect(expired(S1, Date.parse('2026-11-19T07:58:59Z'))).toBe(false)
    expect(expired(S1, Date.parse('2026-11-19T07:59:01Z'))).toBe(true)
    expect(expired({ ...S1, expires_at: null }, T)).toBe(false)
  })
})

describe('webClient', () => {
  it('sends the web app\'s headers with the bearer token', async () => {
    const { get, calls } = fake({ 'GET /account': res(200, { username: 'u' }) })
    const st = store(S1)
    const call = webClient({ ...st, get, now: () => T })
    expect(await call('GET', '/account')).toEqual({ username: 'u' })
    expect(calls[0].auth).toBe('a1')
    expect(calls[0].headers['x-api-key']).toBe('shelobs_hevy_web')
    expect(calls[0].headers['hevy-platform']).toBe('web')
  })

  it('refreshes an expired token first and saves the new pair before the call', async () => {
    const { get, calls } = fake({
      'POST /auth/refresh_token': res(200, { user_id: 'x', ...S2 }),
      'PUT /workout': auth => res(auth === 'a2' ? 200 : 401),
    })
    const st = store(S1)
    const call = webClient({ ...st, get, now: () => Date.parse('2026-11-19T08:30:00Z') })
    expect(await call('PUT', '/workout', { workout_id: 'w' })).toBeNull()
    expect(calls.map(c => c.key)).toEqual(['POST /auth/refresh_token', 'PUT /workout'])
    expect(calls[0].body).toEqual({ refresh_token: 'r1' })
    expect(st.box.s).toEqual(S2)
  })

  it('refreshes once on a 401 and retries', async () => {
    const { get, calls } = fake({
      'POST /auth/refresh_token': res(200, S2),
      'GET /account': auth => res(auth === 'a2' ? 200 : 401, { ok: 1 }),
    })
    const st = store({ ...S1, expires_at: null })
    const call = webClient({ ...st, get, now: () => T })
    expect(await call('GET', '/account')).toEqual({ ok: 1 })
    expect(calls.map(c => c.key)).toEqual(['GET /account', 'POST /auth/refresh_token', 'GET /account'])
  })

  it('forgets a session whose refresh Hevy refuses, and asks for a login only when it may', async () => {
    const routes = { 'POST /auth/refresh_token': res(401), 'GET /account': res(401) }
    const quiet = store(S1)
    await expect(webClient({ ...quiet, get: fake(routes).get, now: () => T })('GET', '/account')).rejects.toMatchObject({ status: 401, message: 'login' })
    expect(quiet.box.s).toBeNull()

    let asked = 0
    const loud = store(S1)
    const routes2 = { ...routes, 'GET /account': auth => res(auth === 'a2' ? 200 : 401, { ok: 1 }) }
    const call = webClient({ ...loud, get: fake(routes2).get, now: () => T, login: async () => { asked++; return S2 } })
    expect(await call('GET', '/account')).toEqual({ ok: 1 })
    expect(asked).toBe(1)
    expect(loud.box.s).toEqual(S2)
  })

  it('without a session: one login screen per client, else a login error', async () => {
    const { get } = fake({ 'GET /account': res(200, {}) })
    let asked = 0
    const st = store(null)
    const call = webClient({ ...st, get, now: () => T, login: async () => { asked++; return null } })
    await expect(call('GET', '/account')).rejects.toMatchObject({ status: 401 })
    await expect(call('GET', '/account')).rejects.toMatchObject({ status: 401 })
    expect(asked).toBe(1)
  })

  it('a network failure is offline, not a logout', async () => {
    const st = store(S1)
    const call = webClient({ ...st, get: async () => { throw new Error('down') }, now: () => T })
    await expect(call('GET', '/account')).rejects.toMatchObject({ status: 0, message: 'offline' })
    expect(st.box.s).toEqual(S1)
  })
})
