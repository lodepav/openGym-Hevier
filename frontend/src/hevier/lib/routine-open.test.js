// @vitest-environment happy-dom
// What every routine of a mixed profile opens with, at each gym, against a kept snapshot. An
// upstream merge once made warm-ups follow the working weight in routines with progression off,
// and no test looked at a whole routine opening. A change to what a routine opens with fails here
// with each difference on its own line, for a person to accept or fix.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { openedSnapshot, diffSnapshots } from './routine-open.js'
import { fixture, ROUTINES, PLAIN, CITY, WEEKEND, TODAY, NOW, BENCH, CALF, PRESS, DEADLIFT } from './routine-open.fixture.js'
import { hooks } from '../hooks.js'
import { isPlain, plainRows } from './plain-routine.js'
import { sideDefault } from './one-limb.js'
import { rowMode } from './hold-set.js'
import { entryBrand, workoutGym } from './gym-labels.js'
import { buildCombinedEntries, deriveSessionName } from '../../lib/session-merge.js'
import { switchGym } from '../../lib/gym-inventory.js'

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

const CASES = ROUTINES.flatMap(r => [CITY, WEEKEND].map(gym => ({ rid: r.id, name: r.name, gym, key: `${r.id}@${gym}` })))
const snapOf = (rid, gym) => openedSnapshot(open(atGym(gym), rid))

describe('hevier: what each routine opens with', () => {
  let current = null
  const now = {}
  beforeAll(() => {
    // The fork's hooks a session's build reads (hevier/index.js install), on the profile in use.
    hooks.plainRoutine = { is: isPlain, rows: plainRows }
    hooks.setMode = rowMode
  })
  afterAll(() => {
    Object.assign(hooks, { plainRoutine: null, setMode: null })
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
