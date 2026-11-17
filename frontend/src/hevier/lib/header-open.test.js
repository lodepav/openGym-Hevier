import { describe, expect, it } from 'vitest'
import { scrollZone, progressOpen, resolveOpen, TOP_OPEN, TOP_CLOSE, END_OPEN, END_CLOSE } from './header-open.js'

const DETAILS = 100   // the details' height, roughly: a 44 px gym row, the note button, 6 px margin
const set = done => ({ w: 20, r: 8, done })

describe('scrollZone: the page edges, with room for the details to open (D127)', () => {
  it('opens at the top and at the bottom, not in between', () => {
    expect(scrollZone(null, 0, 2000)).toEqual({ top: true, end: false })
    expect(scrollZone(null, 1500, 0)).toEqual({ top: false, end: true })
    expect(scrollZone(null, 600, 600)).toEqual({ top: false, end: false })
  })

  it('a page shorter than the screen is at both edges', () => {
    expect(scrollZone(null, 0, -200)).toEqual({ top: true, end: true })
  })

  it('just inside the band keeps what was there before', () => {
    const open = { top: true, end: true }, shut = { top: false, end: false }
    expect(scrollZone(open, TOP_CLOSE, END_CLOSE)).toEqual(open)
    expect(scrollZone(shut, TOP_CLOSE, END_CLOSE)).toEqual(shut)
    expect(scrollZone(shut, TOP_OPEN + 1, END_OPEN + 1)).toEqual(shut)
    expect(scrollZone(open, TOP_CLOSE + 1, END_CLOSE + 1)).toEqual(shut)
    expect(scrollZone(shut, TOP_OPEN, END_OPEN)).toEqual(open)
  })

  it('tall details at the bottom (a long note) stay open: their height leaves the gap', () => {
    const at = scrollZone(null, 1500, END_OPEN)
    expect(at.end).toBe(true)
    // Opened: the page grows by 400 px below the scroll offset, and the details are measured as 400.
    expect(scrollZone(at, 1500, END_OPEN + 400, 400).end).toBe(true)
    // Without subtracting them the gap would be past the band and the details would close again.
    expect(scrollZone(at, 1500, END_OPEN + 400).end).toBe(false)
  })

  it('tall details at the top (304 px) never flip back, with scroll anchoring or without', () => {
    const H = 304
    const open = { top: true, end: false }, shut = { top: false, end: false }
    // Opened at the top: anchoring pushes the offset down by H; still open.
    for (const y of [TOP_OPEN, TOP_OPEN + H]) expect(scrollZone(open, y, 2000, H).top).toBe(true)
    // Past the old 240 mark with H open: still open, no close that anchoring would undo.
    expect(scrollZone(open, 322, 2000, H).top).toBe(true)
    // Closed just past H + 60: anchoring pulls the offset up by H (details now 0); still closed.
    const y = H + 61
    expect(scrollZone(open, y, 2000, H).top).toBe(false)
    for (const after of [y, y - H]) expect(scrollZone(shut, after, 2000, 0).top).toBe(false)
  })

  it('each band is wider than the details, so opening or closing them never flips it back', () => {
    expect(TOP_CLOSE - TOP_OPEN).toBeGreaterThan(DETAILS)
    expect(END_CLOSE - END_OPEN).toBeGreaterThan(DETAILS)
    // Opened at an edge: the page moves by the details' height (or not, with scroll anchoring); still open.
    for (const shift of [0, DETAILS]) {
      expect(scrollZone({ top: true, end: false }, TOP_OPEN + shift, 2000).top).toBe(true)
      expect(scrollZone({ top: false, end: true }, 1500, END_OPEN + shift).end).toBe(true)
    }
    // Closed just past the band: the page shrinks back by the details' height (or not); still closed.
    for (const shift of [0, DETAILS]) {
      expect(scrollZone({ top: false, end: false }, TOP_CLOSE + 1 - shift, 2000).top).toBe(false)
      expect(scrollZone({ top: false, end: false }, 1500, END_CLOSE + 1 - shift).end).toBe(false)
    }
  })
})

describe('progressOpen: just started or near the end (D127)', () => {
  const A = (...entries) => ({ entries: entries.map(sets => ({ id: 'x', sets })) })
  const solo = n => Array.from({ length: n }, (_, i) => [i])

  it('an empty workout, or one with nothing ticked, is just started', () => {
    expect(progressOpen({ entries: [] }, [])).toBe(true)
    expect(progressOpen(A([set(false)], [set(false)]), solo(2))).toBe(true)
  })

  it('a ticked warm-up counts as a set', () => {
    const w = A([{ ...set(true), type: 'warmup' }, set(false)], [set(false)])
    expect(progressOpen(w, solo(2))).toBe(false)
  })

  it('every set ticked is near the end', () => {
    expect(progressOpen(A([set(true)], [set(true)]), solo(2))).toBe(true)
  })

  it('one exercise left is near the end, wherever it sits in the list', () => {
    expect(progressOpen(A([set(true)], [set(false)]), solo(2))).toBe(true)
    expect(progressOpen(A([set(true)], [set(true), set(false)], [set(true)]), solo(3))).toBe(true)
  })

  it('a superset as the only unit left is near the end', () => {
    expect(progressOpen(A([set(true)], [set(false)], [set(false)]), [[0], [1, 2]])).toBe(true)
  })

  it('a one-exercise session part way through counts as near the end', () => {
    expect(progressOpen(A([set(true), set(false)]), solo(1))).toBe(true)
  })

  it('the last-listed exercise done first, with two others left, is not near the end', () => {
    expect(progressOpen(A([set(false)], [set(false)], [set(true)]), solo(3))).toBe(false)
    expect(progressOpen(A([set(true), set(false)], [set(false)]), solo(2))).toBe(false)
  })
})

describe('resolveOpen: a tap holds until the rule changes (D127)', () => {
  it('without a tap it is the rule', () => {
    expect(resolveOpen(true, null)).toEqual({ open: true, manual: null })
    expect(resolveOpen(false, null)).toEqual({ open: false, manual: null })
  })

  it('a tap holds while the rule stays, and lets go when it moves', () => {
    const tap = { auto: true, open: false }
    expect(resolveOpen(true, tap)).toEqual({ open: false, manual: tap })
    expect(resolveOpen(false, tap)).toEqual({ open: false, manual: null })
  })

  it('once let go, the rule moving back does not bring the tap back', () => {
    let manual = { auto: true, open: false }
    manual = resolveOpen(false, manual).manual
    expect(resolveOpen(true, manual)).toEqual({ open: true, manual: null })
  })
})
