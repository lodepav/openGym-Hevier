// @vitest-environment happy-dom
// Seam S71 (lib/media-motion.js): in the fork's build the animation's hint is a named button, and
// Reduce Motion opens it on its still.
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Media from '../../components/Media.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../store/useStore.js', () => {
  const snap = () => ({ S: { gifSize: 'full' }, update: () => {} })
  const useStore = selector => selector(snap())
  useStore.getState = snap
  return { useStore }
})

const EX = { id: 'bench', n: 'bench press', gif: 'bench.gif', img: 'bench.jpg' }
let host, root, reduce
beforeEach(() => {
  reduce = false
  vi.spyOn(window, 'matchMedia').mockImplementation(q => ({ matches: reduce && q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks() })
const mount = () => act(() => root.render(<Media ex={EX} />))
const hint = () => host.querySelector('.gifhint')

describe('exercise media in the fork (S71)', () => {
  it('names the tap area for what it does, and Enter toggles it', () => {
    mount()
    expect(hint().getAttribute('role')).toBe('button')
    expect(hint().getAttribute('aria-label')).toBe('Pause animation')
    expect(host.querySelector('img').getAttribute('src')).toContain('bench.gif')
    act(() => hint().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    expect(hint().getAttribute('aria-label')).toBe('Play animation')
    expect(host.querySelector('img').getAttribute('src')).not.toContain('bench.gif')
  })

  it('starts on the still under Reduce Motion, and a tap plays it', () => {
    reduce = true
    mount()
    expect(hint().getAttribute('aria-label')).toBe('Play animation')
    expect(host.querySelector('img').getAttribute('src')).not.toContain('bench.gif')
    act(() => hint().click())
    expect(hint().getAttribute('aria-label')).toBe('Pause animation')
  })
})
