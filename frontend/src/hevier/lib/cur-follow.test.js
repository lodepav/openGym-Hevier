// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { curAfter, initCurFollow } from './cur-follow.js'
import { DEF, useStore } from '../../store/useStore.js'
import { storeAdapter } from './store-watch.js'
import { swapActiveExercise } from '../../lib/active-exercise-swap.js'
import { upcomingSets } from '../../lib/live-activity.js'

const set = (done = false, at = 0) => ({ w: 20, r: 8, done, ...(done ? { at } : {}) })
const session = () => ({ id: 'a', cur: 0, entries: ['e0', 'e1', 'e2', 'e3'].map(id => ({ id, target: {}, sets: [set(), set()] })) })
const clone = v => JSON.parse(JSON.stringify(v))
// What the store does after a change: the watcher's answer written into the session.
const follow = (prev, next) => { const c = curAfter(prev, next); if (c != null) next.cur = c; return next }

describe('the notification follows the screen, not upstream’s current exercise (D127)', () => {
  it('a swap of the last exercise before any tick leaves the notification on the first', () => {
    const prev = session()
    const next = clone(prev)
    swapActiveExercise(next, 3, { id: 'x3', target: {}, sets: [set(), set()] })
    follow(prev, next)
    expect(upcomingSets({ active: next })[0].entryIdx).toBe(0)
  })

  it('after a tick it is the set the screen opens next', () => {
    const prev = session()
    prev.cur = 3
    const next = clone(prev)
    next.entries[1].sets[0] = set(true, 1000)
    follow(prev, next)
    expect(next.cur).toBe(1)
    expect(upcomingSets({ active: next })[0]).toMatchObject({ entryIdx: 1, setIdx: 1 })
  })

  it('a change of numbers alone, or a saved workout being edited, leaves it as it is', () => {
    const prev = session()
    prev.cur = 2
    const typed = clone(prev)
    typed.entries[0].sets[0].w = 25
    expect(curAfter(prev, typed)).toBe(null)
    const edit = { ...clone(prev), editingWorkoutId: 'w1' }
    const ticked = clone(edit)
    ticked.entries[0].sets[0] = set(true, 1000)
    expect(curAfter(edit, ticked)).toBe(null)
  })

  it('in the store: a swap of the last exercise puts the notification back on the first', () => {
    useStore.setState({ S: { ...clone(DEF), active: session() } })
    const off = initCurFollow(storeAdapter(useStore, () => {}))
    try {
      useStore.getState().update(s => { swapActiveExercise(s.active, 3, { id: 'x3', target: {}, sets: [set(), set()] }) })
      expect(useStore.getState().S.active.cur).toBe(0)
      expect(upcomingSets(useStore.getState().S)[0].entryIdx).toBe(0)
    } finally { off() }
  })
})
