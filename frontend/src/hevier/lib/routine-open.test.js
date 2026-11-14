// @vitest-environment happy-dom
// What every routine of a mixed profile opens with, at each gym, against a kept snapshot. An
// upstream merge once made warm-ups follow the working weight in routines with progression off,
// and no test looked at a whole routine opening. A change to what a routine opens with fails here
// with each difference on its own line, for a person to accept or fix.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { openedSnapshot, settingsSnapshot, diffSnapshots } from './routine-open.js'
import { fixture, ROUTINES, PLAIN, PROG, CITY, WEEKEND, TODAY, NOW, BENCH, CALF, PRESS, DEADLIFT, SQUAT } from './routine-open.fixture.js'
import { hooks } from '../hooks.js'
import { isPlain, plainRows } from './plain-routine.js'
import { sideDefault } from './one-limb.js'
import { holdMode } from './hold-mode.js'
import { rowMode } from './hold-set.js'
import { entryBrand, workoutGym } from './gym-labels.js'
import { buildCombinedEntries, deriveSessionName } from '../../lib/session-merge.js'
import { switchGym } from '../../lib/gym-inventory.js'
import { liveReramp, barFloor, modeOf } from '../../lib/history.js'
import { isWarmupRow } from '../../lib/workout-model.js'
import { dropGrid } from '../../lib/plates.js'
import { isAssisted } from '../../lib/exercises.js'
import { exView } from '../../lib/ex-unit.js'
import { mergeStates, stampChange } from '../../lib/sync-merge.js'
import { readBackupFile } from '../../lib/backup-media.js'
import { useStore } from '../../store/useStore.js'

const FILE = join(dirname(fileURLToPath(import.meta.url)), 'routine-open.snapshot.json')
const WRITE = process.env.ROUTINE_OPEN_WRITE === '1'
const ACCEPT = 'An intended change? Accept it: ROUTINE_OPEN_WRITE=1 npx vitest run src/hevier/lib/routine-open.test.js'
const kept = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {}

// The profile at gym `gym`, switched the way the gym picker switches it (its plates come in).
function atGym(gym) {
  const S = fixture()
  switchGym(S, gym, NOW)
  return S
}

// The session sheets.jsx beginWorkout makes, with its clock and id fixed.
function open(S, rid) {
  const { entries, routineIds, routines } = buildCombinedEntries(S, [rid])
  S.active = {
    id: 'a-' + rid, d: TODAY, start: NOW, routineIds,
    name: deriveSessionName(routines.map(r => r.name)),
    bw: null, cur: 0, entries, workoutView: S.workoutView || 'cards',
  }
  return S
}

// views/Workout.jsx rerampOpen is private, so its decision is repeated here from the same pieces:
// the first work set's weight changed, then the S59 gate, then liveReramp on the gym's grid.
function newWorkWeight(S, idx, w) {
  const e = S.active.entries[idx]
  const i = e.sets.findIndex(x => !isWarmupRow(x))
  e.sets[i] = { ...e.sets[i], w }
  const cfg = { ...(e.target || {}), id: e.id }
  if (modeOf(cfg) !== 'reps') return e.sets
  if (hooks.plainRoutine?.is((S.routines || []).find(r => r.id === e.rid))) return e.sets
  const V = exView(S, e.id)
  e.sets = liveReramp(e.sets, dropGrid(V, cfg), barFloor(V, e.id), isAssisted(cfg))
  return e.sets
}
const warmups = sets => sets.filter(isWarmupRow).map(s => s.w)

const CASES = ROUTINES.flatMap(r => [CITY, WEEKEND].map(gym => ({ rid: r.id, name: r.name, gym, key: `${r.id}@${gym}` })))
const snapOf = (rid, gym) => openedSnapshot(open(atGym(gym), rid))

