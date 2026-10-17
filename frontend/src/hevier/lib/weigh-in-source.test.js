import { describe, expect, it, vi } from 'vitest'
import { initWeighInSource, hcOnly, weighInBlocked } from './weigh-in-source.js'

describe('hevier weigh-ins from Health Connect only (D32)', () => {
  it('follows the read switch and blocks the weigh-in sheet only while it is on', async () => {
    let tell
    await initWeighInSource(async () => ({ readWeight: false }), cb => { tell = cb })
    expect(hcOnly()).toBe(false)
    expect(weighInBlocked({})).toBe(false)

    tell({ readWeight: true })
    expect(hcOnly()).toBe(true)
    const say = vi.fn()
    expect(weighInBlocked({}, say)).toBe(true)
    expect(say).toHaveBeenCalledOnce()
    // the check-in before a workout goes on without a weight, and says nothing
    const onDone = vi.fn()
    expect(weighInBlocked({ required: true, onDone }, say)).toBe(true)
    expect(onDone).toHaveBeenCalledWith(null)
    expect(say).toHaveBeenCalledOnce()

    tell({ readWeight: false })
    expect(weighInBlocked({})).toBe(false)
  })
})
