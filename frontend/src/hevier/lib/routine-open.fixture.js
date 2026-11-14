// The profile routine-open.test.js starts every routine of: mixed on purpose, since the bugs live
// where two settings meet. Two gyms with their own plates, a machine with a brand at each, a cable
// on 2:1 at one, routines with progression off (D69) and on (hvProg), automatic warm-ups for
// compounds, per side on and switched off (D75), a hold, cardio, a folder (D13). Fixed dates only.
import { syncSideAggregate } from '../../lib/workout-model.js'
import { presetModules } from '../../lib/modules.js'

export const BENCH = '0047'     // barbell incline bench press: a compound, its warm-ups automatic
export const CALF = '1178'      // dumbbell single leg calf raise: one limb, per side
export const PRESS = '0739'     // sled 45° leg press: a machine, a brand at each gym
export const ROW = '1323'       // cable rope seated row: a cable, 2:1 at the weekend gym
export const PLANK = '4170'     // bear plank: a timed hold
export const BIKE = '2138'      // stationary bike: cardio
export const DEADLIFT = '0032'  // barbell deadlift: in the plain routine, never done
export const SQUAT = '0043'     // barbell full squat: a counted warm-up ramp
export const REAR = '1048'      // dumbbell one arm rear lateral raise: one limb, per side switched off

export const CITY = 'g-city'
export const WEEKEND = 'g-weekend'
export const TODAY = '2026-11-14'
export const NOW = Date.UTC(2026, 10, 14, 17, 0)

const slot = (id, extra) => ({ id, restSec: 90, ...extra })
export const PLAIN = {
  id: 'r-plain', name: 'Upper Plain', emoji: 'dumbbell', _ts: 1,
  ex: [
    slot(BENCH, { sets: 3, reps: 8, weight: 60, mode: 'reps', warmupSets: 1, restSec: 120 }),
    slot(CALF, { sets: 2, reps: 24, weight: 16, mode: 'reps', side: true }),
    slot(PRESS, { sets: 3, reps: 10, weight: 140, mode: 'reps' }),
    slot(ROW, { sets: 3, reps: 12, weight: 50, mode: 'reps' }),
    slot(PLANK, { sets: 2, sec: 45, weight: 0, mode: 'time', bodyweight: true }),
    slot(BIKE, { sets: 1, min: 20, speed: 8, mode: 'cardio' }),
    slot(DEADLIFT, { sets: 2, reps: 5, weight: 100, mode: 'reps' }),
  ],
}
export const PROG = {
  id: 'r-prog', name: 'Strength Prog', emoji: 'barbell', hvProg: true, _ts: 1,
  ex: [
    slot(BENCH, { sets: 3, reps: 5, weight: 70, mode: 'reps', prog: 'linear', restSec: 180 }),
    slot(SQUAT, { sets: 3, reps: 5, weight: 100, mode: 'reps', prog: 'linear', warmupSets: 2, restSec: 180 }),
    slot(PRESS, { sets: 2, reps: 12, weight: 150, mode: 'reps', prog: 'linear' }),
  ],
}
export const ARMS = {
  id: 'r-arms', name: 'Arms', emoji: 'dumbbell', folder: 'Accessories', _ts: 1,
  ex: [
    slot(REAR, { sets: 3, reps: 12, weight: 8, mode: 'reps', side: false }),
    slot(ROW, { sets: 2, reps: 12, weight: 45, mode: 'reps' }),
  ],
}
export const ROUTINES = [PLAIN, PROG, ARMS]

const work = (w, r) => ({ w, r, done: true })
const warm = (w, r) => ({ w, r, done: true, phase: 'warmup', warmup: true })
const timed = (sec, w = 0) => ({ sec, w, done: true })
const ride = (min, speed) => ({ min, speed, done: true })
const sides = (w, l, r) => syncSideAggregate({ sides: { L: { w, r: l, done: true }, R: { w, r, done: true } } })

const gymName = { [CITY]: 'City Gym', [WEEKEND]: 'Weekend Gym' }
const BRAND = { [CITY]: 'Hammer Strength', [WEEKEND]: 'Technogym' }
// An exercise as a finished workout stores it: its target, its routine, and the gym's labels.
const entry = (routine, id, gym, sets) => {
  const cfg = routine.ex.find(x => x.id === id)
  return {
    id, sets, target: { ...cfg }, rid: routine.id, hvGym: gym,
    ...(id === PRESS ? { hvBrand: BRAND[gym] } : {}),
    ...(id === ROW ? { hvCable: gym === WEEKEND ? '2:1' : '1:1' } : {}),
  }
}
let n = 0
const session = (routine, d, gym, rows) => {
  const start = Date.parse(d + 'T17:00:00Z')
  n++
  return {
    id: 'w' + n, d, start, end: start + 3600e3, routineIds: [routine.id], routineId: routine.id,
    name: routine.name, bw: null, prs: [], gym: { id: gym, name: gymName[gym] }, _ts: start,
    entries: rows.map(([id, sets]) => entry(routine, id, gym, sets)),
  }
}

