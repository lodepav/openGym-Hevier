// The exercise's page (hevier/DECISIONS.md D131) over exercise-summary.js: the last sessions one line
// each, with an arrow against the session before and a star on each set that holds one of the
// page's bests (the tiles: heaviest, best 1RM, best set), and the best at each rep count with the
// ones from the last month marked new. Nothing is stored.
import { beatsWeight, isAssisted } from '../../lib/exercises.js'
import { estimate1RM } from '../../lib/onerm.js'
import { isSideSet } from '../../lib/workout-model.js'
import { setTrend } from './set-trend.js'
import { setEffort } from './side-rows.js'

const DAY = 86400000
const num = v => Number(v) || 0
// A set's done sides, as the summary's records read them; any other set itself.
const parts = s => (isSideSet(s) ? [s.sides.L, s.sides.R].filter(p => p?.done === true) : [s])

// The sets holding the page's bests, as "session index:set index" over `chron` (oldest first): a tie
// keeps the first time it was reached, as the records do. The 1RM is upstream's estimate as the
// summary's series reads it (onerm.js bestSetOf: the default formula, the set's RIR).
function bestKeys(chron, exId, metric) {
  const bests = {}
  const put = (kind, v, key, beats = (a, b) => a > b) => {
    if (v > 0 && (!bests[kind] || beats(v, bests[kind].v))) bests[kind] = { v, key }
  }
  const helped = isAssisted(exId)
  chron.forEach((sess, si) => {
    if (metric === 'sec' ? sess.mode !== 'time' : sess.mode !== 'reps') return
    sess.sets.forEach((s, k) => {
      const key = si + ':' + k
      for (const p of parts(s)) {
        const w = num(p.w), r = num(p.r)
        if (metric === 'sec') { put('sec', num(p.sec), key); continue }
        if (metric === 'reps') { put('reps', r, key); continue }
        if (metric !== 'weight' || !(r > 0)) continue
        put('weight', w, key, (a, b) => beatsWeight(exId, a, b))
        if (helped) continue
        put('e1rm', estimate1RM(w, r, undefined, p.rir ?? null) || 0, key)
        put('setVol', w * r, key)
      }
    })
  })
  return new Set(Object.values(bests).map(b => b.key))
}

// A session's top set to hold against another's: the heaviest and then the most reps (a side
// counts on its own), the longest hold, the most minutes.
function topSet(sess) {
  const keys = p => (sess.mode === 'time' ? [num(p.sec), num(p.w)] : sess.mode === 'cardio' ? [num(p.min), num(p.speed)] : [num(p.w), num(p.r)])
  let top = null
  for (const s of sess.sets || []) for (const p of parts(s)) {
    const [a, b] = keys(p)
    if (!top || a > top.k[0] || (a === top.k[0] && b > top.k[1])) top = { p, k: [a, b] }
  }
  return top?.p || null
}

/**
 * The last `n` sessions of `sum` (exerciseSummary's, newest first) as the page's lines:
 * [{ id, d, mode, target, sets: [{ s, star }], effort: [{ rir } | { rpe }], trend, best }].
 * `trend` is 1, 0, -1 or null, the top set against the session before's (the same kind of set);
 * `best` whether a set of it holds one of the bests. `formula` is the profile's, for the arrow.
 */
export function lastSessions(sum, exId, { n = 5, formula } = {}) {
  const list = sum?.sessions || []
  const chron = [...list].reverse()
  const stars = bestKeys(chron, exId, sum?.metric)
  const assisted = isAssisted(exId)
  return list.slice(0, n).map((sess, k) => {
    const si = list.length - 1 - k
    const before = list[k + 1]
    const sets = (sess.sets || []).map((s, j) => ({ s, star: stars.has(si + ':' + j) }))
    const trend = before && before.mode === sess.mode ? setTrend(topSet(sess), topSet(before), { assisted, formula }) : null
    return { id: sess.id, d: sess.d, mode: sess.mode, target: sess.target, sets,
      effort: (sess.sets || []).map(setEffort).filter(Boolean), trend, best: sets.some(x => x.star) }
  })
}

/** The best at each rep count (`reps`, exerciseSummary's), each with `isNew` when it was set in
 *  the `days` days up to `today` (an ISO date). */
export function repBests(reps, today, days = 30) {
  const since = new Date(new Date(today + 'T12:00:00').getTime() - days * DAY).toISOString().slice(0, 10)
  return (reps || []).map(x => ({ ...x, isNew: !!x.d && x.d >= since }))
}

/** A chart curve's points with each weight through `show` (the exercise's own unit, D41): every
 *  curve but a main one that counts reps, seconds or minutes. */
export const curveIn = (points, curve, metric, show) =>
  (curve !== 'main' || metric === 'weight' ? points.map(p => ({ ...p, y: show(p.y) })) : points)

