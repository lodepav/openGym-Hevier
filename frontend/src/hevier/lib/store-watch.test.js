import { describe, expect, it } from 'vitest'
import { fieldSig, fieldsChanged, watchS } from './store-watch.js'

// The store's update deep-copies S (store/useStore.js), so every field is a new object.
const copy = o => JSON.parse(JSON.stringify(o))

describe('hevier store watch (battery, PLAN item 29)', () => {
  const S = { workouts: [{ id: 'w1', entries: [] }], routines: [], active: { sets: 1 } }

  it('a set typed in the running workout changes none of the watched fields, even in a deep copy', () => {
    const next = copy(S)
    next.active.sets = 2
    expect(next.workouts).not.toBe(S.workouts)
    expect(fieldsChanged(S, next, ['workouts', 'routines'])).toBe(false)
  })

  it('a changed workout is a change', () => {
    const next = copy(S)
    next.workouts[0].note = 'x'
    expect(fieldsChanged(S, next, ['workouts', 'routines'])).toBe(true)
    next.workouts[0].note = undefined
    next.workouts.push({ id: 'w2' })
    expect(fieldsChanged(S, next, ['workouts'])).toBe(true)
  })

  it('writes each copy of S out once per field', () => {
    const a = copy(S)
    expect(fieldSig(a, 'workouts')).toBe(fieldSig(a, 'workouts'))
    expect(fieldSig(a, 'missing')).toBe('null')
  })

  it('calls back only for a change of a watched field', () => {
    let listener = null
    const calls = []
    watchS(fn => { listener = fn }, ['workouts'])(() => calls.push(1))
    listener({ S: { ...copy(S), active: null } }, { S })
    listener({ S }, { S })
    expect(calls).toHaveLength(0)
    listener({ S: { ...copy(S), workouts: [{ id: 'w' }] } }, { S })
    expect(calls).toHaveLength(1)
  })
})
