// node --test hevier/tools/*.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { probeTarget } from './routine-snapshot.mjs'
import { openedSnapshot, diffSnapshots } from '../../frontend/src/hevier/lib/routine-open.js'

const warm = (w, extra = {}) => ({ kind: 'warmup', w, r: 5, ...extra })
const work = (w, extra = {}) => ({ kind: 'work', w, r: 8, ...extra })
const sided = { kind: 'work', w: 20, r: 16, sides: { L: { w: 20, r: 8 }, R: { w: 20, r: 8 } } }

test('the probe types into the first work set after an untouched warm-up, counting a per-side set as two rows', () => {
  const opened = { exercises: [
    { id: 'a', sets: [work(60), work(60)] },                      // no warm-up
    { id: 'b', sets: [sided, sided] },                             // four rows on the screen
    { id: 'c', sets: [warm(40, { edited: true }), work(80)] },     // a warm-up made by hand never moves
    { id: 'd', sets: [warm(40), work(80), work(80)] },
  ] }
  assert.deepEqual(probeTarget(opened), { idx: 3, id: 'd', row: 9, weight: 90 })
  assert.equal(probeTarget({ exercises: opened.exercises.slice(0, 3) }), null)
})

test('a brand reads from the session, then from the gym the session is at', () => {
  const S = {
    equipProfiles: [{ id: 'g1' }, { id: 'g2' }], activeEquipId: 'g1',
    hvMachines: { x: { g1: 'Life Fitness', g2: 'Hammer' } },
    active: { name: 'Legs', entries: [{ id: 'x', sets: [{ w: 100, r: 10 }] }] },
  }
  assert.equal(openedSnapshot(S).exercises[0].brand, 'Life Fitness')
  assert.equal(openedSnapshot({ ...S, active: { ...S.active, hvGym: 'g2' } }).exercises[0].brand, 'Hammer')
  assert.equal(openedSnapshot({ ...S, active: { ...S.active, entries: [{ ...S.active.entries[0], hvBrand: '' }] } }).exercises[0].brand, null)
})

test('a diff names the path and both values, and equal snapshots give none', () => {
  const a = { routines: [{ exercises: [{ id: 'x', sets: [warm(40), work(80)] }] }] }
  const b = structuredClone(a)
  assert.deepEqual(diffSnapshots(a, b), [])
  b.routines[0].exercises[0].sets[0].w = 45
  assert.deepEqual(diffSnapshots(a, b), ['routines.0.exercises.0:x.sets.0.w: 40 → 45'])
})
