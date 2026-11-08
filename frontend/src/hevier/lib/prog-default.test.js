// D61 since upstream 1.4.4: the profile's default rule (`S.progDefault`, #814) is Off in the fork,
// unless the profile chose one.
import { describe, expect, it } from 'vitest'
import { policyFor, profileRule } from '../../lib/progression.js'
import { unchosenDefault, progDefaultOff, initProgDefault } from './prog-default.js'

const ex = { id: '0025', sets: 3, reps: 8 }

describe('hevier: progression off by default (D61)', () => {
  it('upstream’s default without the fork: linear', () => {
    expect(policyFor(ex, {}, 'reps', profileRule({}))).toBe('linear')
  })
  it('stores Off on a profile that never chose, and keeps a choice', () => {
    expect(unchosenDefault({ progDefault: 'linear' })).toBe(true)
    expect(unchosenDefault({})).toBe(true)
    expect(unchosenDefault({ progDefault: 'linear', edited: { progDefault: 5 } })).toBe(false)
    expect(unchosenDefault({ progDefault: 'double' })).toBe(false)
    expect(unchosenDefault({ progDefault: 'off' })).toBe(false)
    const s = { progDefault: 'linear' }
    progDefaultOff(s)
    expect(policyFor(ex, {}, 'reps', profileRule(s))).toBe('off')
    expect(policyFor(ex, null, 'reps', profileRule(s))).toBe('off')
  })
  it('a rule on the routine or the exercise still applies', () => {
    const S = { progDefault: 'off' }
    expect(policyFor(ex, { prog: 'linear' }, 'reps', profileRule(S))).toBe('linear')
    expect(policyFor({ ...ex, prog: 'double' }, {}, 'reps', profileRule(S))).toBe('double')
  })
  it('runs on install and again when a sync brings a profile that never chose', () => {
    let S = { progDefault: 'linear' }, watcher = null, updates = 0
    const store = { get: () => S, update: fn => { const s = structuredClone(S); fn(s); S = s; updates++ }, watch: () => cb => { watcher = cb } }
    initProgDefault(store)
    expect(S.progDefault).toBe('off')
    watcher()
    expect(updates).toBe(1)
    S = { progDefault: 'linear', edited: { progDefault: 9 } }
    watcher()
    expect(S.progDefault).toBe('linear')
    expect(updates).toBe(1)
  })
})
