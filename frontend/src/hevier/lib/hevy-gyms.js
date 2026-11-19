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
 * lat?, lng? }) is, or null when it is not clear. With a place: the one gym within NEAR_M, or of
 * several there the one whose name matches. Without: the one whose name matches, so call it then
 * only with the account's visited gyms, never with gyms near a point.
 */
export function hevyGymFor(gym, candidates) {
  const name = fold(gym?.name)
  const list = (candidates || []).filter(g => g?.id != null)
  const named = gs => gs.filter(g => sameName(name, fold(g.name)))
  const placed = Number.isFinite(num(gym?.lat)) && Number.isFinite(num(gym?.lng))
  if (!placed) { const m = named(list); return m.length === 1 ? m[0].id : null }
  const here = { lat: num(gym.lat), lng: num(gym.lng) }
  const near = list.filter(g => {
    const at = { lat: num(g.latitude), lng: num(g.longitude) }
    return Number.isFinite(at.lat) && Number.isFinite(at.lng) && distance(here, at) <= NEAR_M
  })
  if (near.length === 1) return near[0].id
  const m = named(near)
  return m.length === 1 ? m[0].id : null
}
