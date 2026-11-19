// Compound or isolation, upstream's guess with its slips fixed (D141).
import { describe, expect, it } from 'vitest'
import { EXDB } from '../../lib/exercises.js'
import { isCompoundEx } from '../../lib/warmup-ramp.js'
import { isCompound } from './compound.js'

const byName = n => { const e = EXDB.find(x => x.n === n); if (!e) throw new Error('not in the catalogue: ' + n); return e.id }

describe('isCompound', () => {
  it('fixes upstream’s slips: lateral pulldown, unilateral, push up with a space', () => {
    for (const n of ['cable bar lateral pulldown', 'alternate lateral pulldown', 'smith unilateral bulgarian split squat from deficit', 'push up (with push up handles)']) {
      const id = byName(n)
      expect([n, isCompoundEx(id)]).toEqual([n, false])   // upstream's slip, so the test proves the fix
      expect([n, isCompound(id)]).toEqual([n, true])
    }
  })

  it('keeps upstream’s verdict for the rest', () => {
    const verdicts = {
      'lever lateral raise': false, 'cable one arm lateral raise': false, 'lever leg extension': false,
      'cable seated unilateral bicep curl': false, 'barbell full squat': true, 'lever seated row': true,
      'cable wide grip lat pulldown': true,
    }
    for (const [n, compound] of Object.entries(verdicts)) {
      const id = byName(n)
      expect([n, isCompound(id), isCompoundEx(id)]).toEqual([n, compound, compound])
    }
  })

  it('differs from upstream only on the three slips, and only towards compound, over the whole catalogue', () => {
    const differ = EXDB.filter(e => isCompound(e) !== isCompoundEx(e.id))
    expect(differ.length).toBeGreaterThan(0)
    for (const e of differ) expect([e.n, isCompound(e), /lateral pull-?down|unilateral|push up/i.test(e.n)]).toEqual([e.n, true, true])
  })

  it('the owner’s lifts as the approved mockup marks them (c compound, i isolation)', () => {
    const owner = {
      'lever chest press': 'c', 'dumbbell incline bench press': 'c', 'lever seated fly': 'i', 'cable bar lateral pulldown': 'c',
      'lever t bar row': 'c', 'lever seated row': 'c', 'hyperextension v. 2': 'i', 'lever military press': 'c',
      'lever lateral raise': 'i', 'cable one arm lateral raise': 'i', 'sled 45° leg press': 'c', 'barbell full squat': 'c',
      'lever leg extension': 'i', 'barbell romanian deadlift': 'c', 'lever lying leg curl': 'i', 'dumbbell hammer curl v. 2': 'i',
      'lever preacher curl': 'i', 'lever seated dip': 'c', 'lever rotary calf': 'i',
    }
    for (const [n, kind] of Object.entries(owner)) expect([n, isCompound(byName(n)) ? 'c' : 'i']).toEqual([n, kind])
  })

  it('takes the exercise or its id; nothing is no compound', () => {
    const squat = EXDB.find(x => x.n === 'barbell full squat')
    expect(isCompound(squat)).toBe(true)
    expect([isCompound(null), isCompound('no such id')]).toEqual([false, false])
  })
})
