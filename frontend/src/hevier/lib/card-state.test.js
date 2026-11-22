import { describe, expect, it } from 'vitest'
import { equal, propsSig, sameForCard, sameForRoutineCard } from './card-state.js'

const clone = v => JSON.parse(JSON.stringify(v))
const set = (w, done = false) => ({ w, r: 8, done })
const base = () => {
  const settings = { unit: 'kg' }
  return {
    unit: 'kg', settings, workouts: [], _ts: 1, deleted: {}, edited: {},
    active: { id: 'a', start: 1, cur: 0, entries: [{ id: 'x', sets: [set(60)] }, { id: 'y', sets: [set(40)] }, { id: 'z', sets: [set(20)] }] },
  }
}
// What update() hands back after an edit: active copied whole, the stamps remade, the rest kept.
const after = (S, fn) => { const n = { ...S, active: clone(S.active), _ts: S._ts + 1, deleted: {}, edited: {} }; fn(n); return n }

describe('the exercise cards that a change re-renders (sameForCard)', () => {
  it('leaves the other cards alone when one entry changes', () => {
    const a = base()
    const b = after(a, n => { n.active.entries[1].sets[0].w = 45 })
    expect(sameForCard(a, b, 0)).toBe(true)
    expect(sameForCard(a, b, 1)).toBe(false)
    expect(sameForCard(a, b, 2)).toBe(true)
  })

  it('re-renders a superset partner', () => {
    const a = base()
    const b = after(a, n => { n.active.entries[1].sets[0].done = true })
    expect(sameForCard(a, b, 2, [1, 2])).toBe(false)
    expect(sameForCard(a, b, 0, null)).toBe(true)
  })

  it('takes a field only read by the update as unchanged, and a changed one as changed', () => {
    const a = base()
    expect(sameForCard(a, after(a, n => { n.settings = clone(n.settings) }), 0)).toBe(true)
    expect(sameForCard(a, after(a, n => { n.settings = { unit: 'lb' } }), 0)).toBe(false)
    expect(sameForCard(a, after(a, n => { n.workouts = [{ id: 'w' }] }), 0)).toBe(false)
  })

  it('re-renders every card when a partner leaves a superset, so the rest see the new rounds', () => {
    const a = base()
    a.active.entries.forEach(e => { e.sg = 's' })
    const b = after(a, n => { delete n.active.entries[2].sg })
    expect(sameForCard(a, b, 0, [0, 1, 2])).toBe(false)
    expect(sameForCard(a, b, 1, [0, 1])).toBe(false)
  })

  it('re-renders every card for the session’s own fields and for an exercise added, not for cur', () => {
    const a = base()
    expect(sameForCard(a, after(a, n => { n.active.cur = 2 }), 0)).toBe(true)
    expect(sameForCard(a, after(a, n => { n.active.name = 'Legs' }), 0)).toBe(false)
    expect(sameForCard(a, after(a, n => { n.active.entries.push({ id: 'q', sets: [] }) }), 0)).toBe(false)
    expect(sameForCard(a, { ...a, active: null }, 0)).toBe(false)
  })
})

describe('equal', () => {
  it('compares by content', () => {
    expect(equal({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true)
    expect(equal({ a: 1 }, { a: 1, b: undefined })).toBe(false)
    expect(equal([1], { 0: 1 })).toBe(false)
    expect(equal(null, {})).toBe(false)
  })
})

describe('propsSig', () => {
  it('changes with a value or a handler coming or going, not with a new handler', () => {
    const sig = propsSig({ busy: false, open: { idx: 0, i: 1 }, onRest: () => 1, onNoProg: null })
    expect(propsSig({ busy: false, open: { idx: 0, i: 1 }, onRest: () => 2, onNoProg: null })).toBe(sig)
    expect(propsSig({ busy: false, open: { idx: 0, i: 2 }, onRest: () => 2, onNoProg: null })).not.toBe(sig)
    expect(propsSig({ busy: false, open: { idx: 0, i: 1 }, onRest: null, onNoProg: null })).not.toBe(sig)
  })
})

describe('the routine editor cards a change redraws (sameForRoutineCard)', () => {
  const ex = (id, reps) => ({ id, sets: 3, reps })
  const S = () => ({ unit: 'kg', routines: [{ id: 'r', name: 'Push', ex: [ex('a', 8), ex('b', 10), ex('c', 12)] }, { id: 'q', name: 'Pull', ex: [ex('d', 5)] }] })
  it('a key in one exercise redraws that card, its superset partners and the card after it, not the others', () => {
    const a = S(), b = S(); b.routines[0].ex[1].reps = 11
    expect(sameForRoutineCard(a, b, 'r', 0)).toBe(true)
    expect(sameForRoutineCard(a, b, 'r', 1)).toBe(false)
    expect(sameForRoutineCard(a, b, 'r', 0, [0, 1])).toBe(false)
    expect(sameForRoutineCard(a, b, 'r', 2)).toBe(false)   // its link button reads the one before
  })
  it('a superset made anywhere redraws every card: the move menu reads the layout', () => {
    const a = S(), b = S(); b.routines[0].ex[1].sg = 'g'; b.routines[0].ex[2].sg = 'g'
    expect(sameForRoutineCard(a, b, 'r', 0)).toBe(false)
  })
  it('the routine’s own fields, another routine or another field of S redraw every card', () => {
    for (const change of [b => { b.routines[0].prog = 'linear' }, b => { b.routines[1].ex[0].reps = 6 }, b => { b.unit = 'lb' }, b => { b.routines[0].ex.push(ex('e', 1)) }]) {
      const a = S(), b = S(); change(b)
      expect(sameForRoutineCard(a, b, 'r', 0)).toBe(false)
    }
  })
  it('the name, which the title writes, still redraws the cards (it is the routine’s own field)', () => {
    const a = S(), b = S(); b.routines[0].name = 'Push 2'
    expect(sameForRoutineCard(a, b, 'r', 0)).toBe(false)
  })
})
