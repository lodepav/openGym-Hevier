// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { DEF } from '../../store/useStore.js'
import {
  distance, distanceText, overpassQuery, parsePlaces, fetchPlaces, placesNear, forgetPlaces, ownHere, gymOfPlace, rememberPlace, addGym, placeOf,
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
    expect(q).toContain('nwr["leisure"="fitness_centre"](around:2000,47.377,8.542)')
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

  const photon = { ok: true, json: async () => ({ features: [
    { properties: { osm_type: 'W', osm_id: 7, name: 'B', street: 'Weinbergstrasse', housenumber: '5' }, geometry: { coordinates: [8.5415, 47.3772] } },
    { properties: { osm_type: 'N', osm_id: 8 }, geometry: { coordinates: [8.54, 47.377] } },   // no name
  ] }) }
  const overpass = { ok: true, json: async () => ({ elements: [{ type: 'node', id: 1, lat: 47.377, lon: 8.542, tags: { name: 'A' } }] }) }
  const host = u => new URL(u).host

  it('asks Photon first, with a GET that names the app, and reads its places as Overpass’s', async () => {
    const fetcher = vi.fn(async () => photon)
    expect(await fetchPlaces(here, fetcher)).toMatchObject([{ osm: 'way/7', name: 'B', sub: 'Weinbergstrasse 5' }])
    const [url, init] = fetcher.mock.calls[0]
    expect(url).toMatch(/^https:\/\/photon\.komoot\.io\/reverse\?lat=47\.377&lon=8\.542&radius=2&osm_tag=leisure:fitness_centre/)
    expect(init.headers['User-Agent']).toMatch(/^GoHevier\//)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('asks Overpass when Photon fails, keeps silent or finds none, and throws when both fail', async () => {
    vi.useFakeTimers()
    try {
      for (const first of [async () => ({ ok: false, status: 500 }), () => new Promise(() => {}), async () => ({ ok: true, json: async () => ({ features: [] }) })]) {
        const fetcher = vi.fn().mockImplementationOnce(first).mockImplementationOnce(async () => overpass)
        const p = fetchPlaces(here, fetcher)
        await vi.advanceTimersByTimeAsync(5e3)
        expect((await p).map(x => x.name)).toEqual(['A'])
        expect(fetcher.mock.calls.map(([u]) => host(u))).toEqual(['photon.komoot.io', 'overpass-api.de'])
      }
    } finally { vi.useRealTimers() }
    await expect(fetchPlaces(here, async () => ({ ok: false, status: 429 }))).rejects.toThrow('429')
  })

  it('a new gym copies the active gym’s equipment (everything with none) and keeps its place', () => {
    const s = clone(DEF)
    s.equipProfiles = [{ id: 'g1', name: 'Home', equipment: ['dumbbell'], accV: 1 }]
    s.activeEquipId = 'g1'
    const id = addGym(s, '  NonStop Gym ', { osm: 'node/1', name: 'NonStop Gym', lat: 47.3772, lng: 8.542, dist: 40, sub: 'x' })
    const g = s.equipProfiles.find(x => x.id === id)
    expect(g.name).toBe('NonStop Gym')
    // A gym saved before D62 has body weight; the copy says so, and from now on its ticks decide.
    expect(g.equipment).toEqual(['dumbbell', 'body weight'])
    expect(g.hvBw).toBe(1)
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
    expect(ownHere(s, { ...here, accuracy: 1500 }).map(g => g.id)).toEqual(['g2', 'g1'])
    rememberPlace(s, 'g3', { lat: 47.3849, lng: 8.5417 })   // ~890 m
    expect(ownHere(s, { ...here, accuracy: 1500 }).map(g => g.id)).toEqual(['g2', 'g1', 'g3'])
  })

  it('a second search soon after, close by, is answered from the first; far or late asks again', async () => {
    forgetPlaces()
    const fetcher = vi.fn(async () => photon)
    await placesNear(here, { fetcher, now: 0 })
    const again = await placesNear({ lat: 47.3770, lng: 8.5417 }, { fetcher, now: 5 * 60e3 })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(again[0].dist).toBeLessThan(60)
    await placesNear(here, { fetcher, now: 11 * 60e3 })
    expect(fetcher).toHaveBeenCalledTimes(2)
    await placesNear({ lat: 47.3869, lng: 8.5417 }, { fetcher, now: 12 * 60e3 })
    expect(fetcher).toHaveBeenCalledTimes(3)
  })
})
