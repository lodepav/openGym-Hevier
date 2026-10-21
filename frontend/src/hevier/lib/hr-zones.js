// [hevier] Heart-rate zones for the strap's full-screen view (hevier/DECISIONS.md D80). Five zones as
// a share of the maximum heart rate, 50–60–70–80–90–100 %, the model Garmin, Polar and Zepp use by
// default (after ACSM's intensity bands). The maximum is the one the user typed (a measured one),
// else estimated from the birth year by Tanaka, Monahan & Seals (2001), 208 − 0.7 × age, which their
// meta-analysis of 351 studies found closer than 220 − age, the more so past 40.

export const ZONES = [
  { n: 1, lo: 0.5, name: 'Warm-up' },
  { n: 2, lo: 0.6, name: 'Easy' },
  { n: 3, lo: 0.7, name: 'Aerobic' },
  { n: 4, lo: 0.8, name: 'Threshold' },
  { n: 5, lo: 0.9, name: 'Maximum' },
]

export const MAX_OK = v => Number.isFinite(v) && v >= 100 && v <= 230
export const YEAR_OK = (y, now = new Date()) => Number.isInteger(y) && y >= now.getFullYear() - 100 && y <= now.getFullYear() - 10

export const tanaka = age => Math.round(208 - 0.7 * age)

/**
 * The maximum heart rate from `S.hvHrMax` (`{ max, born }`): `{ bpm, from: 'set' | 'age' }`, or
 * null when neither is given.
 */
export function maxHr(cfg, now = new Date()) {
  const max = Number(cfg?.max), born = Number(cfg?.born)
  if (MAX_OK(max)) return { bpm: Math.round(max), from: 'set' }
  if (YEAR_OK(born, now)) return { bpm: tanaka(now.getFullYear() - born), from: 'age' }
  return null
}

/** The zone a heart rate is in, 1–5, or 0 below the first. */
export function zoneOf(bpm, max) {
  if (!max || !bpm) return 0
  let z = 0
  for (const { n, lo } of ZONES) if (bpm >= Math.round(lo * max)) z = n
  return z
}

/** Each zone's lowest heart rate in bpm. */
export const zoneFloors = max => ZONES.map(z => Math.round(z.lo * max))

// A gap longer than this between readings (the strap out of reach) counts for no zone.
const GAP_MS = 5000

/** Time spent in each zone, ms, index 0 below zone 1, from `[ms, bpm]` readings in time order. */
export function zoneTimes(samples, max) {
  const out = [0, 0, 0, 0, 0, 0]
  for (let i = 1; i < samples.length; i++) {
    const dt = samples[i][0] - samples[i - 1][0]
    if (dt > 0 && dt <= GAP_MS) out[zoneOf(samples[i - 1][1], max)] += dt
  }
  return out
}

/** Average and highest heart rate of the readings, or null. */
export function summary(samples) {
  if (!samples.length) return null
  let sum = 0, max = 0
  for (const [, b] of samples) { sum += b; if (b > max) max = b }
  return { avg: Math.round(sum / samples.length), max }
}
