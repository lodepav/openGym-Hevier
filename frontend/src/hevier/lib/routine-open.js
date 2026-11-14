// What a routine opens with, as plain data to compare: before and after an upstream merge, and
// against a kept snapshot in routine-open.test.js. It reads the stored state only and imports
// nothing, so hevier/tools/routine-snapshot.mjs runs the same code on the emulator's state.
// The brand and cable rules repeat gym-labels.js (workoutGym, entryBrand, entryCable), without the
// catalogue: a cable never set is null here, where the screen shows 1:1.

const isWarmup = s => s?.phase === 'warmup' || s?.warmup === true
const nums = s => Object.fromEntries(['w', 'r', 'sec', 'min', 'speed', 'incline'].filter(k => s?.[k] != null).map(k => [k, s[k]]))

/** One set row: its kind, its numbers, each side's, and the marks that decide how it behaves. */
export function setShape(s) {
  return {
    kind: isWarmup(s) ? 'warmup' : 'work',
    ...nums(s),
    ...(s?.sides ? { sides: { L: nums(s.sides.L), R: nums(s.sides.R) } } : {}),
    ...(s?.side ? { side: s.side } : {}),
    ...(s?.mode ? { mode: s.mode } : {}),
    ...(s?.weightOrigin ? { weightOrigin: s.weightOrigin } : {}),
    ...(s?.hvLast ? { hvLast: s.hvLast } : {}),
    ...(s?.edited ? { edited: true } : {}),
    ...(s?.done ? { done: true } : {}),
  }
}

/** The running session's gym id, or null. */
export function sessionGym(S) {
  const A = S?.active
  if (typeof A?.hvGym === 'string') return A.hvGym || null
  return (S?.equipProfiles || []).some(p => p?.id === S.activeEquipId) ? S.activeEquipId : null
}

const own = (v, fallback) => (typeof v === 'string' ? v || null : fallback ?? null)

/** The running session (`S.active`) as it opened: its gym and every exercise's settings and sets. */
export function openedSnapshot(S) {
  const A = S?.active
  if (!A) return null
  const gym = sessionGym(S)
  return {
    name: A.name ?? null,
    gym,
    exercises: (A.entries || []).map(e => ({
      id: e.id,
      target: Object.fromEntries(['sets', 'reps', 'repsMin', 'weight', 'sec', 'warmupSets'].filter(k => e.target?.[k] != null).map(k => [k, e.target[k]])),
      plan: e.plan?.kind ?? null,
      side: e.target?.side ?? null,
      dbLoad: e.target?.dbLoad ?? null,
      sideOrder: S.hvSideOrder?.[e.id] ?? null,
      brand: own(e.hvBrand, S.hvMachines?.[e.id]?.[gym || '']),
      cable: own(e.hvCable, S.hvCables?.[e.id]?.[gym || '']),
      sets: (e.sets || []).map(setShape),
    })),
  }
}

/** The settings a merge must not reset: modules, the gym, warm-ups, every fork field, each routine's switch. */
export function settingsSnapshot(S) {
  return {
    modules: S?.modules ?? null,
    activeEquipId: S?.activeEquipId ?? null,
    warmupAuto: S?.warmupAuto ?? null,
    startFrom: S?.startFrom ?? null,
    hv: Object.fromEntries(Object.keys(S || {}).filter(k => k.startsWith('hv')).sort().map(k => [k, S[k]])),
    routines: (S?.routines || []).map(r => ({ name: r.name, hvProg: r.hvProg === true, exercises: (r.ex || []).map(x => x.id) })),
  }
}

/** Every difference between two snapshots, as "path: before → after" lines; [] when they agree. */
export function diffSnapshots(a, b, path = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return []
  const obj = v => v && typeof v === 'object'
  if (!obj(a) || !obj(b) || Array.isArray(a) !== Array.isArray(b)) return [`${path || '.'}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`]
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])]
  // An exercise is named in the path, `exercises.3:0739`, so a line says which one changed.
  const seg = k => (Array.isArray(a) && (a[k]?.id ?? b[k]?.id) != null ? `${k}:${a[k]?.id ?? b[k]?.id}` : k)
  return keys.flatMap(k => diffSnapshots(a[k], b[k], path ? `${path}.${seg(k)}` : String(seg(k))))
}
