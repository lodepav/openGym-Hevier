import { describe, it, expect } from 'vitest'
import { goalGap } from './body-goal.js'

describe('goalGap', () => {
  it('is how far is left, to lose or to gain, from the last weigh-in', () => {
    expect(goalGap(77.4, 75)).toEqual({ reached: false, by: 2.4, up: false })
    expect(goalGap(62, 65)).toEqual({ reached: false, by: 3, up: true })
    // Bulked to 85, now cutting to 80: 5 to lose, not reached.
    expect(goalGap(85, 80)).toEqual({ reached: false, by: 5, up: false })
  })
  it('is reached only within 0.05', () => {
    expect(goalGap(75, 75)).toEqual({ reached: true })
    expect(goalGap(75.04, 75)).toEqual({ reached: true })
    expect(goalGap(75.06, 75)).toEqual({ reached: false, by: 0.1, up: false })
  })
  it('is nothing without a goal or a weigh-in', () => {
    expect(goalGap(80, null)).toBeNull()
    expect(goalGap(80, 0)).toBeNull()
    expect(goalGap(undefined, 75)).toBeNull()
  })
})
