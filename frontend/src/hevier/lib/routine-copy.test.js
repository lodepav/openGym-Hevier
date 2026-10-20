import { describe, it, expect } from 'vitest'
import { copyRoutineHere } from './routine-copy.js'
import { pending } from './hevy-export.js'

describe('copyRoutineHere', () => {
  it('drops the Hevy links, keeps the folder and the exercises', () => {
    const r = { id: 'a', name: 'Push', folder: 'PPL', hevyId: 'h1', hvHevyFolder: 'PPL', ex: [{ id: '0025', sets: 3 }] }
    const c = copyRoutineHere(r, 'Copy')
    expect(c).toMatchObject({ name: 'Push (Copy)', folder: 'PPL', ex: [{ id: '0025', sets: 3 }] })
    expect(c.id).not.toBe('a')
    expect('hevyId' in c).toBe(false)
    expect('hvHevyFolder' in c).toBe(false)
    expect(r.hevyId).toBe('h1')
  })

  it('goes to Hevy as a new routine, not as an update of the original', () => {
    const r = { id: 'a', name: 'Push', hevyId: 'h1', ex: [{ id: '0025', sets: 3, reps: 8, weight: 60 }] }
    const c = copyRoutineHere(r, 'Copy')
    const S = { unit: 'kg', routines: [r, c], workouts: [] }
    const st = { base: { workouts: [], routines: {} }, out: { r: {} } }
    const p = pending(S, st).routines
    expect(p.find(x => x.id === c.id).hevyId).toBe(null)
  })
})
