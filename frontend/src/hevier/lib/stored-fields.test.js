// @vitest-environment happy-dom
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { STORED_FIELDS, NOT_STORED, LEGACY } from './stored-fields.js'
import { mergeStates, stampChange, stampWorkout } from '../../lib/sync-merge.js'
import { readBackupFile } from '../../lib/backup-media.js'
import { useStore } from '../../store/useStore.js'

const base = {
  _ts: 1, unit: 'kg', restSec: 90,
  equipProfiles: [{ id: 'g1', name: 'City Gym', equipment: [], _ts: 1 }],
  workouts: [{ id: 'w1', d: '2026-10-17', start: 1760716800000, end: 1760720400000, name: 'Legs', _ts: 1,
    entries: [{ id: '0043', sets: [{ w: 100, r: 5, done: true }] }] }],
  routines: [{ id: 'r1', name: 'Leg Day', ex: [{ id: '0043', sets: 3, reps: 5 }], _ts: 1 }],
}
// Where each field lives, and the change another device makes to the same thing meanwhile.
const AT = {
  S: { of: s => s, other: s => { s.restSec = 75 } },
  gym: { of: s => s.equipProfiles[0], other: s => { s.equipProfiles[0].name = 'Town Gym' } },
  workout: { of: s => s.workouts[0], other: s => { s.workouts[0].name = 'Leg day' } },
  entry: { of: s => s.workouts[0].entries[0], other: s => { s.workouts[0].name = 'Leg day' } },
  set: { of: s => s.workouts[0].entries[0].sets[0], other: s => { s.workouts[0].name = 'Leg day' } },
  routine: { of: s => s.routines[0], other: s => { s.routines[0].name = 'Legs A' } },
}
// A save as the store makes it: a changed workout stamped by its editor (stampWorkout), the rest
// by the store's stampChange.
const edit = (prev, fn, wall) => {
  const next = structuredClone(prev)
  fn(next)
  if (JSON.stringify(next.workouts[0]) !== JSON.stringify(prev.workouts[0])) stampWorkout(next.workouts[0], wall)
  next._ts = stampChange(prev, next, wall)
  return next
}

describe('hevier: the fork’s stored fields', () => {
  it.each(STORED_FIELDS)('$field ($at) survives a sync with a later change on another device', ({ field, at, sample }) => {
    const phone = edit(base, s => { AT[at].of(s)[field] = structuredClone(sample) }, 100)
    const laptop = edit(base, AT[at].other, 200)
    expect(AT[at].of(mergeStates(phone, laptop))[field]).toEqual(sample)
    expect(AT[at].of(mergeStates(laptop, phone))[field]).toEqual(sample)
  })

  // The JSON backup is the state as it is (views/Settings.jsx doExport); the import reads it back
  // through readBackupFile and lays it over the defaults (useStore importBackup).
  it.each(STORED_FIELDS)('$field ($at) comes back from a backup', async ({ field, at, sample }) => {
    const S = structuredClone(base)
    AT[at].of(S)[field] = structuredClone(sample)
    const { state } = await readBackupFile(new Blob([JSON.stringify(S, null, 2)]))
    useStore.getState().importBackup(state)
    expect(AT[at].of(useStore.getState().S)[field]).toEqual(sample)
  })

  it('lists every hv field the fork’s code writes or reads', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..')
    const files = []
    const walk = dir => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) { if (name !== 'blends') walk(p) } else if (/\.(js|jsx)$/.test(name) && !/\.test\.(js|jsx)$/.test(name)) files.push(p)
      }
    }
    walk(root)
    const seen = new Set(files.flatMap(f => readFileSync(f, 'utf8').match(/\bhv[A-Z]\w*/g) || []))
    const known = new Set([...STORED_FIELDS.map(f => f.field), ...NOT_STORED, ...LEGACY])
    expect(files.length).toBeGreaterThan(100)
    expect([...seen].filter(f => !known.has(f)).sort()).toEqual([])
  })
})
