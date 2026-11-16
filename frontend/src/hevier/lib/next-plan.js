// The next session's plan (hevier/DECISIONS.md D128): what a routine's next workout opens with, set
// by set beside last time, and the numbers planned for it on the routine's page. What it opens with
// is upstream's own build (session-merge.js buildCombinedEntries, seam S40's last time included), run
// on the profile without storing it; the plan is laid over that, and the routine is never changed.
//
//   S.hvPlan = { [routine id]: { ex: { [exercise key]: { [set key]: { w?, r? } | { L?: { w?, r? }, R?: { w?, r? } } } },
//                used?: 'workout id' } }   // the running workout that opened with it
//
// An exercise key is its id, `id#2` for its second time in the same routine, so a plan stays with
// its exercise when others are added, moved or taken out. A set key is `w0`, `w1`… for the warm-ups
// and `0`, `1`… for the work sets, so a warm-up added or taken out does not move the work sets' plan.
import { buildCombinedEntries } from '../../lib/session-merge.js'
import { isWarmupRow, isSideSet, syncSideAggregate, WEIGHT_ORIGIN_MANUAL } from '../../lib/workout-model.js'
import { modeOf, isBw } from '../../lib/history.js'
import { dbLoadFor, historyAs, ownedWeightsFor, stepOwned } from '../../lib/dumbbells.js'
import { weightIncrement, stepWeight } from '../../lib/progression.js'
import { exConverted, exUnitOf, viewTarget } from '../../lib/ex-unit.js'
import { fmtNum, cleanNum } from '../../lib/format.js'
import { previousSetsFor, previousMode } from './previous-sets.js'
import { startLabelKey } from './gym-labels.js'
import { isHoldRow, isPairTail } from './hold-set.js'
import { hevySetLabel } from './set-text.js'

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
// The heaviest weight and the most reps a plan takes, as upstream's session targets (#972) hold them.
const MAX_W = 2000
const MAX_R = 999
const okValue = (f, v) => (f === 'w' ? typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= MAX_W
  : Number.isInteger(v) && v >= 0 && v <= MAX_R)
// Only the planned numbers of a stored set: a synced or restored plan is read, not trusted.
const numsOf = q => (isMap(q) ? Object.fromEntries(['w', 'r'].filter(f => okValue(f, q[f])).map(f => [f, q[f]])) : {})

/** Each routine exercise's key, in the routine's order. */
export function exKeys(exs) {
  const seen = {}
  return (exs || []).map(e => {
    const n = (seen[e?.id] = (seen[e?.id] || 0) + 1)
    return n > 1 ? `${e?.id}#${n}` : String(e?.id)
  })
}

/** An exercise's opened rows as sets: [{ key, kind: 'warm' | 'work', n, at }], `at` the rows of
 *  the set (two for a per-side hold, an L/R pair). */
export function planSlots(rows) {
  const out = []
  let w = 0, k = 0
  ;(rows || []).forEach((row, i) => {
    if (isPairTail(rows, i) && out.length) { out.at(-1).at.push(i); return }
    out.push(isWarmupRow(row) ? { key: 'w' + w, kind: 'warm', n: w++, at: [i] } : { key: String(k), kind: 'work', n: k++, at: [i] })
  })
  return out
}

/**
 * Whether a set's weight and reps can be planned: one rep row, plain or per side, body weight
 * included. A hold, a timed or cardio set, a drop, rest-pause or cluster set (their drops and
 * bursts follow the weight they were built from) is shown as it opens, read-only.
 */
export const plannable = (rows, cfg) => rows?.length === 1 && modeOf(cfg) === 'reps' && !isHoldRow(rows[0]) && !rows[0].type
  && !rows[0].drops && !rows[0].clusters

/** The plan of set `setKey` of exercise `exKey` in routine `rid`, or null. */
export const plannedAt = (S, rid, exKey, setKey) => {
  const p = S?.hvPlan?.[rid]?.ex?.[exKey]?.[setKey]
  return isMap(p) ? p : null
}

const prune = m => {
  for (const k of Object.keys(m)) if (!isMap(m[k]) || !Object.keys(m[k]).length) delete m[k]
  return m
}

/**
 * Plans number `field` ('w' or 'r') of set `setKey` (one side's with `side`, 'L' or 'R') of
 * exercise `exKey` in routine `rid`, on the store draft `s`: `v` a number, or null to open at what
 * it would without a plan again. A changed plan is for the next session, so a workout already open
 * with the old one does not use it up. False, and nothing written, for a number that is not one.
 */
