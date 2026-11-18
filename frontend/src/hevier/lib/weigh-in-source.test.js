import { describe, expect, it, vi } from 'vitest'
import { initWeighInSource, hcOnly, weighInBlocked } from './weigh-in-source.js'

const S = {}                                  // the Health module on: a missing key is on
const off = { modules: { health: false } }

describe('hevier weigh-ins from Health Connect only (D32)', () => {
  it('follows the read switch and blocks the weigh-in sheet only while it is on', async () => {
    let tell
    await initWeighInSource(async () => ({ readWeight: false }), cb => { tell = cb })
    expect(hcOnly(S)).toBe(false)
    expect(weighInBlocked(S, {})).toBe(false)

    tell({ readWeight: true })
    expect(hcOnly(S)).toBe(true)
    const say = vi.fn()
    expect(weighInBlocked(S, {}, say)).toBe(true)
    expect(say).toHaveBeenCalledOnce()
    // the check-in before a workout goes on without a weight, and says nothing
    const onDone = vi.fn()
    expect(weighInBlocked(S, { required: true, onDone }, say)).toBe(true)
    expect(onDone).toHaveBeenCalledWith(null)
    expect(say).toHaveBeenCalledOnce()

    tell({ readWeight: false })
    expect(weighInBlocked(S, {})).toBe(false)
  })

  it('the read on but the Health module off: weigh-ins are typed in again', async () => {
    let tell
    await initWeighInSource(async () => ({ readWeight: true }), cb => { tell = cb })
    tell({ readWeight: true })
    expect(hcOnly(off)).toBe(false)
    const say = vi.fn()
    expect(weighInBlocked(off, {}, say)).toBe(false)
    expect(say).not.toHaveBeenCalled()
    expect(weighInBlocked(S, {}, say)).toBe(true)
  })
})
