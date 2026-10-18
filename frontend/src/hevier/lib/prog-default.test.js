// D61, seam S35: with the fork's default, an exercise and routine with no rule of their own do not
// progress; a rule set on either still does.
import { afterEach, describe, expect, it } from 'vitest'
import { policyFor } from '../../lib/progression.js'
import { hooks } from '../hooks.js'

const ex = { id: '0025', sets: 3, reps: 8 }

afterEach(() => { hooks.defaultProg = null })

describe('hevier: progression off by default (D61)', () => {
  it('upstream’s default without the fork: linear', () => {
    expect(policyFor(ex, {}, 'reps')).toBe('linear')
  })
  it('the fork’s default: off, for a routine exercise and a freestyle one', () => {
    hooks.defaultProg = 'off'
    expect(policyFor(ex, {}, 'reps')).toBe('off')
    expect(policyFor(ex, null, 'reps')).toBe('off')
  })
  it('a rule on the routine or the exercise still applies', () => {
    hooks.defaultProg = 'off'
    expect(policyFor(ex, { prog: 'linear' }, 'reps')).toBe('linear')
    expect(policyFor({ ...ex, prog: 'double' }, {}, 'reps')).toBe('double')
  })
})
