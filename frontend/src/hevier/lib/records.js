// Personal records as Hevy keeps them (hevier/DECISIONS.md D51), worked out from the log in date
// order, so imported history has them too. Nothing is stored: upstream's own `w.prs` (the heaviest
// weight, set once at the finish) is left as it is for upstream's screens.
//
// A record belongs to an exercise *and its label*: the brand and, on a cable, the setup (D28, D43),
// never the gym, which is only where. The first session of an exercise, or of a new label, sets the
// bar and is no record; a later session that strictly beats it is. A weighted exercise competes in
// heaviest weight, best 1RM, best set volume and best session volume (the last three not on an
// assistance machine, whose load is the help it gave); one with no load logged in most reps and most
// session reps; a hold in the longest hold; cardio in the longest duration. Warm-ups never count.
// Dumbbells are read in the exercise's own meaning (lib/dumbbells.js), as exercise details reads them;
// a cable's two stacks (×2) are their own label and are compared as logged.
import { metricModeForEntry, metricRowsForEntry, completedRepsOf, workoutAt, entryExcluded } from '../../lib/history.js'
import { beatsWeight, isAssisted } from '../../lib/exercises.js'
import { estimate1RM, formulaOf } from '../../lib/onerm.js'
import { completedVolumeOf, isSideSet } from '../../lib/workout-model.js'
import { currentDbLoad, volumeFactor, workoutAs } from '../../lib/dumbbells.js'
import { fmtNum, fmtVol } from '../../lib/format.js'
import { elapsedClock } from './elapsed.js'
import { fieldSig } from './store-watch.js'
import { entryLabelKey, entryBrand, entryCable, labelKey, isCable } from './gym-labels.js'

/** Hevy's names for the records, in the order a set lists them. */
export const KINDS = {
  weight: 'Heaviest Weight', e1rm: 'Best 1RM', setVol: 'Best Set Volume', sessionVol: 'Best Session Volume',
  reps: 'Most Reps', sessionReps: 'Most Session Reps', sec: 'Longest Hold', min: 'Longest Duration',
}
const ORDER = Object.keys(KINDS)
/** Records of the whole session, not of one set: they sit on the exercise. */
const SESSION = new Set(['sessionVol', 'sessionReps', 'min'])

const list = v => (Array.isArray(v) ? v : [])
const better = (exId, kind, v, prev) => (kind === 'weight' ? beatsWeight(exId, v, prev) : v > prev)

// The done halves of a row: a per-side row's sides, else the row itself.
const parts = s => (isSideSet(s) ? [s.sides.L, s.sides.R].filter(x => x?.done === true) : [s])

/**
 * One entry's numbers: { kind: { v, set } } with `set` the index in `e.sets` that first reached it
 * (-1 for a session record), and `w`/`r` for a set's load and reps. `e` is read as stored.
 */
function entryBests(e, formula) {
  const mode = metricModeForEntry(e)
  const rows = new Set(metricRowsForEntry(e, mode))
  if (!rows.size) return {}
  const exId = e.id
  const out = {}
  const put = (kind, v, set, extra) => {
    if (!(v > 0)) return
    const had = out[kind]
    if (!had || better(exId, kind, v, had.v)) out[kind] = { v, set, ...extra }
  }
  const sets = list(e.sets)
  if (mode === 'reps') {
    const loaded = [...rows].some(s => parts(s).some(p => Number(p?.w) > 0))
    const assisted = isAssisted(exId)
    let vol = 0, reps = 0
    sets.forEach((s, i) => {
      if (!rows.has(s)) return
      reps += completedRepsOf(s)
      vol += completedVolumeOf(s)
      for (const p of parts(s)) {
        const w = Number(p?.w) || 0, r = Math.max(0, Number(p?.r) || 0)
        if (!loaded) { put('reps', r, i); continue }
        if (!(w > 0) || !(r > 0)) continue
        put('weight', w, i, { r })
        if (assisted) continue
        put('e1rm', estimate1RM(w, r, formula, p.rir ?? null) || 0, i, { w, r })
        put('setVol', w * r, i, { w, r })
      }
    })
    if (loaded && !assisted) put('sessionVol', vol * volumeFactor(e), -1)
    if (!loaded) put('sessionReps', reps, -1)
  } else if (mode === 'time') {
    sets.forEach((s, i) => { if (rows.has(s)) put('sec', Number(s.sec) || 0, i) })
  } else if (mode === 'cardio') {
    put('min', sets.filter(s => rows.has(s)).reduce((n, s) => n + (Number(s.min) || 0), 0), -1)
  }
  return out
}

/**
 * A session's records against `bests` (Map scope → { kind: v }), which it then raises.
 * `entries` are read with `scopeOf(e, i)` and `asOf(exId)`. Returns [{ i, id, kind, set, v, w?, r? }]
 * in the session's order, each kind of each label once: on the entry and set that first reached it.
 * `skip(e)`: an entry kept out of progression, which neither sets nor raises a record.
 */
