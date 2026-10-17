// The gym picker's nearby gyms (hevier/DECISIONS.md D47, PLAN.md §5 item 17). Only on a tap of
// "Find gyms nearby": the phone's position, once (HevierLocationPlugin.java, seam S27, or the
// browser's geolocation in the PWA), then OpenStreetMap's gyms around it from the Overpass API.
// The position goes to Overpass in that one request and is kept nowhere. A gym picked from the
// list becomes one of upstream's equipment profiles (D28's gyms), and the place it stands on is
// kept in S.hvGymPlaces ({ [gymId]: { lat, lng, osm, name } }, a fork-only field synced as a
// whole), so the next search puts your own gym first when you are there.
import { MOBILE, isAndroid } from '../../lib/mobile.js'
import { nativeFetch } from '../../lib/capacitor-fetch.js'
import { newProfile, activeProfile, profileEquipment, ALL_EQUIPMENT } from '../../lib/equipment.js'

export const RADIUS = 2000
export const HERE = 250
const MAX = 25
const OVERPASS = 'https://overpass-api.de/api/interpreter'
const USER_AGENT = 'GoHevier/' + (typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev') + ' (gym picker; +https://github.com/lodepav/openGym-Hevier)'

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const list = v => (Array.isArray(v) ? v : [])

/** Metres between two { lat, lng } (haversine). */
export function distance(a, b) {
  const R = 6371e3, rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** "350 m", "1.2 km". */
export const distanceText = m => (m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1)} km`)

/** Overpass QL for the gyms within `radius` metres: fitness centres, and sports centres and gyms tagged for fitness. */
export function overpassQuery({ lat, lng }, radius = RADIUS) {
  const at = `(around:${Math.round(radius)},${lat.toFixed(5)},${lng.toFixed(5)})`
  return `[out:json][timeout:15];(nwr["leisure"="fitness_centre"]${at};nwr["amenity"="gym"]${at};` +
    `nwr["leisure"="sports_centre"]["sport"~"fitness|weightlifting|crossfit|bodybuilding"]${at};);out tags center ${MAX * 2};`
}

const subOf = tags => {
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ')
  const brand = tags.brand && tags.brand !== tags.name ? tags.brand : ''
  return [brand, tags.branch, street].filter(Boolean).join(' · ')
}

/** Overpass's answer as [{ osm, name, sub, lat, lng, dist }], named places only, nearest first, a place drawn twice once. */
export function parsePlaces(json, here) {
  const out = []
  for (const el of list(json?.elements)) {
    const tags = el?.tags || {}
    const name = String(tags.name || '').trim()
    const lat = num(el.lat) ?? num(el.center?.lat), lng = num(el.lon) ?? num(el.center?.lon)
    if (!name || lat == null || lng == null) continue
    const p = { osm: `${el.type}/${el.id}`, name, sub: subOf(tags), lat, lng, dist: distance(here, { lat, lng }) }
    // A gym mapped as both a point and its building has one name, metres apart.
    const twin = out.find(o => o.name.toLowerCase() === name.toLowerCase() && distance(o, p) < 120)
    if (twin) { if (!twin.sub && p.sub) twin.sub = p.sub; continue }
    out.push(p)
  }
  return out.sort((a, b) => a.dist - b.dist).slice(0, MAX)
}

/** OpenStreetMap's gyms around `here`. Throws when Overpass does not answer. */
export async function fetchPlaces(here, fetcher = nativeFetch) {
  const url = OVERPASS + '?data=' + encodeURIComponent(overpassQuery(here))
  const res = await fetcher(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } })
  if (!res.ok) throw new Error('overpass ' + res.status)
  return parsePlaces(await res.json(), here)
}

// Wrapped in an object: a Capacitor plugin proxy answers `then` (as in lib/health-sync.js).
let pluginP = null
async function plugin() {
  if (!MOBILE || !(await isAndroid())) return null
  if (!pluginP) pluginP = import('@capacitor/core').then(({ registerPlugin }) => ({ L: registerPlugin('HevierLocation') }))
  return pluginP
}

/**
 * The phone's position, asking for location the first time: { lat, lng, accuracy }. Throws an
 * Error whose `code` is 'denied' (not allowed), 'off' (location switched off or none here) or
 * 'nofix' (no answer in time).
 */
export async function currentPosition() {
  const fail = code => Object.assign(new Error(code), { code })
  const p = await plugin()
  if (p) {
    const st = await p.L.request().catch(() => null)
    if (st?.location !== 'granted') throw fail('denied')
    try {
      const r = await p.L.position()
      return { lat: r.lat, lng: r.lng, accuracy: num(r.accuracy) }
    } catch (e) {
      const m = String(e?.message || e)
      throw fail(/not allowed/.test(m) ? 'denied' : /switched off|no location/.test(m) ? 'off' : 'nofix')
    }
  }
  const geo = typeof navigator !== 'undefined' ? navigator.geolocation : null
  if (!geo) throw fail('off')
  return new Promise((resolve, reject) => geo.getCurrentPosition(
    pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: num(pos.coords.accuracy) }),
    err => reject(fail(err?.code === 1 ? 'denied' : err?.code === 2 ? 'off' : 'nofix')),
    { enableHighAccuracy: false, timeout: 25000, maximumAge: 10 * 60000 },
  ))
}

/** Where gym `gymId` was tagged, or null. */
export const placeOf = (S, gymId) => {
  const p = S?.hvGymPlaces?.[gymId]
  return p && num(p.lat) != null && num(p.lng) != null ? p : null
}

/** Your own gyms standing within reach of `here` (HERE metres, or the fix's accuracy), nearest first. */
export function ownHere(S, here) {
  const reach = Math.max(HERE, num(here?.accuracy) || 0)
  return list(S?.equipProfiles)
    .map(g => ({ g, at: placeOf(S, g.id) }))
    .filter(x => x.at && distance(here, x.at) <= reach)
    .map(x => ({ ...x.g, dist: distance(here, x.at) }))
    .sort((a, b) => a.dist - b.dist)
}

/** The own gym an OpenStreetMap place was already picked as, or null. */
export const gymOfPlace = (S, osm) => (osm && list(S?.equipProfiles).find(g => placeOf(S, g.id)?.osm === osm)) || null

/** Remembers `place` ({ lat, lng, osm?, name? }) as gym `gymId`'s place, on the draft `s`. */
export function rememberPlace(s, gymId, place) {
  if (!gymId || !place || num(place.lat) == null || num(place.lng) == null) return
  if (!s.hvGymPlaces || typeof s.hvGymPlaces !== 'object') s.hvGymPlaces = {}
  s.hvGymPlaces[gymId] = { lat: place.lat, lng: place.lng, ...(place.osm ? { osm: place.osm } : {}), ...(place.name ? { name: place.name } : {}) }
}

/**
 * A new gym named `name` on the draft `s` (upstream's newProfile), its equipment copied from the
 * active profile (everything, with none), at `place` when given. Returns its id.
 */
export function addGym(s, name, place = null) {
  const g = newProfile(String(name || '').trim().slice(0, 60))
  const from = activeProfile({ ...s, equipFilterOn: true })
  g.equipment = from ? [...profileEquipment(from)] : [...ALL_EQUIPMENT]
  s.equipProfiles = [...list(s.equipProfiles), g]
  rememberPlace(s, g.id, place)
  return g.id
}
