// A Bluetooth heart-rate strap read live during a workout (hevier/DECISIONS.md D79): a chest strap,
// an armband or a watch that pushes its heart rate over Bluetooth's standard Heart Rate profile
// (service 0x180D). The phone records every reading the strap notifies, beat by beat, and when the
// workout is saved its sets and the session get the heart rate as D27's Health Connect read gives
// it (lib/heart-rate.js hrFromSamples), from far denser readings: Health Connect often holds a
// band's one-minute averages, so a short peak never shows there.
//
// Pure: the native side (HevierHrStrapService.java) writes each notification as it came, one line
// `<ms> <hex>` in a file per workout; this decodes them and decides what goes into the log.
import { hrFromSamples } from './heart-rate.js'
import { stampWorkout } from '../../lib/sync-merge.js'

const BPM_MIN = 25
const BPM_MAX = 250
export const SRC = 'strap'

const bytesOf = v => {
  if (typeof v === 'string') {
    const hex = v.replace(/[^0-9a-f]/gi, '')
    if (hex.length % 2) return null
    const out = []
    for (let i = 0; i < hex.length; i += 2) out.push(parseInt(hex.slice(i, i + 2), 16))
    return out
  }
  return v && typeof v.length === 'number' ? Array.from(v, x => x & 255) : null
}

/**
 * A Heart Rate Measurement (characteristic 0x2A37) as the standard lays it out: a flags byte (bit 0
 * a 16-bit value, bits 1–2 skin contact, bit 3 energy expended, bit 4 RR intervals), the heart
 * rate, then the optional fields. `{ bpm, contact, rr }`: `contact` true / false, or null when the
 * strap cannot tell; `rr` the beat-to-beat intervals in ms. Null for a value too short to read.
 */
export function decodeHrm(value) {
  const b = bytesOf(value)
  if (!b || b.length < 2) return null
  const flags = b[0]
  const u16 = flags & 1
  if (u16 && b.length < 3) return null
  const bpm = u16 ? b[1] | (b[2] << 8) : b[1]
  let i = u16 ? 3 : 2
  const contact = flags & 4 ? !!(flags & 2) : null
  if (flags & 8) i += 2
  const rr = []
  if (flags & 16) for (; i + 1 < b.length; i += 2) rr.push(Math.round(((b[i] | (b[i + 1] << 8)) * 1000) / 1024))
  return { bpm, contact, rr }
}

/** A reading worth keeping: a plausible heart rate, from a strap that is not off the skin. */
export const plausible = r => !!r && r.contact !== false && r.bpm >= BPM_MIN && r.bpm <= BPM_MAX

/** The recorded file's `<ms> <hex>` lines as [ms, bpm] pairs, oldest first, the implausible left out. */
export function parseRecording(text) {
  const out = []
  for (const line of String(text || '').split('\n')) {
    const [ms, hex] = line.trim().split(/\s+/)
    const t = Number(ms)
    if (!(t > 0) || !hex) continue
    const r = decodeHrm(hex)
    if (plausible(r)) out.push([t, r.bpm])
  }
  return out.sort((a, b) => a[0] - b[0])
}

/** A workout the strap records for: a live one, not one logged into the past or being edited. */
export const recordable = A => !!A?.id && !A.backfill && !A.editingWorkoutId

/**
 * The strap's readings put into the saved workout `wid` of the log `S` (mutated). They are the
 * densest there are, so they take the place of a heart rate the hub gave (Health Connect, D27):
 * the session's, and each set's and rest's they cover; a set they do not cover keeps its own.
 * Returns whether anything changed.
 */
export function mergeStrap(S, wid, samples, now = Date.now()) {
  const w = (S?.workouts || []).find(x => x && x.id === wid)
  if (!w) return false
  const res = hrFromSamples(w, samples)
  if (!res.session) return false
  w.hr = { ...res.session, src: SRC, n: res.n }
  for (const [key, got] of res.sets) {
    const [ei, si] = key.split(':').map(Number)
    const set = w.entries?.[ei]?.sets?.[si]
    if (!set) continue
    if (got.hr) set.hr = got.hr
    if (got.restHr) set.restHr = got.restHr
  }
  stampWorkout(w, now)
  return true
}

/** How long a reading stays the "live" heart rate on screen, after which the strap reads as quiet. */
export const LIVE_MS = 5000
export const liveBpm = (last, now = Date.now()) => (last && now - last.t <= LIVE_MS ? last.bpm : null)