function sessionRecords(entries, bests, scopeOf, asOf, formula, skip) {
  const byScope = new Map()
  list(entries).forEach((e, i) => {
    // An exercise kept out of progression sets no record and raises no bar (D57).
    if (!e?.id || skip(e)) return
    const as = asOf(e.id)
    const read = as ? workoutAs({ entries: [e] }, e.id, as).entries[0] : e
    const scope = scopeOf(e, i)
    const got = entryBests(read, formula)
    const cur = byScope.get(scope) || { id: e.id, kinds: {} }
    for (const [kind, x] of Object.entries(got)) {
      const had = cur.kinds[kind]
      // A session record adds up over a combined session's repeats of the exercise.
      if (SESSION.has(kind) && had) { had.v += x.v; continue }
      if (!had || better(e.id, kind, x.v, had.v)) cur.kinds[kind] = { ...x, i }
    }
    byScope.set(scope, cur)
  })
  const out = []
  for (const [scope, { id, kinds }] of byScope) {
    const prev = bests.get(scope)
    const next = { ...(prev || {}) }
    for (const kind of ORDER) {
      const x = kinds[kind]
      if (!x) continue
      const p = prev?.[kind]
      if (p > 0 && better(id, kind, x.v, p)) out.push({ id, kind, ...x })
      if (!(p > 0) || better(id, kind, x.v, p)) next[kind] = x.v
    }
    bests.set(scope, next)
  }
  return out.sort((a, b) => a.i - b.i || ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind))
}

const savedScope = e => e.id + '#' + entryLabelKey(e)
// Dumbbells in the exercise's own meaning; a cable as logged, its setup being its label.
const asFor = S => {
  const memo = new Map()
  return exId => {
    if (isCable(exId)) return null
    if (!memo.has(exId)) memo.set(exId, currentDbLoad(S, exId))
    return memo.get(exId)
  }
}

// A workout's key: its id, else its day and start (an old record without one).
const keyOf = w => (w?.id != null ? 'i' + w.id : 'd' + w?.d + '|' + w?.start)

function walk(S, workouts) {
  const formula = formulaOf(S)
  const asOf = asFor(S)
  const order = list(workouts).map((w, k) => ({ w, k, t: workoutAt(w) })).sort((a, b) => a.t - b.t || a.k - b.k)
  const bests = new Map()
  const byWorkout = new Map()
  for (const { w } of order) {
    const recs = sessionRecords(w?.entries, bests, savedScope, asOf, formula, e => entryExcluded(w, e))
    if (recs.length) byWorkout.set(keyOf(w), recs)
  }
  return { bests, byWorkout }
}

// The store deep-copies S on every change, so the walk is kept by the log's content (fieldSig, one
// JSON per copy of S), its dumbbell meanings and the 1RM formula: one walk per change of the log.
const sigOf = (S, extra = '') => fieldSig(S, 'workouts') + '\n' + fieldSig(S, 'dbLoad') + '\n' + formulaOf(S) + '\n' + extra
let last = { sig: null, result: null }
function walked(S) {
  const sig = sigOf(S)
  if (last.sig !== sig) last = { sig, result: walk(S, S?.workouts) }
  return last.result
}

/** The records saved workout `w` set, as sessionRecords lists them. */
const NONE = Object.freeze([])
export const workoutRecords = (S, w) => walked(S).byWorkout.get(keyOf(w)) || NONE

/** The records set in `workouts` (a part of `S.workouts`), each with its workout as `w`. */
export const recordsIn = (S, workouts) => list(workouts).flatMap(w => workoutRecords(S, w).map(r => ({ ...r, w })))

// The bests a running session competes with: every saved workout, less the one being edited and
// any after it. Kept as the walk is.
let lastPrior = { sig: null, bests: null }
function priorBests(S, A) {
  const editing = A?.editingWorkoutId
  const sig = sigOf(S, editing ?? '')
  if (lastPrior.sig === sig) return lastPrior.bests
  let base = list(S?.workouts)
  if (editing != null) {
    const self = base.find(w => w?.id === editing)
    const t = self ? workoutAt(self) : Infinity
    base = base.filter(w => w !== self && workoutAt(w) < t)
  }
  lastPrior = { sig, bests: walk(S, base).bests }
  return lastPrior.bests
}

/**
 * The running session's records so far (D22, now every kind): as workoutRecords will list them
 * once it is saved, the labels read as the session shows them. None in a workout logged into the past.
 */
export function liveRecords(S, A = S?.active) {
  if (!A || A.backfill) return NONE
  // Every exercise block asks for the same copy of S on a render: worked out once per copy.
  const own = A === S?.active
  if (own && liveMemo.has(S)) return liveMemo.get(S)
  const scope = (e, i) => e.id + '#' + labelKey(entryBrand(S, A, i), entryCable(S, A, i))
  const recs = sessionRecords(A.entries, new Map(priorBests(S, A)), scope, asFor(S), formulaOf(S), e => e.noProg === true)
  if (own) liveMemo.set(S, recs)
  return recs
}
const liveMemo = new WeakMap()

/** The records on set `set` of entry `i`, or on the entry itself with set -1. */
export const recordsAt = (recs, i, set) => recs.filter(r => r.i === i && (set == null || r.set === set))

/** A record's number as text, in the profile unit: "100 kg", "70 kg × 10", "12 reps", "1:15". */
export function recordValue(r, unit, tr = s => s) {
  switch (r.kind) {
    case 'weight': case 'e1rm': return fmtNum(r.v) + ' ' + unit
    case 'setVol': return `${fmtNum(r.w)} ${unit} × ${r.r}`
    case 'sessionVol': return fmtVol(r.v, unit)
    case 'reps': case 'sessionReps': return tr('{0} reps', r.v)
    case 'sec': return elapsedClock(Math.round(r.v))
    case 'min': return elapsedClock(Math.round(r.v * 60))
    default: return fmtNum(r.v)
  }
}
