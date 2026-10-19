// The exercise picker's gym filter (DECISIONS.md D62): the workout's gym in a workout, the one
// chosen in the picker outside it, and body weight as one of a gym's ticks.
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { EXDB } from '../../lib/exercises.js'
import { gymEquipment, gymHas, gymLacks, rememberedGym, rememberGym, pickerGym, gymSheet } from './gym-filter.js'

const PUSHUP = EXDB.find(e => e.eq === 'body weight' && /^push-up$/i.test(e.n))
const PULLUP = EXDB.find(e => e.eq === 'body weight' && /^pull-up$/i.test(e.n))
const CURL = EXDB.find(e => e.eq === 'dumbbell' && /^dumbbell biceps curl$/i.test(e.n))
const gym = (id, equipment, more = {}) => ({ id, name: id, equipment, accV: 1, ...more })

afterEach(() => localStorage.clear())

describe('hevier: gym filter (D62)', () => {
  it('a gym saved before D62 has body weight; one saved since decides by its ticks', () => {
    expect(gymEquipment(gym('a', ['dumbbell']))).toEqual(['dumbbell', 'body weight'])
    expect(gymEquipment(gym('a', ['dumbbell'], { hvBw: 1 }))).toEqual(['dumbbell'])
    const p = gym('a', [])
    gymSheet(s => s).saved(p)
    expect(p.hvBw).toBe(1)
  })

  it('a gym without body weight hides the body-weight exercises; the bar still gates a pull-up', () => {
    const noBw = gym('a', ['dumbbell', 'pull-up bar'], { hvBw: 1 })
    expect(gymHas(noBw, PUSHUP)).toBe(false)
    expect(gymHas(noBw, PULLUP)).toBe(false)
    expect(gymHas(noBw, CURL)).toBe(true)
    const bw = gym('b', ['body weight'], { hvBw: 1 })
    expect(gymHas(bw, PUSHUP)).toBe(true)
    expect(gymHas(bw, PULLUP)).toBe(false)     // needs the bar too
    expect(gymHas(null, PUSHUP)).toBe(true)    // no gym: everything
  })

  it('opens on the workout’s gym in a workout, else on the gym remembered outside one', () => {
    const S = { equipProfiles: [gym('home', []), gym('city', [])], activeEquipId: 'city', active: null }
    expect(pickerGym(S, '/library')).toBeNull()
    rememberGym('home')
    expect(pickerGym(S, '/library')).toBe('home')
    const live = { ...S, active: { entries: [] } }
    expect(pickerGym(live, '/workout')).toBe('city')
    expect(pickerGym({ ...live, active: { hvGym: '', entries: [] } }, '/workout')).toBeNull()   // No gym
    expect(pickerGym(live, '/plan/r/x')).toBe('home')   // a routine edited while a workout is open
    rememberGym('gone')
    expect(rememberedGym(S)).toBeNull()                 // a deleted gym is no choice
  })

  it('names what a gym lacks for an exercise: its equipment, its bench or bar, body weight (D67)', () => {
    const INCLINE = EXDB.find(e => e.eq === 'dumbbell' && /^dumbbell incline bench press$/i.test(e.n))
    const db = gym('a', ['dumbbell'], { hvBw: 1 })
    expect(gymLacks(db, INCLINE)).toEqual(['bench'])
    expect(gymLacks(db, CURL)).toEqual([])
    expect(gymLacks(db, PULLUP)).toEqual(['body weight', 'pull-up bar'])
    expect(gymLacks(gym('b', []), PUSHUP)).toEqual([])    // saved before D62: has body weight
    expect(gymLacks(null, PULLUP)).toEqual([])
  })
})
