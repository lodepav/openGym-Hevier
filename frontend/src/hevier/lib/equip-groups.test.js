// Equipment in big groups (DECISIONS.md D63).
import { describe, expect, it } from 'vitest'
import { ALL_EQUIPMENT } from '../../lib/equipment.js'
import { EQUIP_GROUPS, groupOf, groupKinds, groupValue, eqMatches, groupState, toggleGroup } from './equip-groups.js'

describe('hevier: equipment groups (D63)', () => {
  it('names every kind the catalogue and a gym’s checklist know, each in one group', () => {
    const named = EQUIP_GROUPS.flatMap(g => g.kinds)
    expect(new Set(named).size).toBe(named.length)
    for (const k of ALL_EQUIPMENT) expect(named, k).toContain(k)
    expect(groupOf('something new')).toBe('other')
  })

  it('sorts kinds into the groups in the groups’ order, an empty group left out', () => {
    expect(groupKinds(['cable', 'dumbbell', 'body weight', 'kettlebell'])).toEqual([
      { id: 'bw', label: 'Body weight', kinds: ['body weight'] },
      { id: 'free', label: 'Free weights', kinds: ['dumbbell', 'kettlebell'] },
      { id: 'cable', label: 'Cables', kinds: ['cable'] },
    ])
  })

  it('a filter value is a kind or a whole group', () => {
    expect(eqMatches('', { eq: 'cable' })).toBe(true)
    expect(eqMatches('dumbbell', { eq: 'kettlebell' })).toBe(false)
    expect(eqMatches(groupValue('free'), { eq: 'kettlebell' })).toBe(true)
    expect(eqMatches(groupValue('free'), { eq: 'barbell' })).toBe(false)
    expect(eqMatches(groupValue('other'), { eq: 'something new' })).toBe(true)
    expect(eqMatches(groupValue('free'), {})).toBe(false)
  })

  it('a group ticks as one: all on when any is off, else all off', () => {
    const kinds = ['band', 'resistance band']
    let have = new Set(['band', 'cable'])
    expect(groupState(kinds, have)).toBe('some')
    have = toggleGroup(have, kinds)
    expect([...have].sort()).toEqual(['band', 'cable', 'resistance band'])
    expect(groupState(kinds, have)).toBe('all')
    have = toggleGroup(have, kinds)
    expect([...have]).toEqual(['cable'])
    expect(groupState(kinds, have)).toBe('none')
  })
})
