// Send to Hevy's part in Modules (hevier/DECISIONS.md D114): while it is off, nothing is read or sent.
import { describe, expect, it, vi } from 'vitest'

const readJsonFile = vi.fn(async () => null)
vi.mock('../../lib/mobile.js', async orig => ({ ...(await orig()), MOBILE: true, readJsonFile: (...a) => readJsonFile(...a), writeJsonFile: async () => {} }))
const { sendToHevy } = await import('./hevy-export-sync.js')

describe('Send to Hevy paused by its part (D114)', () => {
  it('does not start a pass while the part is off, and does once it is on', async () => {
    await sendToHevy(() => ({ hvModuleParts: { 'integrations.hevy': false } }), { force: true })
    expect(readJsonFile).not.toHaveBeenCalled()
    await sendToHevy(() => ({ hvModuleParts: {} }), { force: true })
    expect(readJsonFile).toHaveBeenCalled()
  })
})
