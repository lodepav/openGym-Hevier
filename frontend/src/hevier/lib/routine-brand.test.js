import { describe, expect, it } from 'vitest'
import { routineBrand, setRoutineBrand } from './routine-brand.js'
import { entryBrand } from './gym-labels.js'

const MACHINE = '1027'   // assisted single leg press (leverage machine)
const gyms = [{ id: 'g1', name: 'City Gym' }, { id: 'g2', name: 'Home' }]
const state = (extra = {}) => ({ equipProfiles: gyms, activeEquipId: 'g1', workouts: [], ...extra })

describe('the routine editor’s brand (D130)', () => {
  it('reads and writes the brand at the active gym, which a session started there opens with', () => {
    const S = state({ hvMachines: { [MACHINE]: { g2: 'Matrix' } } })
    expect(routineBrand(S, MACHINE)).toBe(null)
    setRoutineBrand(S, MACHINE, '  Technogym ')
    expect(S.hvMachines[MACHINE]).toEqual({ g1: 'Technogym', g2: 'Matrix' })
    expect(routineBrand(S, MACHINE)).toBe('Technogym')
    expect(entryBrand(S, { entries: [{ id: MACHINE }] }, 0)).toBe('Technogym')
  })

  it('an empty brand removes it, and the exercise once it has none anywhere', () => {
    const S = state({ hvMachines: { [MACHINE]: { g1: 'Technogym' } } })
    setRoutineBrand(S, MACHINE, '')
    expect(S.hvMachines).toEqual({})
  })

  it('with no gym chosen it is the brand with no gym', () => {
    const S = state({ activeEquipId: 'gone' })
    setRoutineBrand(S, MACHINE, 'Hammer Strength')
    expect(S.hvMachines[MACHINE]).toEqual({ '': 'Hammer Strength' })
    expect(routineBrand(S, MACHINE)).toBe('Hammer Strength')
  })
})
