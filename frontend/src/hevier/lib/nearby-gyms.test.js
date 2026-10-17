// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { DEF } from '../../store/useStore.js'
import {
  distance, distanceText, overpassQuery, parsePlaces, fetchPlaces, ownHere, gymOfPlace, rememberPlace, addGym, placeOf,
} from './nearby-gyms.js'

const clone = v => JSON.parse(JSON.stringify(v))
const here = { lat: 47.3769, lng: 8.5417 }

describe('gyms nearby (D47)', () => {
  it('measures and writes distances', () => {
    expect(Math.round(distance(here, { lat: 47.3859, lng: 8.5417 }))).toBe(1001)
    expect(distanceText(43)).toBe('40 m')
    expect(distanceText(1234)).toBe('1.2 km')
  })

  it('asks Overpass for fitness centres, gyms and fitness sports centres around the position', () => {
    const q = overpassQuery(here)
    expect(q).toContain('nwr["leisure"="fitness_centre"](around:2000,47.37690,8.54170)')
    expect(q).toContain('nwr["amenity"="gym"]')
    expect(q).toContain('["sport"~"fitness')
  })

  it('reads named places nearest first, a point and its building once', () => {
    const json = { elements: [
      { type: 'way', id: 9, center: { lat: 47.3800, lon: 8.5417 }, tags: { name: 'Far Gym' } },
      { type: 'node', id: 1, lat: 47.3772, lon: 8.5420, tags: { name: 'NonStop Gym', brand: 'NonStop', 'addr:street': 'Langstrasse', 'addr:housenumber': '1' } },
      { type: 'way', id: 2, center: { lat: 47.3773, lon: 8.5421 }, tags: { name: 'nonstop gym' } },
      { type: 'node', id: 3, lat: 47.3770, lon: 8.5418, tags: { leisure: 'fitness_centre' } },
    ] }
    const out = parsePlaces(json, here)
    expect(out.map(p => [p.osm, p.name, p.sub])).toEqual([
      ['node/1', 'NonStop Gym', 'NonStop · Langstrasse 1'],
      ['way/9', 'Far Gym', ''],
    ])
    expect(parsePlaces(null, here)).toEqual([])
  })

  it('fetches with a GET that names the app, and throws on a failed answer', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ elements: [{ type: 'node', id: 1, lat: 47.377, lon: 8.542, tags: { name: 'A' } }] }) }))
    expect((await fetchPlaces(here, fetcher)).map(p => p.name)).toEqual(['A'])
    const [url, init] = fetcher.mock.calls[0]
    expect(url.startsWith('https://overpass-api.de/api/interpreter?data=')).toBe(true)
    expect(init.headers['User-Agent']).toMatch(/^GoHevier\//)
    await expect(fetchPlaces(here, async () => ({ ok: false, status: 429 }))).rejects.toThrow('429')
  })

  it('a new gym copies the active gym’s equipment (everything with none) and keeps its place', () => {
    const s = clone(DEF)
    s.equipProfiles = [{ id: 'g1', name: 'Home', equipment: ['dumbbell'], accV: 1 }]
    s.activeEquipId = 'g1'
    const id = addGym(s, '  NonStop Gym ', { osm: 'node/1', name: 'NonStop Gym', lat: 47.3772, lng: 8.542, dist: 40, sub: 'x' })
    const g = s.equipProfiles.find(x => x.id === id)
    expect(g.name).toBe('NonStop Gym')
    expect(g.equipment).toEqual(['dumbbell'])
    expect(placeOf(s, id)).toEqual({ lat: 47.3772, lng: 8.542, osm: 'node/1', name: 'NonStop Gym' })
    expect(gymOfPlace(s, 'node/1').id).toBe(id)
    s.activeEquipId = null
    const other = addGym(s, 'Other')
    expect(s.equipProfiles.find(x => x.id === other).equipment.length).toBeGreaterThan(10)
  })

  it('your own gym is “here” within its reach, nearest first', () => {
    const s = clone(DEF)
    s.equipProfiles = [{ id: 'g1', name: 'A' }, { id: 'g2', name: 'B' }, { id: 'g3', name: 'C' }]
    rememberPlace(s, 'g1', { lat: 47.3780, lng: 8.5417 })   // ~120 m
    rememberPlace(s, 'g2', { lat: 47.3770, lng: 8.5417 })   // ~10 m
    rememberPlace(s, 'g3', { lat: 47.3869, lng: 8.5417 })   // ~1.1 km
    expect(ownHere(s, here).map(g => g.id)).toEqual(['g2', 'g1'])
    expect(ownHere(s, { ...here, accuracy: 2000 }).map(g => g.id)).toEqual(['g2', 'g1', 'g3'])
  })
})
