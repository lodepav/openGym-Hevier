import { describe, expect, it, vi } from 'vitest'
import { within } from './within.js'

describe('hevier within', () => {
  it('passes an answer through and gives up on one that never comes', async () => {
    await expect(within(Promise.resolve(3), 50)).resolves.toBe(3)
    vi.useFakeTimers()
    const late = within(new Promise(() => {}), 1000, new Error('slow'))
    vi.advanceTimersByTime(1000)
    await expect(late).rejects.toThrow('slow')
    vi.useRealTimers()
  })
})
