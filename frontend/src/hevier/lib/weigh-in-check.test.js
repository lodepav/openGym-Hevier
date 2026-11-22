import { describe, it, expect } from 'vitest'
import { weighInOff, weighInAsk } from './weigh-in-check.js'

describe('weighInOff', () => {
  it('flags a weigh-in more than 15 % off the last, either way', () => {
    expect(weighInOff(82.6, 70)).toBeCloseTo(0.18, 2)
    expect(weighInOff(805, 80.5)).toBeCloseTo(9, 5)
    expect(weighInOff(59, 70)).toBeCloseTo(0.157, 2)
  })
  it('leaves a normal change, and a first weigh-in, alone', () => {
    expect(weighInOff(80, 70)).toBeNull()   // 14 %
    expect(weighInOff(70, 70)).toBeNull()
    expect(weighInOff(70, undefined)).toBeNull()
    expect(weighInOff(70, 0)).toBeNull()
  })
})

describe('weighInAsk', () => {
  const save = () => {}
  it('asks in the profile unit, Fix it first and Save saving as typed', () => {
    const o = weighInAsk(82.6, 70, 'kg', save, true)
    expect(o.title).toBe('Is that right?')
    expect(o.message).toBe('82.6 kg is 18% off your last weigh-in, 70 kg. Save it?')
    expect(o.confirmText).toBe('Fix it')
    expect(o.cancelText).toBe('Save')
    expect(o.onCancel).toBe(save)
    expect(o.onConfirm).toBeUndefined()
    expect(weighInAsk(200, 160, 'lb', save, true).message).toBe('200 lb is 25% off your last weigh-in, 160 lb. Save it?')
  })
  it('says nothing when it looks right, or in upstream’s build', () => {
    expect(weighInAsk(72, 70, 'kg', save, true)).toBeNull()
    expect(weighInAsk(805, 80.5, 'kg', save, false)).toBeNull()
  })
})
