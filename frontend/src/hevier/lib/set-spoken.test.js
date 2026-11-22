import { describe, it, expect } from 'vitest'
import { spokenSet, spoken1rm } from './set-spoken.js'

describe('spokenSet', () => {
  it('says a plain weight and reps set in words', () => {
    expect(spokenSet('80 kg × 8')).toBe('80 kilograms, 8 reps')
    expect(spokenSet('102.5 lb × 1')).toBe('102.5 pounds, 1 rep')
    expect(spokenSet('1 kg × 12')).toBe('1 kilogram, 12 reps')
    expect(spokenSet('+10 kg × 12')).toBe('plus 10 kilograms, 12 reps')
    expect(spokenSet('× 10')).toBe('10 reps')
  })
  it('reads each side of a per-side set, and leaves other sets as written', () => {
    expect(spokenSet('L 20 kg × 10\nR 20 kg × 9')).toBe('L 20 kilograms, 10 reps, R 20 kilograms, 9 reps')
    expect(spokenSet('20 kg × 8 ↘ 15 kg × 6')).toBe('20 kg × 8 ↘ 15 kg × 6')
    expect(spokenSet('20 kg each × 8')).toBe('20 kg each × 8')
    expect(spokenSet('12 reps')).toBe('12 reps')
    expect(spokenSet('80 × 8')).toBe('80 × 8')
  })
})

describe('spoken1rm', () => {
  it('spells out 1RM', () => {
    expect(spoken1rm('Heaviest Weight · Best 1RM')).toBe('Heaviest Weight · Best one rep max')
    expect(spoken1rm('1RM')).toBe('one rep max')
  })
})
