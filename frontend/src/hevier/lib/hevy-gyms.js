// Which of Hevy's gyms a workout's gym is (hevier/DECISIONS.md D143), so the workout goes to Hevy
// at that gym. Pure: the runner (hevy-export-sync.js) reads Hevy's lists and keeps the matches.
import { distance } from './nearby-gyms.js'

export const NEAR_M = 150

const fold = s => String(s || '').split(' · ')[0].normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const num = v => (v == null || v === '' ? NaN : Number(v))
const sameName = (a, b) => !!a && !!b && (a === b || a.includes(b) || b.includes(a))

/** A list of Hevy's gyms from a reply: the array, or the first array under a key. */
export const gymList = res => (Array.isArray(res) ? res : Object.values(res || {}).find(Array.isArray) || [])
  .filter(g => g?.id != null)

/**
 * The id of the Hevy gym (`candidates`: { id, name, latitude, longitude }) that `gym` ({ name,
 * lat?, lng? }) is, or null when it is not clear. With a place: of the gyms within NEAR_M whose
 * name matches, the nearest (Hevy's nearby list holds yoga studios and clinics too, so a near
 * place with another name is never taken). Without: the one whose name matches, so call it then
 * only with the account's visited gyms, never with gyms near a point.
 */
export function hevyGymFor(gym, candidates) {
  const name = fold(gym?.name)
  const list = (candidates || []).filter(g => g?.id != null)
  const named = gs => gs.filter(g => sameName(name, fold(g.name)))
  const placed = Number.isFinite(num(gym?.lat)) && Number.isFinite(num(gym?.lng))
  if (!placed) { const m = named(list); return m.length === 1 ? m[0].id : null }
  const here = { lat: num(gym.lat), lng: num(gym.lng) }
  const near = named(list).map(g => ({ id: g.id, at: { lat: num(g.latitude), lng: num(g.longitude) } }))
    .filter(g => Number.isFinite(g.at.lat) && Number.isFinite(g.at.lng))
    .map(g => ({ id: g.id, d: distance(here, g.at) })).filter(g => g.d <= NEAR_M)
    .sort((a, b) => a.d - b.d)
  return near.length ? near[0].id : null
}
