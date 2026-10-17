// @vitest-environment happy-dom
// The workout header's ⏱ starts a countdown when no rest runs (PLAN.md item 26).
import { describe, expect, it, vi } from 'vitest'

const sheet = vi.fn()
const adjust = vi.fn()
const apply = vi.fn()
vi.mock('../../components/DurationWheel.jsx', () => ({ durationSheet: o => sheet(o) }))
vi.mock('../../components/RestTimer.jsx', () => ({ adjustRestSheet: () => adjust(), applyRestLeft: v => apply(v) }))
const { timerSheet } = await import('./TimerButton.js')
const { useUI } = await import('../../store/useUI.js')
const { useStore } = await import('../../store/useStore.js')

describe('hevier workout timer button', () => {
  it('opens a countdown at the Settings rest with no rest running, and starts it on Done', () => {
    useUI.setState({ timer: null })
    useStore.setState(st => ({ S: { ...st.S, restSec: 120 } }))
    timerSheet()
    expect(sheet.mock.calls[0][0]).toMatchObject({ title: 'Timer', value: 120 })
    sheet.mock.calls[0][0].onDone(45)
    expect(apply).toHaveBeenCalledWith(45)
    expect(adjust).not.toHaveBeenCalled()
  })

  it('adjusts the running rest instead', () => {
    useUI.setState({ timer: { left: 30 } })
    timerSheet()
    expect(adjust).toHaveBeenCalled()
    expect(sheet).toHaveBeenCalledTimes(1)
  })
})
