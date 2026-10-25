import { describe, it, expect } from 'vitest'
import { makeWarmupAt, makeWorkAt } from '../../lib/history.js'
import { makeSideSet } from '../../lib/workout-model.js'
import { moveOrder, movedTo, relaySuggestions } from './phase-relay.js'

const S = (w, r, extra = {}) => ({ w, r, done: false, ...extra })
const last = (w, r) => S(w, r, { weightOrigin: 'manual', hvLast: 1 })
const pick = rows => rows.map(s => [s.phase === 'warmup' ? 'W' : 'S', s.w, s.r])
// Upstream's move, then the relay, as the workout's set type sheet does it.
function change(rows, i, warm, { free = () => true, prev = [] } = {}) {
  const after = warm ? makeWarmupAt(rows, i) : makeWorkAt(rows, i)
  return relaySuggestions(rows, after, i, movedTo(rows, i), free, prev)
}

describe('hevier phase relay', () => {
  it('knows where each row came from', () => {
    expect(moveOrder(4, 0, 0)).toEqual([0, 1, 2, 3])
    expect(moveOrder(4, 3, 0)).toEqual([3, 0, 1, 2])
    expect(moveOrder(4, 0, 2)).toEqual([1, 2, 0, 3])
  })

  it('a set added and set 1 made a warm-up: the work sets keep last time’s 1–3', () => {
    // Last time 60 × 8, 70 × 8, 80 × 6; a fourth set added copies the third.
    const rows = [last(60, 8), last(70, 8), last(80, 6), S(80, 6)]
    const out = relaySuggestions(rows, makeWarmupAt(rows, 0), 0, 0, () => true)
    expect(pick(out)).toEqual([['W', 60, 8], ['S', 60, 8], ['S', 70, 8], ['S', 80, 6]])
    // still last time's, so still grey until touched
    expect(out[1]).toMatchObject({ weightOrigin: 'manual', hvLast: 1 })
    expect(out[3].hvLast).toBe(1)
  })

  it('the new warm-up takes last time’s warm-up when there was one', () => {
    const rows = [last(60, 8), last(70, 8), last(80, 6), S(80, 6)]
    const prev = [S(40, 10, { phase: 'warmup', done: true }), null, null, null]
    const out = relaySuggestions(rows, makeWarmupAt(rows, 0), 0, 0, () => true, prev)
    expect(pick(out)[0]).toEqual(['W', 40, 10])
  })

  it('the added set made a warm-up: the work sets were already right and stay', () => {
    const rows = [last(60, 8), last(70, 8), last(80, 6), S(80, 6)]
    const out = relaySuggestions(rows, makeWarmupAt(rows, 3), 3, 0, () => true)
    expect(pick(out)).toEqual([['W', 80, 6], ['S', 60, 8], ['S', 70, 8], ['S', 80, 6]])
  })

  it('a typed or ticked row keeps its own numbers, and its slot passes nothing on', () => {
    const rows = [last(60, 8), S(72.5, 8, { weightOrigin: 'manual' }), last(80, 6), S(80, 6)]
    const free = i => i !== 1
    const out = relaySuggestions(rows, makeWarmupAt(rows, 0), 0, 0, free)
    // work set 1 is old row 1, typed: kept; work set 2 (old row 2) takes old work set 2, typed: kept
    expect(pick(out)).toEqual([['W', 60, 8], ['S', 72.5, 8], ['S', 80, 6], ['S', 80, 6]])
    const ticked = [last(60, 8), S(70, 8, { done: true }), last(80, 6)]
    expect(pick(relaySuggestions(ticked, makeWarmupAt(ticked, 0), 0, 0, () => true)))
      .toEqual([['W', 60, 8], ['S', 70, 8], ['S', 70, 8]])
  })

  it('a warm-up made a work set: the work sets keep their slots, the new last one last time’s fourth', () => {
    const rows = [S(40, 10, { phase: 'warmup', warmup: true }), last(60, 8), last(70, 8), last(80, 6)]
    const after = makeWorkAt(rows, 0)
    expect(pick(relaySuggestions(rows, after, 0, 0, () => true))).toEqual([['S', 60, 8], ['S', 70, 8], ['S', 80, 6], ['S', 80, 6]])
    const prev = [null, null, null, S(85, 4, { done: true })]
    expect(pick(relaySuggestions(rows, after, 0, 0, () => true, prev))[3]).toEqual(['S', 85, 4])
  })

  it('per side: the sides follow their slot', () => {
    const side = (w, r) => ({ ...makeSideSet({ w, r: r * 2 }), hvLast: 'LR' })
    const rows = [side(20, 10), side(22, 10), side(24, 8), makeSideSet({ w: 24, r: 16 })]
    const out = relaySuggestions(rows, makeWarmupAt(rows, 0), 0, 0, () => true)
    expect(out.map(s => s.sides.L.w)).toEqual([20, 20, 22, 24])
    expect(out[1].hvLast).toBe('LR')
    expect(out[3].hvLast).toBe('LR')
  })

  it('finds where upstream’s move puts the row, and relays from there', () => {
    const rows = [S(40, 10, { phase: 'warmup', warmup: true }), last(60, 8), last(70, 8), last(80, 6), S(80, 6)]
    expect(movedTo(rows, 4)).toBe(1)
    expect(movedTo(rows, 0)).toBe(0)
    expect(pick(change(rows, 1, true))).toEqual([['W', 40, 10], ['W', 60, 8], ['S', 60, 8], ['S', 70, 8], ['S', 80, 6]])
  })
  it('a warm-up made a work set where a typed row was takes last time’s set, not its warm-up numbers', () => {
    // Set 1 typed (85); set 2 was made a warm-up and filled from last time's warm-up (20 × 5).
    const rows = [S(20, 5, { phase: 'warmup', warmup: true }), S(85, 6, { weightOrigin: 'manual' }), last(80, 8), last(80, 8)]
    const free = i => i !== 1
    const prev = [S(80, 6, { done: true }), S(60, 12, { done: true }), null, null]
    expect(pick(relaySuggestions(rows, makeWorkAt(rows, 0), 0, 0, free, prev)))
      .toEqual([['S', 80, 6], ['S', 85, 6], ['S', 80, 8], ['S', 80, 8]])
  })
})
