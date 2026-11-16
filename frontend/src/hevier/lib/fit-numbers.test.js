// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { fitNumbers } from './fit-numbers.js'

const field = (clientWidth, widthAt) => {
  const el = document.createElement('input')
  el.className = 'hv-num'
  el.style.fontSize = '20px'
  Object.defineProperty(el, 'clientWidth', { get: () => clientWidth })
  Object.defineProperty(el, 'scrollWidth', { get: () => widthAt(parseFloat(el.style.fontSize || '20')) })
  return el
}

describe('hevier: a number that does not fit its field', () => {
  it('shrinks until it fits, and leaves one that fits alone', () => {
    const root = document.createElement('div')
    const wide = field(72, px => px * 5), ok = field(72, px => px * 2)
    root.append(wide, ok)
    document.body.append(root)
    fitNumbers(root)
    expect(parseFloat(wide.style.fontSize) * 5).toBeLessThanOrEqual(73)
    expect(ok.style.fontSize).toBe('')
    root.remove()
  })
})
