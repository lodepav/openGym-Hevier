import { describe, expect, it } from 'vitest'
import { compareUrl, levelGroups, levelsIn, setLevels, strengthLevel, validLevels } from './strength-level.js'
import { mergeStates, stampChange } from '../../lib/sync-merge.js'

const LV = [60, 80, 100, 130, 160]

describe('hevier strength level (D19)', () => {
  it('accepts only five rising positive numbers', () => {
    expect(validLevels(['60', 80, 100, 130, 160])).toEqual(LV)
    expect(validLevels([60, 80, 80, 130, 160])).toBeNull()
    expect(validLevels([0, 80, 100, 130, 160])).toBeNull()
    expect(validLevels([60, 80, 100, 130])).toBeNull()
    expect(validLevels([60, 80, '', 130, 160])).toBeNull()
  })

  it('places a 1RM between two levels', () => {
    expect(strengthLevel(115, LV)).toEqual({ level: 2, next: 3, toNext: 15, pos: (2 + 0.5) / 5 })
  })

  it('reaching a threshold reaches that level', () => {
    expect(strengthLevel(100, LV)).toMatchObject({ level: 2, next: 3, toNext: 30 })
  })

  it('below Beginner the marker sits at the start', () => {
    expect(strengthLevel(40, LV)).toEqual({ level: -1, next: 0, toNext: 20, pos: 0 })
  })

  it('past Elite there is no next level and the bar is full', () => {
    expect(strengthLevel(200, LV)).toEqual({ level: 4, next: null, toNext: 0, pos: 1 })
  })

  it('converts an entry typed in another unit, and ignores a broken one', () => {
    expect(levelsIn({ lv: [100, 135, 185, 245, 300], u: 'lb' }, 'kg')).toEqual([45.25, 61.25, 84, 111.25, 136])
    expect(levelsIn({ lv: LV, u: 'kg' }, 'kg')).toEqual(LV)
    expect(levelsIn({ lv: [1, 2] }, 'kg')).toBeNull()
    expect(levelsIn(undefined, 'kg')).toBeNull()
  })

  it('links to the exercise’s standards page when it is known, else the index', () => {
    expect(compareUrl('0025', 'lb')).toBe('https://strengthlevel.com/strength-standards/bench-press/lb')
    expect(compareUrl('0025', 'kg')).toBe('https://strengthlevel.com/strength-standards/bench-press/kg')
    expect(compareUrl('nope', 'kg')).toBe('https://strengthlevel.com/strength-standards')
  })

  it('saves and removes an exercise’s entry without touching the others', () => {
    const S = { hvStrength: { b: { lv: LV, u: 'kg', d: '2026-01-01' } } }
    setLevels(S, 'a', LV, 'lb', '2026-10-17')
    expect(S.hvStrength).toEqual({ b: { lv: LV, u: 'kg', d: '2026-01-01' }, a: { lv: LV, u: 'lb', d: '2026-10-17' } })
    setLevels(S, 'b', null)
    expect(Object.keys(S.hvStrength)).toEqual(['a'])
  })

  it('survives a sync merge, the newer copy’s', () => {
    const base = { unit: 'kg', workouts: [], routines: [], _ts: 1 }
    const edit = (prev, fn, wall) => { const next = structuredClone(prev); fn(next); next._ts = stampChange(prev, next, wall); return next }
    const phone = edit(base, s => setLevels(s, 'a', LV, 'kg', '2026-10-17'), 100)
    const laptop = edit(base, s => { s.unit = 'kg' }, 50)
    expect(mergeStates(phone, laptop).hvStrength).toEqual({ a: { lv: LV, u: 'kg', d: '2026-10-17' } })
    expect(mergeStates(laptop, phone).hvStrength).toEqual({ a: { lv: LV, u: 'kg', d: '2026-10-17' } })
  })
})

describe('levelGroups', () => {
  const lv = { lv: [40, 60, 80, 100, 120], u: 'kg', d: '2026-10-01' }
  const rm = { a: 130, b: 85, c: 95, d: 30, e: 0 }
  it('groups by the level reached, Elite first, nearest the next level first, unlogged last', () => {
    const g = levelGroups({ a: lv, b: lv, c: lv, d: lv, e: lv }, 'kg', id => rm[id])
    expect(g.map(x => x.level)).toEqual([4, 2, -1, null])
    expect(g[1].items.map(x => x.id)).toEqual(['c', 'b'])
    expect(g[1].items[0]).toMatchObject({ oneRm: 95, next: 3, toNext: 5 })
    expect(g[0].items[0]).toMatchObject({ id: 'a', next: null })
    expect(g[3].items[0]).toMatchObject({ id: 'e', next: null })
  })
  it('reads each entry in its own unit and skips unusable ones', () => {
    const g = levelGroups({ a: { lv: [100, 150, 200, 250, 300], u: 'lb' }, x: { lv: [1, 2] } }, 'kg', () => 50)
    expect(g).toHaveLength(1)
    expect(g[0].level).toBe(0)   // 50 kg ≈ 110 lb: Beginner
  })
  it('is empty without levels', () => {
    expect(levelGroups(undefined, 'kg', () => 0)).toEqual([])
  })
})
