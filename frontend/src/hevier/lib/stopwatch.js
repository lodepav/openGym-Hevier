// The workout's stopwatch (hevier/DECISIONS.md D10, changed 2026-10-17): Hevy's clock has a
// Timer and a Stopwatch, for a plank or a carry timed outside a timed set. Nothing is logged: it
// only counts. Its state is `{ session, since, acc }`: the session it belongs to (the workout's
// start), when it was last started (null while stopped) and the milliseconds counted before that.
// It is kept on the device (localStorage `hevier_stopwatch`), so it keeps counting while the app
// is in the background or reloads, and a new workout starts it from zero.
import { create } from 'zustand'

const KEY = 'hevier_stopwatch'
const EMPTY = { session: null, since: null, acc: 0 }

/** Milliseconds the stopwatch shows at `now`. */
export const elapsed = (w, now) => Math.max(0, (w?.acc || 0) + (w?.since != null ? now - w.since : 0))
export const running = w => w?.since != null
/** Started, or stopped with time on it. */
export const showing = w => running(w) || (w?.acc || 0) > 0

export const startW = (w, now) => (running(w) ? w : { ...w, since: now })
export const stopW = (w, now) => (running(w) ? { ...w, acc: elapsed(w, now), since: null } : w)
export const resetW = w => ({ ...w, since: null, acc: 0 })
/** The stopwatch of `session`: a stopwatch of another session reads as a fresh one. */
export const ofSession = (w, session) => (w && w.session === session ? w : { ...EMPTY, session })

/** "0:42.3", "12:05.0", "1:02:05.0": tenths, as Hevy's stopwatch shows them. */
export function stopwatchText(ms) {
  const tenth = Math.floor(ms / 100)
  const s = Math.floor(tenth / 10), m = Math.floor(s / 60), h = Math.floor(m / 60)
  const ss = String(s % 60).padStart(2, '0') + '.' + (tenth % 10)
  return h ? `${h}:${String(m % 60).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** "0:42", for the header: whole seconds. */
export const stopwatchShort = ms => stopwatchText(ms).replace(/\.\d$/, '')

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null')
    return v && typeof v === 'object' ? { ...EMPTY, ...v } : EMPTY
  } catch { return EMPTY }
}
function save(w) {
  try { localStorage.setItem(KEY, JSON.stringify(w)) } catch { /* private mode: it lives until reload */ }
}

export const useStopwatch = create(set => ({
  w: load(),
  apply: fn => set(st => { const w = fn(st.w); save(w); return { w } }),
}))
