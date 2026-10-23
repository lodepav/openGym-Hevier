// @vitest-environment happy-dom
// D87: the share sheet draws a picture per card, and Save and Share hand out the one in view.
import { describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

const drawn = []
const saved = vi.fn(async () => 'gallery')
const shared = vi.fn(async () => 'shared')
vi.mock('../lib/share-cards-run.js', () => ({
  cardImage: async (card, o) => { drawn.push([card.kind, !!o.photo]); return new Blob([card.kind], { type: 'image/png' }) },
  loadPhoto: async () => ({ width: 10, height: 10 }),
  saveCardImage: (...a) => saved(...a),
  shareCardImage: (...a) => shared(...a),
}))
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { useStore } = await import('../../store/useStore.js')
const { useUI } = await import('../../store/useUI.js')
const { EXDB } = await import('../../lib/exercises.js')
const { shareWorkoutSheet } = await import('./ShareSheet.jsx')

const BENCH = EXDB.find(e => /^barbell bench press$/i.test(e.n)).id
const w = { id: 'w1', name: 'Push', d: '2026-10-20', entries: [{ id: BENCH, sets: [{ w: 80, r: 5, done: true }] }] }

describe('share sheet (D87)', () => {
  it('draws each card on black, redraws over a picked photo, and saves the card in view', async () => {
    useStore.setState(s => ({ S: { ...s.S, unit: 'kg', workouts: [w] } }))
    shareWorkoutSheet(w)
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    await act(async () => { root.render(useUI.getState().sheets.at(-1).render(() => {})) })
    expect(drawn).toEqual([['summary', false], ['exercises', false], ['muscles', false]])
    expect(host.querySelectorAll('.hv-share-card img').length).toBe(3)

    const input = host.querySelector('input[type=file]')
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'p.jpg')] })
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })) })
    await act(async () => {})
    expect(drawn.slice(3)).toEqual([['summary', true], ['exercises', true], ['muscles', true]])

    const [save, share] = host.querySelectorAll('.hv-share-acts button')
    await act(async () => { save.click() })
    expect(saved).toHaveBeenCalledWith(expect.any(Blob), 'go-hevier-2026-10-20-summary.png')
    await act(async () => { share.click() })
    expect(shared).toHaveBeenCalledWith(expect.any(Blob), 'go-hevier-2026-10-20-summary.png', 'Push')
    act(() => root.unmount())
  })
})
