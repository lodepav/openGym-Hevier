import { describe, expect, it } from 'vitest'
import { fieldsChanged, watchS } from './store-watch.js'

describe('hevier store watch (battery, PLAN item 29)', () => {
  const workouts = [], routines = []
  const S = { workouts, routines, active: { sets: 1 } }

  it('a set typed in the running workout changes none of the watched fields', () => {
    expect(fieldsChanged(S, { ...S, active: { sets: 2 } }, ['workouts', 'routines'])).toBe(false)
    expect(fieldsChanged(S, { ...S, workouts: [...workouts] }, ['workouts', 'routines'])).toBe(true)
  })

  it('calls back only for a change of a watched field', () => {
    let listener = null
    const calls = []
    watchS(fn => { listener = fn }, ['workouts'])(() => calls.push(1))
    listener({ S: { ...S, active: null } }, { S })
    listener({ S }, { S })
    expect(calls).toHaveLength(0)
    listener({ S: { ...S, workouts: [{ id: 'w' }] } }, { S })
    expect(calls).toHaveLength(1)
  })
})
