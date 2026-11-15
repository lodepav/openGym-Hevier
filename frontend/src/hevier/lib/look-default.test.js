// @vitest-environment happy-dom
// D123: a profile that never chose an accent gets the default green once, through the real store,
// and never over a real pick from this or another device (amoled plan 1.4, 5.3 finding 1).
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/api.js', () => ({ api: vi.fn(), setRemoteAuth: vi.fn() }))
vi.mock('../../store/useUI.js', () => ({ useUI: { getState: () => ({ toast: vi.fn() }) } }))

import { api } from '../../lib/api.js'
import { DEF, freshState, useStore } from '../../store/useStore.js'
import { mergeStates } from '../../lib/sync-merge.js'
import { storeAdapter } from './store-watch.js'
import { DEFAULT_GREEN } from './accents.js'
import { neverChose, initLookDefault } from './look-default.js'

const clone = v => JSON.parse(JSON.stringify(v))
const MONTH = 30 * 86400e3
const green = S => S.accent === 'custom' && S.accentCustom === DEFAULT_GREEN
let off = null, writes = 0

// The real store behind the fork's adapter, counting the writes the helper makes.
function start(S, { ready = false, user = null } = {}) {
  off?.()
  useStore.setState({ S: { ...S, _ts: S._ts ?? 1 }, user, ready })
  const store = storeAdapter(useStore, () => {})
  const update = store.update
  writes = 0
  off = initLookDefault({ ...store, update: fn => { writes++; update(fn) } })
}
const S = () => useStore.getState().S
const pick = (k, extra = {}) => useStore.getState().update(s => { s.accent = k; Object.assign(s, extra) })

beforeEach(() => { localStorage.clear(); api.mockReset() })

describe('hevier: the default green for a profile that never chose (D123)', () => {
  it('reads upstream’s defaults as never chosen, and a stamp or another key as a choice', () => {
    expect(neverChose(clone(DEF))).toBe(true)
    expect(neverChose(freshState())).toBe(true)
    expect(neverChose({})).toBe(true)
    expect(neverChose({ accent: 'neon' })).toBe(true)
    expect(neverChose({ accent: 'orange' })).toBe(false)
    expect(neverChose({ accent: 'custom', accentCustom: '#123456' })).toBe(false)
    expect(neverChose({ accent: 'lime', edited: { accent: 5 } })).toBe(false)
    expect(neverChose(null)).toBe(false)
  })

  it('gives the real DEF and freshState() the green once ready, stamped 1, and writes nothing before', () => {
    for (const base of [clone(DEF), freshState()]) {
      start(base)
      useStore.getState().update(s => { s.restSec = 91 })
      expect(writes).toBe(0)
      expect(S().accent).toBe(base.accent)
      useStore.setState({ ready: true })
      expect(green(S())).toBe(true)
      expect(S().edited.accent).toBe(1)
      expect(S().edited.accentCustom).toBe(1)
    }
  })

  it('keeps a stamped sky, an unstamped orange and a stamped lime', () => {
    for (const [base, k, want] of [[freshState(), 'sky', 'sky'], [{ ...clone(DEF), accent: 'orange' }, null, 'orange'], [freshState(), 'lime', 'lime']]) {
      start(base)
      if (k) pick(k)   // through upstream's update, which stamps it
      if (k) expect(S().edited.accent).toBeGreaterThan(1)
      useStore.setState({ ready: true })
      expect(S().accent).toBe(want)
      expect(writes).toBe(0)
    }
  })

  it('writes once: a later ready, sign-in or sync of the same copy writes nothing', () => {
    start(clone(DEF))
    useStore.setState({ ready: true })
    expect(writes).toBe(2)
    useStore.setState({ ready: false })
    useStore.setState({ ready: true, user: { id: 'u1' } })
    useStore.setState({ S: clone(S()) })
    expect(writes).toBe(2)
  })

  it('a sync bringing a never-chose copy later gets the green too', () => {
    start({ ...clone(DEF), accent: 'orange' }, { ready: true })
    useStore.setState({ S: { ...clone(DEF), _ts: 5 } })
    expect(green(S())).toBe(true)
  })
})

describe('hevier: the default green loses every merge to a real pick (5.3 finding 1)', () => {
  const greened = () => {
    start(clone(DEF))
    useStore.setState({ ready: true })
    return clone(S())
  }
  const monthOld = Date.now() - MONTH

  it('a server copy with sky stamped a month ago wins, whichever copy is newer', () => {
    const local = greened()
    const server = { ...clone(DEF), accent: 'sky', edited: { accent: monthOld }, _ts: monthOld }
    expect(mergeStates(local, server).accent).toBe('sky')
    expect(mergeStates(server, local).accent).toBe('sky')
    expect(mergeStates(local, { ...server, _ts: Date.now() + 1000 }).accent).toBe('sky')
  })

  it('two never-chose copies keep the green', () => {
    const local = greened()
    expect(green(mergeStates(local, { ...clone(DEF), _ts: monthOld }))).toBe(true)
    expect(green(mergeStates({ ...clone(DEF), _ts: Date.now() + 1000 }, local))).toBe(true)
  })

  // shortcut: a stamp of 1 still beats a pick that carries no stamp at all (0) in mergeStates. The store
  // never meets one on a pull (below: the helper waits for ready) and the server stamps every unstamped
  // change it stores (api/sync-stamps.js); a server restored from a pre-stamp backup would still lose its
  // pick. Fixing it needs the server's copy after the merge, which no fork hook sees.
  it.fails('an unstamped orange on the server wins a plain merge', () => {
    const local = greened()
    expect(mergeStates(local, { ...clone(DEF), accent: 'orange', _ts: monthOld }).accent).toBe('orange')
  })

  const server = accent => ({ ...clone(DEF), ...accent, _ts: monthOld })
  for (const [name, fields, want] of [
    ['a month-old stamped sky', { accent: 'sky', edited: { accent: monthOld } }, 'sky'],
    ['an unstamped orange', { accent: 'orange' }, 'orange'],
  ]) {
    it(`first pull: the server's ${name} is what the profile ends on`, async () => {
      api.mockImplementation(async (p, o) => (o?.method === 'PUT' ? { ok: true, rev: 2 } : { state: server(fields), rev: 1 }))
      start({ ...clone(DEF), _ts: 1 }, { user: { id: 'u1' } })
      await useStore.getState().pullState()
      useStore.setState({ ready: true })
      expect(S().accent).toBe(want)
      expect(writes).toBe(0)
    })

    it(`guest sign-in: the server's ${name} is what the profile ends on`, async () => {
      greened()
      api.mockImplementation(async (p, o) => (o?.method === 'PUT' ? { ok: true, rev: 2 } : { state: server(fields), rev: 1 }))
      useStore.getState().setUser({ id: 'u1', name: 'x' }, { adopt: true })
      await useStore.getState().adoptProfile(async () => true)
      expect(S().accent).toBe(want)
    })
  }

  it('guest sign-in to an account that never chose: the green comes back', async () => {
    greened()
    api.mockImplementation(async (p, o) => (o?.method === 'PUT' ? { ok: true, rev: 2 } : { state: server({}), rev: 1 }))
    useStore.getState().setUser({ id: 'u1', name: 'x' }, { adopt: true })
    await useStore.getState().adoptProfile(async () => true)
    expect(green(S())).toBe(true)
  })
})
