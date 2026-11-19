import { describe, expect, it } from 'vitest'
import { hevyGymFor, gymList } from './hevy-gyms.js'

// The user's two gyms in Riga as Hevy has them, and two made up for the name checks.
const lemon = { id: 1, name: 'Lemon Gym', latitude: 56.9645, longitude: 24.1180 }
const pla = { id: 2, name: 'Lemon Gym Pļavnieki', latitude: 56.9455, longitude: 24.2094 }
const ours = { name: 'Lemon Gym · Grostonas iela 1', lat: 56.9646269, lng: 24.1186412 }

describe('hevier which Hevy gym a gym is (D143)', () => {
  it('takes a Hevy gym within 150 m of the place only when its name matches too', () => {
    expect(hevyGymFor(ours, [pla, lemon])).toBe(1)   // "Lemon Gym" about 40 m away
    expect(hevyGymFor({ name: 'Plavnieki', lat: 56.9454762, lng: 24.2096501 }, [lemon, pla])).toBe(2)
    // Hevy's nearby list holds any place: a yoga studio 44 m off is not our gym.
    expect(hevyGymFor(ours, [{ id: 9, name: 'Yoga Matter', latitude: 56.9650269, longitude: 24.1186412 }])).toBe(null)
    expect(hevyGymFor({ ...ours, name: 'Somewhere else' }, [lemon])).toBe(null)
    // 300 m off is another place.
    expect(hevyGymFor({ ...ours, lat: ours.lat + 0.0027 }, [lemon])).toBe(null)
    expect(hevyGymFor(ours, [{ id: 3, name: 'Lemon Gym' }])).toBe(null)   // no place, no match by name
  })

  it('of several near the place, takes the one whose name matches, the nearest of several, else none', () => {
    const next = { id: 4, name: 'Iron Box', latitude: 56.9646, longitude: 24.1183 }
    expect(hevyGymFor(ours, [next, lemon])).toBe(1)
    expect(hevyGymFor({ ...ours, name: 'Other' }, [next, lemon])).toBe(null)
    // Two that match: the nearer, about 20 m off against about 40 m.
    expect(hevyGymFor(ours, [lemon, { ...next, name: 'Lemon Gym Centrs' }])).toBe(4)
    expect(hevyGymFor(ours, [{ ...next, name: 'Lemon Gym' }, lemon])).toBe(4)
  })

  it('without a place, takes only a single name match, accents and case folded', () => {
    expect(hevyGymFor({ name: 'lemon gym plavnieki' }, [{ id: 6, name: 'Iron Box' }, pla])).toBe(2)
    // "Lemon Gym" is in both names: either could be it.
    expect(hevyGymFor({ name: 'Lemon Gym Pļavnieki' }, [lemon, pla])).toBe(null)
    expect(hevyGymFor({ name: 'Lemon Gym · Grostonas iela 1' }, [lemon])).toBe(1)
    expect(hevyGymFor({ name: 'Lemon Gym' }, [lemon, pla])).toBe(null)
    expect(hevyGymFor({ name: 'Gym' }, [{ id: 5, name: 'Iron' }])).toBe(null)
    expect(hevyGymFor({ name: '' }, [lemon])).toBe(null)
  })

  it('reads Hevy\'s list bare or under a key', () => {
    expect(gymList([lemon, { name: 'no id' }])).toEqual([lemon])
    expect(gymList({ gyms: [lemon] })).toEqual([lemon])
    expect(gymList(null)).toEqual([])
  })
})