export function setPlanned(s, rid, exKey, setKey, side, field, v) {
  if ((field !== 'w' && field !== 'r') || (side && side !== 'L' && side !== 'R')) return false
  if (v != null && !okValue(field, v)) return false
  const all = isMap(s.hvPlan) ? { ...s.hvPlan } : {}
  const ex = { ...(isMap(all[rid]?.ex) ? all[rid].ex : {}) }
  const sets = { ...(isMap(ex[exKey]) ? ex[exKey] : {}) }
  const set = { ...(isMap(sets[setKey]) ? sets[setKey] : {}) }
  const at = side ? (set[side] = { ...(isMap(set[side]) ? set[side] : {}) }) : set
  if (v == null) delete at[field]
  else at[field] = v
  if (side) prune(set)
  sets[setKey] = set
  ex[exKey] = prune(sets)
  prune(ex)
  if (Object.keys(ex).length) all[rid] = { ex }
  else delete all[rid]
  if (Object.keys(all).length) s.hvPlan = all
  else delete s.hvPlan
  return true
}

/** Clears routine `rid`'s plan on the draft `s`. */
export function clearPlan(s, rid) {
  if (!isMap(s.hvPlan?.[rid])) return
  const all = { ...s.hvPlan }
  delete all[rid]
  if (Object.keys(all).length) s.hvPlan = all
  else delete s.hvPlan
}

/** The routines whose plan workout `id` opened with. */
export const usedBy = (S, id) => Object.keys(isMap(S?.hvPlan) ? S.hvPlan : {}).filter(rid => id != null && S.hvPlan[rid]?.used === id)

// One opened row with set `p`'s planned numbers. A planned weight is the lifter's own: marked manual
// so an edit above does not cascade onto it, and no longer drawn grey as last time's (D2, `hvLast`).
function withPlan(row, p) {
  if (row.done) return row
  if (isSideSet(row)) {
    let mark = String(row.hvLast || '')
    const sides = { ...row.sides }
    for (const k of ['L', 'R']) {
      const q = numsOf(p[k])
      if (!Object.keys(q).length) continue
      sides[k] = { ...sides[k], ...q, ...(q.w != null ? { weightOrigin: WEIGHT_ORIGIN_MANUAL } : {}) }
      if (q.w != null) mark = mark.replace(k, '')
    }
    const out = syncSideAggregate({ ...row, sides })
    if (mark) out.hvLast = mark
    else delete out.hvLast
    return out
  }
  const q = numsOf(p)
  if (!Object.keys(q).length) return row
  const out = { ...row, ...q }
  if (q.w != null) { out.weightOrigin = WEIGHT_ORIGIN_MANUAL; delete out.hvLast }
  return out
}

/**
 * Session entries (each with its routine's `rid`) with the plans of the routines `rids` (all, by
 * default) laid over the sets they open with. Unplanned sets and exercises are returned as they are.
 */
export function layPlan(S, entries, rids = null) {
  const all = isMap(S?.hvPlan) ? S.hvPlan : null
  if (!all) return entries
  const seen = {}
  return (entries || []).map(e => {
    if (!e) return e
    const n = (seen[e.rid + '|' + e.id] = (seen[e.rid + '|' + e.id] || 0) + 1)
    if (rids && !rids.includes(e.rid)) return e
    const sets = all[e.rid]?.ex?.[n > 1 ? `${e.id}#${n}` : String(e.id)]
    if (!isMap(sets)) return e
    const cfg = { ...(e.target || {}), id: e.id }
    const rows = [...(e.sets || [])]
    for (const slot of planSlots(rows)) {
      const p = sets[slot.key]
      if (isMap(p) && plannable(slot.at.map(i => rows[i]), cfg)) rows[slot.at[0]] = withPlan(rows[slot.at[0]], p)
    }
    return { ...e, sets: rows }
  })
}

/**
 * The next session of routine `rid` as it will open, per exercise in the routine's order:
 * `{ key, idx, id, cfg, sets }`, each set `{ key, kind, n, rows, base, last, plannable, plan }`:
 * the rows it opens with (the plan laid over them), the same without the plan, last time's set for
 * each row (null where there was none), and the stored plan. [] for a routine that is gone.
 */
