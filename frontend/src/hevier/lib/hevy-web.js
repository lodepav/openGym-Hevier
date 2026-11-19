// Hevy's private web API (hevier/DECISIONS.md D138): the calls hevy.com makes, with the session
// of a login in the app's Hevy login screen (HevierHevyLoginActivity.java). Workouts sent this way
// need no Pro key and show in followers' feeds. The session (access and refresh token) is kept
// encrypted on the phone by the caller; Hevy hands out a new pair on each refresh, and the old
// refresh token stops working, so every refresh is saved before the call goes on.
import { HevyApiError } from '../../lib/import-hevy.js'
import { within } from './within.js'

export const WEB_API = 'https://api.hevyapp.com'
const CALL_MS = 20e3
// Refreshed a little before Hevy's own expiry (an access token lasts about 15 minutes).
const EARLY_MS = 60e3

/** The session in hevy.com's `auth2.0-token` cookie value (URL-encoded JSON), or null. */
export function sessionOf(raw) {
  let v = raw
  if (typeof v === 'string') {
    try { v = JSON.parse(decodeURIComponent(v)) } catch { return null }
  }
  if (!v?.access_token || !v?.refresh_token) return null
  return { access_token: String(v.access_token), refresh_token: String(v.refresh_token), expires_at: v.expires_at ? String(v.expires_at) : null }
}

/** Whether the access token is past (or about to pass) its expiry. No expiry known: not expired. */
export const expired = (s, now) => {
  const at = Date.parse(s?.expires_at || '')
  return Number.isFinite(at) && now >= at - EARLY_MS
}

const headers = (access, body) => ({
  accept: 'application/json, text/plain, */*',
  'x-api-key': 'shelobs_hevy_web',
  'hevy-platform': 'web',
  ...(access ? { authorization: 'Bearer ' + access } : {}),
  ...(body ? { 'content-type': 'application/json' } : {}),
})

async function send(get, access, method, path, body) {
  try {
    return await within(get(WEB_API + path, {
      method, headers: headers(access, body), ...(body ? { body: JSON.stringify(body) } : {}),
    }), CALL_MS)
  } catch { throw new HevyApiError(0, 'offline') }
}

const reply = async res => {
  if (res.status === 429) throw new HevyApiError(429, 'rate-limit')
  if (!res.ok) throw new HevyApiError(res.status, `http ${res.status}`)
  const text = await res.text().catch(() => '')
  if (!text) return null
  try { return JSON.parse(text) } catch { return null }
}

/**
 * A caller for the private API: `call(method, path, body)` resolves with the reply's JSON (null
 * for an empty reply) or throws a HevyApiError. `load()` and `save(session|null)` keep the session;
 * `login()`, when given, asks the user to log in (a screen) and resolves with a session or null.
 * Without a session, or when Hevy refuses its refresh, the call throws HevyApiError(401, 'login').
 */
export function webClient({ load, save, login = null, get = fetch, now = Date.now }) {
  let s
  let asked = false
  const logIn = async () => {
    if (!login || asked) return null
    asked = true                         // one login screen per client, not one per call
    const got = sessionOf(await login())
    if (got) await save(got)
    return got
  }
  const session = async () => {
    if (s === undefined) s = sessionOf(await load())
    if (!s) s = await logIn()
    if (!s) throw new HevyApiError(401, 'login')
    return s
  }
  const refresh = async () => {
    const res = await send(get, s.access_token, 'POST', '/auth/refresh_token', { refresh_token: s.refresh_token })
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      s = null
      await save(null)
      s = await logIn()
      if (!s) throw new HevyApiError(401, 'login')
      return
    }
    const next = sessionOf(await reply(res))
    if (!next) throw new HevyApiError(502, 'no session')
    s = next
    await save(s)
  }
  return async function call(method, path, body) {
    await session()
    if (expired(s, now())) await refresh()
    let res = await send(get, s.access_token, method, path, body)
    if (res.status === 401) {
      await refresh()
      res = await send(get, s.access_token, method, path, body)
      if (res.status === 401) throw new HevyApiError(401, 'login')
    }
    return reply(res)
  }
}