describe('hevier: what each routine opens with', () => {
  let current = null
  const now = {}
  beforeAll(() => {
    // The fork's hooks a session's build reads (hevier/index.js install), on the profile in use.
    hooks.plainRoutine = { is: isPlain, rows: plainRows }
    hooks.defaultSide = id => sideDefault(current, id)
    hooks.defaultMode = id => holdMode(current, id)
    hooks.setMode = rowMode
  })
  afterAll(() => {
    Object.assign(hooks, { plainRoutine: null, defaultSide: null, defaultMode: null, setMode: null })
    // A case left out by a -t filter keeps its kept copy; a routine gone from the fixture goes.
    if (WRITE) writeFileSync(FILE, JSON.stringify(Object.fromEntries(CASES.map(c => [c.key, now[c.key] ?? kept[c.key]])), null, 2) + '\n')
  })

  it.each(CASES)('$name at $gym opens as kept', ({ rid, gym, key }) => {
    current = atGym(gym)
    const snap = openedSnapshot(open(current, rid))
    // Built twice: a clock or a random id in what it opens with would make the kept file useless.
    current = atGym(gym)
    expect(openedSnapshot(open(current, rid))).toEqual(snap)
    now[key] = snap
    if (WRITE) return
    const diff = diffSnapshots(kept[key], snap)
    if (diff.length) throw new Error([`${key} opens differently:`, ...diff, ACCEPT].join('\n'))
  })

  it('a new working weight leaves a plain routine’s warm-ups alone and moves a progression one’s (D69, S59)', () => {
    current = open(atGym(CITY), PLAIN.id)
    const plainIdx = current.active.entries.findIndex(e => e.id === BENCH)
    const plainWarm = warmups(current.active.entries[plainIdx].sets)
    expect(plainWarm.length).toBeGreaterThan(0)
    expect(warmups(newWorkWeight(current, plainIdx, 90))).toEqual(plainWarm)

    for (const id of [BENCH, SQUAT]) {
      current = open(atGym(CITY), PROG.id)
      const idx = current.active.entries.findIndex(e => e.id === id)
      const before = warmups(current.active.entries[idx].sets)
      expect(before.length).toBeGreaterThan(0)
      expect(warmups(newWorkWeight(current, idx, 120))).not.toEqual(before)
    }
  })

  it('shows the brand and gym the screen shows, for every exercise (D28, D82)', () => {
    for (const { rid, gym } of CASES) {
      current = open(atGym(gym), rid)
      const snap = openedSnapshot(current)
      snap.exercises.forEach((x, idx) => {
        expect(x.brand, `${rid}@${gym} ${x.id}`).toBe(entryBrand(current, current.active, idx))
      })
      expect(snap.gym).toBe(workoutGym(current, current.active))
    }
  })

  it('is not trivially empty: the plain routine has what the snapshot is there to watch', () => {
    current = atGym(CITY)
    const city = snapOf(PLAIN.id, CITY)
    current = atGym(WEEKEND)
    const weekend = snapOf(PLAIN.id, WEEKEND)
    const rows = city.exercises.flatMap(x => x.sets)
    expect(rows.some(s => s.kind === 'warmup' && s.hvLast)).toBe(true)
    expect(rows.some(s => s.sides && s.sides.L.r !== s.sides.R.r)).toBe(true)
    const brand = snap => snap.exercises.find(x => x.id === PRESS).brand
    expect(brand(city)).toBeTruthy()
    expect(brand(city)).not.toBe(brand(weekend))
    expect(city.exercises.find(x => x.id === CALF).sideOrder).toBe('RL')
    const never = city.exercises.find(x => x.id === DEADLIFT).sets
    expect(never).toEqual([{ kind: 'work', w: 100, r: 5 }, { kind: 'work', w: 100, r: 5 }])
  })
})

describe('hevier: the profile’s settings stay as they are', () => {
  const S = fixture()
  // The fixture without its settings, so a device setting them is a change the merge must keep.
  const bare = () => {
    const s = fixture()
    for (const k of Object.keys(s)) if (k.startsWith('hv')) delete s[k]
    for (const k of ['modules', 'warmupAuto', 'startFrom']) delete s[k]
    s.routines = s.routines.map(({ hvProg: _, ...r }) => r)
    return s
  }
  // A save as the store makes it (stored-fields.test.js): stamped by stampChange.
  const edit = (prev, fn, wall) => {
    const next = structuredClone(prev)
    fn(next)
    next._ts = stampChange(prev, next, wall)
    return next
  }

  it('survives a sync with a later change on another device', () => {
    const base = bare()
    const phone = edit(base, s => {
      for (const k of Object.keys(S)) if (k.startsWith('hv') || ['modules', 'warmupAuto', 'startFrom'].includes(k)) s[k] = structuredClone(S[k])
      s.routines = structuredClone(S.routines)
    }, 100)
    const laptop = edit(base, s => { s.restSec = 75 }, 200)
    const want = settingsSnapshot(S)
    expect(diffSnapshots(want, settingsSnapshot(mergeStates(phone, laptop)))).toEqual([])
    expect(diffSnapshots(want, settingsSnapshot(mergeStates(laptop, phone)))).toEqual([])
  })

  it('comes back from a backup', async () => {
    const { state } = await readBackupFile(new Blob([JSON.stringify(S, null, 2)]))
    useStore.getState().importBackup(state)
    expect(diffSnapshots(settingsSnapshot(S), settingsSnapshot(useStore.getState().S))).toEqual([])
  })
})