export function nextSession(S, rid) {
  const routine = (S?.routines || []).find(r => r.id === rid)
  if (!routine) return []
  // As a start builds it: no session open (one open is resumed, never rebuilt).
  const fresh = S.active ? { ...S, active: null } : S
  const base = buildCombinedEntries(fresh, [rid]).entries
  const opened = layPlan(fresh, base, [rid])
  const keys = exKeys(routine.ex)
  return opened.map((e, idx) => {
    const cfg = { ...(e.target || {}), id: e.id }
    // Last time as the build reads it (plain-routine.js plainRows): the dumbbell meaning, D82's label.
    const H = historyAs(fresh, e.id, dbLoadFor(fresh, cfg))
    const prev = previousSetsFor(H, { id: e.id, rid, sets: e.sets }, previousMode(fresh), { label: startLabelKey(fresh, e.id) })
    const before = base[idx]?.sets || []
    return {
      key: keys[idx], idx, id: e.id, cfg,
      sets: planSlots(e.sets).map(slot => {
        const rows = slot.at.map(i => e.sets[i])
        return {
          key: slot.key, kind: slot.kind, n: slot.n, rows, base: slot.at.map(i => before[i]),
          last: slot.at.map(i => prev[i] || null), plannable: plannable(rows, cfg), plan: plannedAt(S, rid, keys[idx], slot.key),
        }
      }),
    }
  })
}

/**
 * Every number of `session` (nextSession's) that can be planned, in reading order: each set's
 * weight then reps, a per-side set's left side then right. `{ id, x, set, side, field, value,
 * base, planned }`, `value` what it opens with and `base` the same without the plan, stored.
 */
export function planFields(session) {
  const out = []
  for (const x of session || []) for (const set of x.sets) {
    if (!set.plannable) continue
    const [row] = set.rows, [was] = set.base
    for (const side of isSideSet(row) ? ['L', 'R'] : [null]) for (const field of ['w', 'r']) {
      const at = side ? row.sides[side] : row
      const from = side ? was?.sides?.[side] : was
      const plan = side ? set.plan?.[side] : set.plan
      out.push({
        id: [x.key, set.key, side || '', field].join('|'), x, set, side, field,
        value: at?.[field] ?? 0, base: from?.[field] ?? 0, planned: okValue(field, plan?.[field]),
      })
    }
  }
  return out
}

/** The weight step of exercise `cfg` in its own unit, as the live workout's stepper takes it:
 *  `{ step, owned }`, `owned` the dumbbells or machine stack walked bell by bell. */
export function weightStep(S, cfg) {
  if (exConverted(S, cfg.id)) return { step: weightIncrement(viewTarget(S, cfg.id, cfg), exUnitOf(S, cfg.id)), owned: null }
  return { step: weightIncrement(cfg, S?.unit === 'lb' ? 'lb' : 'kg'), owned: ownedWeightsFor(S, cfg) }
}

/** Shown number `v` of `field` one step up (`dir` 1) or down (-1); never below 0. */
export function stepped(S, cfg, field, v, dir) {
  if (field === 'r') return Math.max(0, Math.round(Number(v) || 0) + dir)
  const { step, owned } = weightStep(S, cfg)
  const c = cleanNum(Number(v) || 0, step)
  return Math.max(0, owned ? stepOwned(owned, c, dir) : stepWeight(c, step, dir))
}

/**
 * Last time's set `p` as the page's left column writes it: "60 × 8", "+10 × 12" or "× 12" on body
 * weight, one side's with `side`; a timed, cardio or hold set as Workout Detail writes it; '–' for
 * none. `show` turns a stored weight into the exercise's unit (D41).
 */
export function lastText(p, { cfg, side = null, speedUnit, show = w => w }) {
  if (!p) return '–'
  const wr = x => (isBw(cfg) ? (x.w > 0 ? `+${fmtNum(show(x.w))} × ` : '× ') : `${fmtNum(show(x.w || 0))} × `) + (x.r || 0)
  if (isHoldRow(p)) return hevySetLabel(cfg.id, side === 'R' && p.hvPairR ? p.hvPairR : p, cfg, speedUnit)
  if (side) return isSideSet(p) && p.sides[side] ? wr(p.sides[side]) : '–'
  if (modeOf(cfg) === 'reps' && !isSideSet(p)) return wr(p)
  return hevySetLabel(cfg.id, p, cfg, speedUnit)
}

/** Opens routines `rids`' plans in the running session on the draft `s`, and marks them as its. */
export function openWithPlan(s, rids) {
  const A = s.active
  if (!A || !rids?.length) return
  A.entries = layPlan(s, A.entries, rids)
  const all = { ...s.hvPlan }
  for (const rid of rids) if (isMap(all[rid])) all[rid] = { ...all[rid], used: A.id }
  s.hvPlan = all
}

/** Workout `id` ended, on the draft `s`: saved, the plans it opened with are used up; discarded,
 *  they stay for the next session. */
export function endPlans(s, id, saved) {
  for (const rid of usedBy(s, id)) {
    if (saved) clearPlan(s, rid)
    else {
      const { used: _used, ...rest } = s.hvPlan[rid]
      s.hvPlan = { ...s.hvPlan, [rid]: rest }
    }
  }
}