export const WORKOUTS = [
  session(PLAIN, '2026-10-27', CITY, [
    [BENCH, [warm(40, 8), work(60, 8), work(60, 8), work(60, 7)]],
    [CALF, [sides(16, 12, 10), sides(16, 12, 10)]],
    [PRESS, [work(160, 10), work(160, 10), work(160, 9)]],
    [ROW, [work(50, 12), work(50, 12), work(50, 11)]],
    [PLANK, [timed(45), timed(40)]],
    [BIKE, [ride(20, 8)]],
  ]),
  session(PROG, '2026-10-29', CITY, [
    [BENCH, [warm(20, 10), warm(30, 5), warm(40, 3), work(70, 5), work(70, 5), work(70, 5)]],
    [SQUAT, [warm(50, 5), warm(75, 3), work(100, 5), work(100, 5), work(100, 5)]],
    [PRESS, [work(160, 12), work(160, 12)]],
  ]),
  session(ARMS, '2026-10-30', CITY, [
    [REAR, [work(8, 12), work(8, 12), work(8, 10)]],
    [ROW, [work(45, 12), work(45, 12)]],
  ]),
  session(PLAIN, '2026-11-01', WEEKEND, [
    [BENCH, [warm(40, 6), work(62.5, 8), work(62.5, 8), work(62.5, 8)]],
    [CALF, [sides(18, 12, 11), sides(18, 11, 10)]],
    [PRESS, [work(120, 10), work(120, 10), work(120, 10)]],
    [ROW, [work(30, 12), work(30, 12), work(30, 12)]],
    [PLANK, [timed(50), timed(45)]],
    [BIKE, [ride(25, 9)]],
  ]),
  session(PROG, '2026-11-05', WEEKEND, [
    [BENCH, [warm(20, 10), warm(35, 5), work(72.5, 5), work(72.5, 5), work(72.5, 5)]],
    [SQUAT, [warm(50, 5), warm(77.5, 3), work(102.5, 5), work(102.5, 5), work(102.5, 5)]],
    [PRESS, [work(125, 12), work(125, 12)]],
  ]),
  session(ARMS, '2026-11-06', WEEKEND, [
    [REAR, [work(9, 12), work(9, 12), work(9, 12)]],
    [ROW, [work(28, 12), work(28, 12)]],
  ]),
  session(PLAIN, '2026-11-08', CITY, [
    [BENCH, [warm(42.5, 8), work(65, 8), work(65, 7), work(65, 6)]],
    [CALF, [sides(20, 12, 9), sides(20, 11, 9)]],
    [PRESS, [work(165, 10), work(165, 10), work(165, 10)]],
    [ROW, [work(52.5, 12), work(52.5, 10), work(52.5, 10)]],
    [PLANK, [timed(60), timed(50)]],
    [BIKE, [ride(30, 8.5)]],
  ]),
]

const cityPlates = { kg: { 25: 2, 20: 2, 15: 2, 10: 2, 5: 2, 2.5: 2, 1.25: 2, _ts: 1 } }
const weekendPlates = { kg: { 20: 1, 10: 1, 5: 1, _ts: 1 } }

/** A fresh copy of the profile, at the city gym, with no workout running. */
export function fixture() {
  return structuredClone({
    _ts: 1, unit: 'kg', restSec: 90, lang: 'en', workoutView: 'cards',
    modules: presetModules('body'),
    progDefault: 'off', startFrom: 'plan', lastFrom: 'routine', warmupAuto: 'compounds',
    equipProfiles: [
      { id: CITY, name: gymName[CITY], equipment: [], plates: cityPlates, _ts: 1 },
      { id: WEEKEND, name: gymName[WEEKEND], equipment: [], plates: weekendPlates, _ts: 1 },
    ],
    activeEquipId: CITY, invGym: CITY, plates: cityPlates,
    hvMachines: { [PRESS]: { [CITY]: BRAND[CITY], [WEEKEND]: BRAND[WEEKEND] } },
    hvCables: { [ROW]: { [WEEKEND]: '2:1' } },
    hvSideOrder: { [CALF]: 'RL' },
    hvOneLimb: 1,
    hvFolders: ['Accessories'],
    routines: ROUTINES,
    workouts: WORKOUTS,
  })
}
