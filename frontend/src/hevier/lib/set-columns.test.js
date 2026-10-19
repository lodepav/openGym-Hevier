import { describe, expect, it } from 'vitest'
import { setColumns, viewOf } from './set-columns.js'

const fields = cols => cols.map(c => c.f)

describe('hevier: the workout table’s columns', () => {
  it('follows the exercise’s mode', () => {
    expect(fields(setColumns({ mode: 'reps', unit: 'kg' }))).toEqual(['w', 'r'])
    expect(fields(setColumns({ mode: 'time', unit: 'kg' }))).toEqual(['w', 'sec'])
    expect(fields(setColumns({ mode: 'cardio', unit: 'kg', speedUnit: 'kmh' }))).toEqual(['min', 'speed'])
    expect(fields(setColumns({ mode: 'cardio', unit: 'kg', speedUnit: 'kmh', sets: [{ incline: 2 }] }))).toEqual(['min', 'speed', 'incline'])
  })

  it('heads the weight with the exercise’s own unit, body weight’s + and two stacks’ ×2', () => {
    expect(setColumns({ mode: 'reps', unit: 'kg' })[0].hd).toBe('KG')
    expect(setColumns({ mode: 'reps', unit: 'kg', bw: true })[0].hd).toBe('+KG')
    expect(setColumns({ mode: 'reps', unit: 'kg', perStack: true })[0].hd).toBe('KG ×2')
    const lb = setColumns({ mode: 'reps', unit: 'kg', exUnit: 'lb' })[0]
    expect(lb.hd).toBe('LB')
    expect(viewOf(lb, 20.41165665)).toBe(45)
    expect(lb.store(45)).toBeCloseTo(20.4117, 4)
    expect(setColumns({ mode: 'reps', unit: 'kg' })[0].view).toBeUndefined()
  })

  it('shows cardio’s speed in the profile’s unit, stored in km/h', () => {
    const speed = setColumns({ mode: 'cardio', unit: 'lb', speedUnit: 'mph' })[1]
    expect(speed.hd).toBe('MPH')
    expect(viewOf(speed, '')).toBe('')
    expect(speed.store(viewOf(speed, 10))).toBeCloseTo(10, 1)   // mph is shown rounded
  })
})
