// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { useUI } from '../../store/useUI.js'
import { initSheetToast } from './sheet-toast-run.js'

vi.mock('../../lib/sound.js', () => ({ beep: vi.fn(), chime: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../../lib/api.js', () => ({ api: vi.fn(() => Promise.resolve({})), beacon: vi.fn(), appBase: () => '/' }))

describe('hevier: a sheet takes the page’s toast with it', () => {
  initSheetToast()
  const ui = () => useUI.getState()

  it('dismisses an Undo toast when a sheet opens', () => {
    ui().toast('Set 2 gone.', { action: 'Undo', onAction: () => {} })
    const { close } = ui().openSheet(() => null)
    expect(ui().toastMsg).toBe('')
    expect(ui().toastAction).toBeNull()
    close()
  })

  it('keeps a toast raised while the sheet is open, also when the sheet closes', () => {
    const { close } = ui().openSheet(() => null)
    ui().toast('Check the duration')
    expect(ui().toastMsg).toBe('Check the duration')
    close()
    expect(ui().toastMsg).toBe('Check the duration')
    ui().dismissToast()
  })
})
