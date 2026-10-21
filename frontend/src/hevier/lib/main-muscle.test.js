import { afterEach, describe, it, expect } from 'vitest'
import { EXIDX, registerCustom } from '../../lib/exercises.js'
import { mainMuscleOf, musclesShown, readChosenMuscles, autoMuscleOf, setMainMuscle } from './main-muscle.js'
import { muscleSets } from './volume.js'

const main = id => mainMuscleOf(EXIDX[id])
const done = n => Array.from({ length: n }, () => ({ w: 50, r: 8, done: true }))

afterEach(() => registerCustom([]))

describe('mainMuscleOf (D74)', () => {
  it('files squats, lunges and leg presses under the quads, not the catalogue’s glutes', () => {
    expect(EXIDX['0739'].tg).toBe('glutes')
    expect(main('0739')).toBe('Quadriceps') // sled 45° leg press
    expect(main('0043')).toBe('Quadriceps') // barbell full squat
    expect(main('0743')).toBe('Quadriceps') // sled hack squat
  })
  it('puts lunges and step-ups on the glutes, split squats on the quads', () => {
    const named = re => Object.values(EXIDX).find(e => e.tg === 'glutes' && re.test(e.n))
    expect(mainMuscleOf(named(/^barbell lunge$/))).toBe('Glutes')
    expect(mainMuscleOf(named(/^dumbbell step-up$/))).toBe('Glutes')
    expect(main('0410')).toBe('Quadriceps') // dumbbell single leg split squat
  })
  it('puts shrugs on the traps, a Kelso, horizontal, hanging or dip shrug on the upper back', () => {
    const named = re => Object.values(EXIDX).find(e => re.test(e.n))
    expect(mainMuscleOf(named(/^dumbbell shrug$/))).toBe('Traps')
    expect(mainMuscleOf(named(/^hanging scapular shrug$/))).toBe('Upper Back')
    expect(mainMuscleOf(named(/^shrug \(on parallel bars\)$/))).toBe('Upper Back')
    expect(mainMuscleOf(named(/scapular retraction shrug/))).toBe('Upper Back')
    registerCustom([{ id: 'k1', n: 'Kelso Shrug (Machine)', custom: true, tg: '' }])
    expect(main('k1')).toBe('Upper Back')
  })
  it('keeps hip thrusts on the glutes and puts hinges on the hamstrings', () => {
    expect(main('2146')).toBe('Glutes') // lever hip thrust
    expect(main('0085')).toBe('Hamstrings') // barbell romanian deadlift
    expect(main('0032')).toBe('Glutes') // barbell deadlift
  })
  it('puts high rows and pulldowns on the lats and other rows on the upper back', () => {
    expect(main('0581')).toBe('Lats') // lever high row
    expect(main('0150')).toBe('Lats') // cable bar lateral pulldown
    expect(main('1350')).toBe('Upper Back') // lever seated row
    expect(main('7564')).toBe('Upper Back') // cable split stance single arm row (catalogue: lats)
  })
  it('names the shoulder head when the name says it, else Shoulders', () => {
    expect(main('0584')).toBe('Side Delts') // lever lateral raise
    expect(main('0602')).toBe('Rear Delts') // lever seated reverse fly
    expect(main('1454')).toBe('Front Delts') // lever seated shoulder press
  })
  it('gives twists and side planks to the obliques', () => {
    const twist = Object.values(EXIDX).find(e => e.tg === 'abs' && /russian twist/.test(e.n))
    expect(mainMuscleOf(twist)).toBe('Obliques')
  })
  it('files what the review found under another muscle (2026-10-21)', () => {
    expect(main('0459')).toBe('Abdominals') // flutter kicks, catalogue glutes
    expect(main('0642')).toBe('Chest') // outside leg kick push-up
    expect(main('2133')).toBe('Forearms') // farmers walk, catalogue quads
    expect(main('2910')).toBe('Obliques') // dumbbell suitcase carry
    expect(main('8191')).toBe('Hip Flexors') // cable standing hip flexion
    expect(main('5155')).toBe('Glutes') // lateral step up with knee drive stays a step-up
    expect(main('9803')).toBe('Shins') // standing tibialis raise
    expect(main('4467')).toBe('Calves') // roll ball tibialis posterior: a calf muscle
    expect(main('6705')).toBe('Obliques') // supine windshield wipers
    expect(main('0352')).toBe('Chest') // dumbbell neutral grip bench press
    expect(main('0471')).toBe('Front Delts') // handstand push-up, catalogue triceps
    expect(main('2142')).toBe('Cardio') // ski ergometer
    expect(main('1130')).toBe('Rear Delts') // suspender reverse fly
    expect(main('2779')).toBe('Shoulders') // shoulder lateral rotation: rotator cuff, no head
  })
  it('reads a custom exercise’s own primary muscle, or the catalogue exercise its name finds', () => {
    registerCustom([
      { id: 'c1', n: 'My press', custom: true, tg: '', primaries: ['quadriceps'] },
      { id: 'c2', n: 'Leg Press (Machine) (Hammer)', custom: true, tg: '' },
      { id: 'c3', n: 'Zzz thing', custom: true, tg: '' },
    ])
    expect(main('c1')).toBe('Quadriceps')
    expect(main('c2')).toBe('Quadriceps')
    expect(main('c3')).toBe('')
  })
})

describe('muscleSets counts by the main muscle', () => {
  it('counts a leg press and a custom exercise’s sets for their muscles', () => {
    registerCustom([{ id: 'c1', n: 'Belt thing', custom: true, tg: '', primaries: ['quadriceps'] }])
    const rows = muscleSets([{ id: '0739', sets: done(3) }, { id: 'c1', sets: done(2) }])
    expect(rows).toEqual([{ muscle: 'Quadriceps', sets: 5 }])
  })
  it('reads a deleted custom exercise from the muscles its entry kept', () => {
    const rows = muscleSets([{ id: 'gone', muscleSnapshot: { n: 'x', primaries: ['biceps'] }, sets: done(2) }])
    expect(rows).toEqual([{ muscle: 'Biceps', sets: 2 }])
  })
})

describe('musclesShown', () => {
  it('lists the main muscle, then the other main ones and helpers, not the one weighed at 0', () => {
    const { primary, secondary } = musclesShown(EXIDX['0739'])
    expect(primary).toBe('Quadriceps')
    expect(secondary).toEqual(['Glutes', 'Adductors', 'Hamstrings'])
  })
  it('does not repeat Shoulders under a head', () => {
    expect(musclesShown(EXIDX['0584']).secondary).not.toContain('Shoulders')
  })
})

describe('the main muscle the user chose (D76)', () => {
  afterEach(() => readChosenMuscles(null))
  it('wins over the fork’s, in the counts too, and Automatic gives the fork’s back', () => {
    const s = {}
    setMainMuscle(s, '0739', 'Glutes')
    readChosenMuscles(id => s.hvMainMuscle?.[id] || null)
    expect(main('0739')).toBe('Glutes')
    expect(autoMuscleOf(EXIDX['0739'])).toBe('Quadriceps')
    expect(muscleSets([{ id: '0739', sets: done(2) }])).toEqual([{ muscle: 'Glutes', sets: 2 }])
    setMainMuscle(s, '0739', null)
    expect(s.hvMainMuscle).toEqual({})
    expect(main('0739')).toBe('Quadriceps')
  })
})
